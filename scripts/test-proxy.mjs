#!/usr/bin/env node
/**
 * Standalone diagnostic X proxy
 * Logs everything to console to debug capture pipeline
 */
import Proxy from '@bjowes/http-mitm-proxy';
import zlib from 'zlib';
import { homedir } from 'os';
import { join } from 'path';
// Dynamic import for LocalXStore (CJS)
const { default: Database } = await import('better-sqlite3');

const PORT = 8892;
const CA_DIR = join(homedir(), '.cynic', 'x-proxy-certs');
const DB_PATH = join(homedir(), '.cynic', 'x-local.db');

const X_DOMAINS = new Set([
  'x.com', 'twitter.com', 'api.x.com', 'api.twitter.com',
  'mobile.twitter.com', 'mobile.x.com',
]);

const CAPTURE_PATHS = ['/i/api/graphql/', '/i/api/2/', '/1.1/'];

function isXDomain(hostname) {
  if (X_DOMAINS.has(hostname)) return true;
  for (const d of X_DOMAINS) {
    if (hostname.endsWith('.' + d)) return true;
  }
  return false;
}

function gunzip(buf) {
  return new Promise((res, rej) => zlib.gunzip(buf, (e, r) => e ? rej(e) : res(r)));
}
function brotli(buf) {
  return new Promise((res, rej) => zlib.brotliDecompress(buf, (e, r) => e ? rej(e) : res(r)));
}
function inflate(buf) {
  return new Promise((res, rej) => zlib.inflate(buf, (e, r) => e ? rej(e) : res(r)));
}

// Simple LocalXStore direct access
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log(`[DB] Opened ${DB_PATH}`);
} catch (e) {
  console.error(`[DB] Failed to open: ${e.message}`);
  process.exit(1);
}

const proxy = Proxy();
let stats = { total: 0, xDomain: 0, captured: 0, parsed: 0, stored: 0, errors: 0 };

proxy.onError((ctx, err) => {
  stats.errors++;
  console.error(`[ERROR] ${err.message} (host: ${ctx?.clientToProxyRequest?.headers?.host || '?'})`);
});

proxy.onRequest((ctx, callback) => {
  stats.total++;
  const host = ctx.clientToProxyRequest.headers.host || '';
  const hostname = host.split(':')[0];
  const path = ctx.clientToProxyRequest.url;

  if (!isXDomain(hostname)) {
    return callback();
  }

  stats.xDomain++;
  const shouldCapture = CAPTURE_PATHS.some(p => path.includes(p));
  console.log(`[REQ] ${hostname}${path.slice(0, 80)} ${shouldCapture ? '>>> CAPTURE' : '(pass)'}`);

  if (!shouldCapture) {
    return callback();
  }

  stats.captured++;
  const chunks = [];

  ctx.onResponse((ctx, callback) => {
    const enc = ctx.serverToProxyResponse?.headers?.['content-encoding'] || 'none';
    const ct = ctx.serverToProxyResponse?.headers?.['content-type'] || 'unknown';
    const status = ctx.serverToProxyResponse?.statusCode;
    console.log(`  [RES] status=${status} encoding=${enc} type=${ct.slice(0, 50)}`);
    callback();
  });

  ctx.onResponseData((ctx, chunk, callback) => {
    chunks.push(chunk);
    callback(null, chunk);
  });

  ctx.onResponseEnd(async (ctx, callback) => {
    try {
      let body = Buffer.concat(chunks);
      console.log(`  [DATA] ${chunks.length} chunks, ${body.length} bytes`);

      const encoding = ctx.serverToProxyResponse?.headers?.['content-encoding'];
      if (encoding === 'gzip') body = await gunzip(body);
      else if (encoding === 'br') body = await brotli(body);
      else if (encoding === 'deflate') body = await inflate(body);

      const ct = ctx.serverToProxyResponse?.headers?.['content-type'] || '';
      if (!ct.includes('json')) {
        console.log(`  [SKIP] Not JSON: ${ct.slice(0, 50)}`);
        return callback();
      }

      const data = JSON.parse(body.toString('utf8'));
      stats.parsed++;
      console.log(`  [JSON] Parsed OK, keys: ${Object.keys(data).join(', ').slice(0, 100)}`);

      // Try to extract tweets manually (simplified)
      const tweets = [];
      const users = [];
      extractFromData(data, tweets, users);
      console.log(`  [EXTRACT] tweets=${tweets.length} users=${users.length}`);

      // Store in DB
      for (const u of users) {
        try {
          db.prepare(`INSERT OR REPLACE INTO x_users (x_user_id, username, display_name, updated_at)
            VALUES (?, ?, ?, datetime('now'))`).run(u.id, u.username, u.name);
          stats.stored++;
        } catch (e) { /* ignore dupes */ }
      }
      for (const t of tweets) {
        try {
          db.prepare(`INSERT OR IGNORE INTO x_tweets (tweet_id, x_user_id, text, created_at)
            VALUES (?, ?, ?, ?)`).run(t.id, t.userId, t.text, t.createdAt || new Date().toISOString());
          stats.stored++;
        } catch (e) {
          console.error(`  [INSERT-ERR] tweet=${t.id} userId=${t.userId?.slice(0,20)} text=${!!t.text} err=${e.message}`);
        }
      }

      if (tweets.length > 0) {
        console.log(`  [STORED] ${tweets.length} tweets! Sample: "${tweets[0].text?.slice(0, 80)}"`);
      }
    } catch (err) {
      console.error(`  [ERR] ${err.message}`);
    }
    callback();
  });

  callback();
});

