/**
 * Observatory Dashboard Server
 *
 * Web server for real-time CYNIC observability.
 * "Observer pour comprendre, comprendre pour améliorer"
 *
 * @module @cynic/observatory/dashboard/server
 */

'use strict';

import http from 'http';
import { URL } from 'url';
import { getPool } from '@cynic/persistence';
import { PHI_INV } from '@cynic/core';

import { QLearningQueries } from '../queries/qlearning.js';
import { PatternsQueries } from '../queries/patterns.js';
import { TelemetryQueries } from '../queries/telemetry.js';
import { LearningProofQueries } from '../queries/learning-proof.js';

// ═══════════════════════════════════════════════════════════════════════════
// CORS & RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data, null, 2));
}

function errorResponse(res, message, status = 500) {
  jsonResponse(res, { error: message, timestamp: new Date().toISOString() }, status);
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD HTML
// ═══════════════════════════════════════════════════════════════════════════

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYNIC Observatory</title>
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-dim: #8b949e;
      --green: #3fb950;
      --yellow: #d29922;
      --red: #f85149;
      --blue: #58a6ff;
      --phi: 0.618;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .header h1 { font-size: 1.5rem; }
    .header .status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
    .status.healthy { background: var(--green); color: #000; }
    .status.degraded { background: var(--yellow); color: #000; }
    .status.critical { background: var(--red); color: #fff; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }
    .card h2 {
      font-size: 1rem;
      color: var(--text-dim);
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }
    .metric:last-child { border-bottom: none; }
    .metric .label { color: var(--text-dim); }
    .metric .value { font-weight: 600; font-family: monospace; }
    .metric .value.good { color: var(--green); }
    .metric .value.warn { color: var(--yellow); }
    .metric .value.bad { color: var(--red); }
    .proof-card { grid-column: span 2; }
    .proof-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px;
      background: var(--bg);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .proof-score {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.1rem;
    }
    .score-good { background: var(--green); color: #000; }
    .score-warn { background: var(--yellow); color: #000; }
    .score-bad { background: var(--red); color: #fff; }
    .score-none { background: var(--border); color: var(--text-dim); }
    .proof-details { flex: 1; }
    .proof-name { font-weight: 600; }
    .proof-interp { font-size: 0.85rem; color: var(--text-dim); }
    .verdict-banner {
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .verdict-banner.learning { background: rgba(63, 185, 80, 0.2); border: 2px solid var(--green); }
    .verdict-banner.stable { background: rgba(210, 153, 34, 0.2); border: 2px solid var(--yellow); }
    .verdict-banner.not_learning { background: rgba(248, 81, 73, 0.2); border: 2px solid var(--red); }
    .verdict-banner h3 { font-size: 1.3rem; margin-bottom: 8px; }
    .refresh-time { color: var(--text-dim); font-size: 0.8rem; margin-top: 20px; text-align: center; }
    .loading { text-align: center; padding: 40px; color: var(--text-dim); }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐕 CYNIC Observatory</h1>
    <span id="status" class="status">Loading...</span>
  </div>

  <div id="content" class="loading">Loading observatory data...</div>

  <div id="refresh-time" class="refresh-time"></div>

  <script>
    const PHI_INV = 0.618;
    const PHI_INV_2 = 0.382;

    function scoreClass(score) {
      if (score === null) return 'score-none';
      if (score >= PHI_INV) return 'score-good';
      if (score >= PHI_INV_2) return 'score-warn';
      return 'score-bad';
    }

    function valueClass(value, goodThreshold, warnThreshold) {
      if (value >= goodThreshold) return 'good';
      if (value >= warnThreshold) return 'warn';
      return 'bad';
    }

    async function fetchData() {
      try {
        const [health, proof, qstats, patterns] = await Promise.all([
          fetch('/api/telemetry/health').then(r => r.json()),
          fetch('/api/learning/proof').then(r => r.json()),
          fetch('/api/qlearning/stats').then(r => r.json()),
          fetch('/api/patterns/important').then(r => r.json()),
        ]);

        renderDashboard({ health, proof, qstats, patterns });
      } catch (e) {
        document.getElementById('content').innerHTML = '<div class="loading">Error: ' + e.message + '</div>';
      }
    }

    function renderDashboard({ health, proof, qstats, patterns }) {
      // Status
      document.getElementById('status').textContent = health.status?.toUpperCase() || 'UNKNOWN';
      document.getElementById('status').className = 'status ' + (health.status || 'degraded');

      // Main content
      const verdictClass = proof.verdict || 'unknown';
      const html = \`
        <div class="verdict-banner \${verdictClass}">
          <h3>\${proof.interpretation || 'Loading...'}</h3>
          <div>Overall Score: \${proof.overallScore !== null ? (proof.overallScore * 100).toFixed(1) + '%' : 'N/A'}</div>
        </div>

        <div class="grid">
          <!-- Health Card -->
          <div class="card">
            <h2>📊 System Health</h2>
            <div class="metric">
              <span class="label">Success Rate</span>
              <span class="value \${valueClass(health.successRate, PHI_INV, PHI_INV_2)}">\${(health.successRate * 100).toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="label">Tool Calls (1h)</span>
              <span class="value">\${health.toolCalls || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Avg Latency</span>
              <span class="value">\${(health.avgLatencyMs || 0).toFixed(0)}ms</span>
            </div>
            <div class="metric">
              <span class="label">Frictions (1h)</span>
              <span class="value \${health.frictionCount > 10 ? 'bad' : health.frictionCount > 5 ? 'warn' : 'good'}">\${health.frictionCount || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Active Sessions</span>
              <span class="value">\${health.activeSessions || 0}</span>
            </div>
          </div>

          <!-- Q-Learning Card -->
          <div class="card">
            <h2>🧠 Q-Learning State</h2>
            \${qstats.services?.length > 0 ? qstats.services.map(s => \`
              <div class="metric">
                <span class="label">\${s.service_id}</span>
                <span class="value">\${s.total_episodes || 0} episodes</span>
              </div>
              <div class="metric">
                <span class="label">Exploration Rate</span>
                <span class="value \${valueClass(1 - s.exploration_rate, 0.7, 0.3)}">\${(s.exploration_rate * 100).toFixed(1)}%</span>
              </div>
              <div class="metric">
                <span class="label">Q-Table Entries</span>
                <span class="value">\${s.entry_count || 0}</span>
              </div>
            \`).join('') : '<div class="metric"><span class="label">No Q-Learning data yet</span></div>'}
          </div>

          <!-- Patterns Card -->
          <div class="card">
            <h2>🔍 Pattern Memory (EWC++)</h2>
            <div class="metric">
              <span class="label">Locked Patterns</span>
              <span class="value \${valueClass(patterns.lockedCount, 5, 1)}">\${patterns.lockedCount || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Important Patterns</span>
              <span class="value">\${patterns.importantCount || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Total Patterns</span>
              <span class="value">\${patterns.patterns?.length || 0}</span>
            </div>
            <div class="metric">
              <span class="label">EWC Threshold</span>
              <span class="value">\${(patterns.ewcThreshold * 100).toFixed(1)}% (φ⁻¹)</span>
            </div>
          </div>

          <!-- Learning Proof Card -->
          <div class="card proof-card">
            <h2>📈 Learning Proof</h2>
            \${Object.values(proof.proofs || {}).map(p => \`
              <div class="proof-item">
                <div class="proof-score \${scoreClass(p.score)}">
                  \${p.score !== null ? (p.score * 100).toFixed(0) + '%' : '?'}
                </div>
                <div class="proof-details">
                  <div class="proof-name">\${p.name || 'Unknown'}</div>
                  <div class="proof-interp">\${p.interpretation || p.description || ''}</div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`;

      document.getElementById('content').innerHTML = html;
      document.getElementById('refresh-time').textContent = 'Last updated: ' + new Date().toLocaleString();
    }

    // Initial load
    fetchData();

    // Auto-refresh every 30s
    setInterval(fetchData, 30000);
  </script>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════
// SERVER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create observatory server
 * @param {Object} [options] - Server options
 * @param {number} [options.port=3847] - Port (φ * 6220 ≈ 3847)
 * @returns {http.Server}
 */
export function createServer(options = {}) {
  const port = options.port || parseInt(process.env.OBSERVATORY_PORT || '3847', 10);

  let pool = null;
  let qlearning = null;
  let patterns = null;
  let telemetry = null;
  let learningProof = null;

  // Initialize on first request
  async function ensureInitialized() {
    if (!pool) {
      pool = getPool();
      qlearning = new QLearningQueries(pool);
      patterns = new PatternsQueries(pool);
      telemetry = new TelemetryQueries(pool);
      learningProof = new LearningProofQueries(pool);
    }
  }

  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${port}`);
    const path = url.pathname;

    // Dashboard HTML
    if (path === '/' || path === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(DASHBOARD_HTML);
      return;
    }

    // API routes
    try {
      await ensureInitialized();

      // Q-Learning endpoints
      if (path === '/api/qlearning/stats') {
        const data = await qlearning.getQTableStats();
        return jsonResponse(res, data);
      }
      if (path === '/api/qlearning/episodes') {
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const data = await qlearning.getEpisodeHistory({ limit });
        return jsonResponse(res, data);
      }
      if (path === '/api/qlearning/curve') {
        const interval = url.searchParams.get('interval') || 'hour';
        const data = await qlearning.getLearningCurve({ interval });
        return jsonResponse(res, data);
      }
      if (path === '/api/qlearning/heatmap') {
        const serviceId = url.searchParams.get('serviceId');
        const data = await qlearning.getQValuesHeatmap(serviceId);
        return jsonResponse(res, data);
      }
      if (path === '/api/qlearning/top-actions') {
        const data = await qlearning.getTopActions();
        return jsonResponse(res, data);
      }

      // Patterns endpoints
      if (path === '/api/patterns/recent') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const type = url.searchParams.get('type');
        const data = await patterns.getRecentPatterns({ limit, type });
        return jsonResponse(res, data);
      }
      if (path === '/api/patterns/important') {
        const data = await patterns.getImportantPatterns();
        return jsonResponse(res, data);
      }
      if (path === '/api/patterns/distribution') {
        const data = await patterns.getPatternDistribution();
        return jsonResponse(res, data);
      }
      if (path === '/api/patterns/timeline') {
        const interval = url.searchParams.get('interval') || 'hour';
        const data = await patterns.getPatternTimeline({ interval });
        return jsonResponse(res, data);
      }
      if (path === '/api/patterns/anomalies') {
        const data = await patterns.getAnomalies();
        return jsonResponse(res, data);
      }

      // Telemetry endpoints
      if (path === '/api/telemetry/health') {
        const data = await telemetry.getHealthMetrics();
        return jsonResponse(res, data);
      }
      if (path === '/api/telemetry/tools') {
        const interval = url.searchParams.get('interval') || 'hour';
        const data = await telemetry.getToolUsage({ interval });
        return jsonResponse(res, data);
      }
      if (path === '/api/telemetry/frictions') {
        const severity = url.searchParams.get('severity');
        const data = await telemetry.getFrictions({ severity });
        return jsonResponse(res, data);
      }
      if (path === '/api/telemetry/hotspots') {
        const data = await telemetry.getFrictionHotspots();
        return jsonResponse(res, data);
      }
      if (path === '/api/telemetry/sessions') {
        const data = await telemetry.getSessionMetrics();
        return jsonResponse(res, data);
      }
      if (path === '/api/telemetry/llm') {
        const interval = url.searchParams.get('interval') || 'hour';
        const data = await telemetry.getLLMMetrics(interval);
        return jsonResponse(res, data);
      }

      // Learning proof endpoints
      if (path === '/api/learning/proof') {
        const data = await learningProof.getLearningProof();
        return jsonResponse(res, data);
      }
      if (path === '/api/learning/timeline') {
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        const data = await learningProof.getLearningTimeline(days);
        return jsonResponse(res, data);
      }

      // 404
      errorResponse(res, 'Not found', 404);

    } catch (e) {
      console.error('[Observatory] Error:', e.message);
      errorResponse(res, e.message);
    }
  });

  return server;
}

/**
 * Start observatory server
 */
export async function start() {
  const port = parseInt(process.env.OBSERVATORY_PORT || '3847', 10);
  const server = createServer({ port });

  server.listen(port, () => {
    console.log(`
═══════════════════════════════════════════════════════════
🐕 CYNIC Observatory
═══════════════════════════════════════════════════════════

Dashboard:  http://localhost:${port}/

API Endpoints:
  GET /api/qlearning/stats      Q-Table summary
  GET /api/qlearning/curve      Learning curve (is it learning?)
  GET /api/qlearning/heatmap    Q-values visualization
  GET /api/patterns/important   EWC++ locked patterns
  GET /api/patterns/anomalies   Detected anomalies
  GET /api/telemetry/health     System health
  GET /api/telemetry/frictions  Friction points
  GET /api/learning/proof       COMPREHENSIVE LEARNING PROOF

"Observer pour comprendre, comprendre pour améliorer"
═══════════════════════════════════════════════════════════
    `);
  });

  return server;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
