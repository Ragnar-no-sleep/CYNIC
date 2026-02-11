import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const db = new Database(join(homedir(), '.cynic', 'x-local.db'));
const EMPTY = `[]`;

// Hashtags
console.log('=== HASHTAGS ===');
const tags = {};
for (const r of db.prepare(`SELECT hashtags FROM x_tweets WHERE hashtags != ?`).all(EMPTY)) {
  try { JSON.parse(r.hashtags).forEach(h => { tags[h] = (tags[h]||0) + 1; }); } catch(e) {}
}
Object.entries(tags).sort((a,b) => b[1]-a[1]).slice(0,20).forEach(([t,c]) => console.log(c, '#'+t));

// User bio keywords
console.log('\n=== WHO IS IN YOUR FEED (bio keywords) ===');
const bio = {};
const stop = new Set(['the','this','that','with','from','have','been','will','just','like','more','they','their','them','what','when','your','about','would','could','which','there','these','than','into','some','only','even','also','back','after','over','other','know','want','think','make','people','going','every','very','much','most','does','dont','here','were','come','still']);
for (const r of db.prepare(`SELECT bio FROM x_users WHERE bio IS NOT NULL AND length(bio) > 0`).all()) {
  r.bio.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w)).forEach(w => { bio[w] = (bio[w]||0) + 1; });
}
Object.entries(bio).sort((a,b) => b[1]-a[1]).slice(0,30).forEach(([w,c]) => console.log(c, w));

// ASDFASDFA tweets
console.log('\n=== ASDFASDFA552 TWEETS ===');
for (const r of db.prepare(`SELECT substr(t.text,1,120) as text, t.like_count, t.view_count FROM x_tweets t JOIN x_users u ON t.x_user_id = u.x_user_id WHERE u.username = 'ASDFASDFA552' ORDER BY t.like_count DESC`).all()) {
  console.log(JSON.stringify(r));
}

// Mentions frequency
console.log('\n=== MOST MENTIONED USERS ===');
const mentions = {};
for (const r of db.prepare(`SELECT mentions FROM x_tweets WHERE mentions != ?`).all(EMPTY)) {
  try { JSON.parse(r.mentions).forEach(m => { mentions[m] = (mentions[m]||0) + 1; }); } catch(e) {}
}
Object.entries(mentions).sort((a,b) => b[1]-a[1]).slice(0,25).forEach(([m,c]) => console.log(c, '@'+m));

// Pill emoji users (community marker)
console.log('\n=== PILL USERS (community) ===');
for (const r of db.prepare(`SELECT username, display_name FROM x_users WHERE display_name LIKE '%💊%' ORDER BY username`).all()) {
  console.log(r.username, '-', r.display_name);
}

// Verified ratio
console.log('\n=== VERIFIED RATIO ===');
for (const r of db.prepare('SELECT verified, COUNT(*) as c FROM x_users GROUP BY verified').all()) {
  console.log(JSON.stringify(r));
}

db.close();