function extractFromData(obj, tweets, users, depth = 0) {
  if (!obj || depth > 10) return;
  if (typeof obj !== 'object') return;

  // Check for tweet-like objects
  if (obj.rest_id && obj.legacy?.full_text) {
    tweets.push({
      id: obj.rest_id,
      userId: obj.legacy?.user_id_str || obj.core?.user_results?.result?.rest_id || '',
      text: obj.legacy.full_text,
      createdAt: obj.legacy.created_at,
    });

  }
  // Also check tweet_results pattern
  if (obj.tweet_results?.result?.legacy?.full_text) {
    const r = obj.tweet_results.result;
    tweets.push({
      id: r.rest_id,
      userId: r.legacy?.user_id_str || r.core?.user_results?.result?.rest_id || '',
      text: r.legacy.full_text,
      createdAt: r.legacy.created_at,
    });
  }
  // Check for user-like objects
  if (obj.rest_id && obj.legacy?.screen_name && !obj.legacy?.full_text) {
    users.push({
      id: obj.rest_id,
      username: obj.legacy.screen_name,
      name: obj.legacy.name || obj.legacy.screen_name,
    });
  }

  // Recurse
  if (Array.isArray(obj)) {
    for (const item of obj) extractFromData(item, tweets, users, depth + 1);
  } else {
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null) {
        extractFromData(val, tweets, users, depth + 1);
      }
    }
  }
}

proxy.listen({ port: PORT, host: '0.0.0.0', sslCaDir: CA_DIR, keepAlive: true }, (err) => {
  if (err) { console.error('Failed to start:', err); process.exit(1); }
  console.log(`\n=== CYNIC X Proxy Diagnostic ===`);
  console.log(`Port: ${PORT} (0.0.0.0)`);
  console.log(`CA: ${CA_DIR}`);
  console.log(`DB: ${DB_PATH}`);
  console.log(`Waiting for traffic...\n`);
});

// Print stats every 10s
setInterval(() => {
  if (stats.total > 0) {
    console.log(`\n[STATS] total=${stats.total} xDomain=${stats.xDomain} captured=${stats.captured} parsed=${stats.parsed} stored=${stats.stored} errors=${stats.errors}\n`);
  }
}, 10000);
