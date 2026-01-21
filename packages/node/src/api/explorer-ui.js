/**
 * CYNIC Ecosystem Explorer UI
 *
 * Serves a solscan-style explorer interface
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/node/api/explorer-ui
 */

'use strict';

/**
 * Setup explorer UI route
 * @param {Express.Application} app - Express app
 */
export function setupExplorerUI(app) {
  app.get('/explorer/ui', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(EXPLORER_HTML);
  });

  // Serve at root /ui as well for convenience
  app.get('/ui', (req, res) => {
    res.redirect('/explorer/ui');
  });

  console.log('🖥️  Explorer UI enabled at /explorer/ui');
}

// Note: innerHTML is used with data from our own trusted API endpoints.
// In a production environment, consider using a template library with auto-escaping.
const EXPLORER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYNIC Ecosystem Explorer</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #c9d1d9;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-gold: #c9a227;
      --accent-green: #3fb950;
      --accent-red: #f85149;
      --accent-blue: #58a6ff;
      --accent-purple: #bc8cff;
      --border: #30363d;
      --phi: 1.618033988749895;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--accent-gold);
    }

    .logo-icon { font-size: 2rem; }

    .search-box {
      display: flex;
      gap: 0.5rem;
      flex: 1;
      max-width: 500px;
      margin: 0 2rem;
    }

    .search-box input {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .search-box input:focus { outline: none; border-color: var(--accent-gold); }

    .search-box button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      background: var(--accent-gold);
      color: var(--bg-primary);
      font-weight: 600;
      cursor: pointer;
    }

    .nav { display: flex; gap: 0.5rem; }

    .nav-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn:hover, .nav-btn.active {
      background: var(--bg-tertiary);
      border-color: var(--accent-gold);
      color: var(--accent-gold);
    }

    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-value { font-size: 2rem; font-weight: 600; color: var(--accent-gold); }
    .stat-subtext { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem; }

    .section {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }

    .section-title { font-size: 1.1rem; font-weight: 600; }

    .table { width: 100%; border-collapse: collapse; }

    .table th, .table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .table th {
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--bg-tertiary);
    }

    .table tr:hover { background: rgba(201, 162, 39, 0.05); }
    .table tr:last-child td { border-bottom: none; }

    .verdict {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .verdict-howl { background: rgba(63, 185, 80, 0.2); color: var(--accent-green); }
    .verdict-wag { background: rgba(88, 166, 255, 0.2); color: var(--accent-blue); }
    .verdict-growl { background: rgba(201, 162, 39, 0.2); color: var(--accent-gold); }
    .verdict-bark { background: rgba(248, 81, 73, 0.2); color: var(--accent-red); }

    .score { font-weight: 600; font-family: monospace; }
    .score-high { color: var(--accent-green); }
    .score-mid { color: var(--accent-gold); }
    .score-low { color: var(--accent-red); }

    .hash { font-family: monospace; font-size: 0.85rem; color: var(--accent-blue); cursor: pointer; }
    .hash:hover { text-decoration: underline; }

    .truncate { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge-active { background: rgba(63, 185, 80, 0.2); color: var(--accent-green); }
    .badge-connected { background: rgba(88, 166, 255, 0.2); color: var(--accent-blue); }
    .badge-validator { background: rgba(188, 140, 255, 0.2); color: var(--accent-purple); }

    .phi-info {
      display: flex;
      gap: 2rem;
      padding: 1rem 1.5rem;
      background: rgba(201, 162, 39, 0.1);
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }

    .phi-item { display: flex; gap: 0.5rem; align-items: center; }
    .phi-label { color: var(--text-muted); }
    .phi-value { color: var(--accent-gold); font-weight: 600; font-family: monospace; }

    .loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }

    .detail-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .detail-row {
      display: flex;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
    }

    .detail-row:last-child { border-bottom: none; }
    .detail-label { width: 150px; color: var(--text-secondary); flex-shrink: 0; }
    .detail-value { flex: 1; word-break: break-all; }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--text-primary);
      cursor: pointer;
    }

    .back-btn:hover { background: var(--bg-tertiary); }

    @media (max-width: 768px) {
      .header { flex-wrap: wrap; gap: 1rem; }
      .search-box { order: 3; margin: 0; max-width: 100%; width: 100%; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo"><span class="logo-icon">🐕</span><span>CYNIC Explorer</span></div>
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search judgment ID, block hash, slot, operator..." />
      <button onclick="doSearch()">Search</button>
    </div>
    <nav class="nav">
      <button class="nav-btn active" onclick="showSection('overview')">Overview</button>
      <button class="nav-btn" onclick="showSection('judgments')">Judgments</button>
      <button class="nav-btn" onclick="showSection('blocks')">Blocks</button>
      <button class="nav-btn" onclick="showSection('operators')">Operators</button>
      <button class="nav-btn" onclick="showSection('burns')">Burns</button>
    </nav>
  </header>

  <main class="container">
    <div id="overview-section" class="section-content">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Total Judgments</div><div class="stat-value" id="stat-judgments">-</div><div class="stat-subtext">Collective wisdom</div></div>
        <div class="stat-card"><div class="stat-label">Block Height</div><div class="stat-value" id="stat-blocks">-</div><div class="stat-subtext">PoJ Chain</div></div>
        <div class="stat-card"><div class="stat-label">Operators</div><div class="stat-value" id="stat-operators">-</div><div class="stat-subtext">Active validators</div></div>
        <div class="stat-card"><div class="stat-label">Uptime</div><div class="stat-value" id="stat-uptime">-</div><div class="stat-subtext">Node lifetime</div></div>
      </div>
      <div class="section">
        <div class="section-header"><span class="section-title">Recent Judgments</span></div>
        <table class="table">
          <thead><tr><th>ID</th><th>Score</th><th>Verdict</th><th>Confidence</th><th>Time</th></tr></thead>
          <tbody id="recent-judgments"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody>
        </table>
        <div class="phi-info">
          <div class="phi-item"><span class="phi-label">Max Confidence:</span><span class="phi-value">φ⁻¹ = 61.8%</span></div>
          <div class="phi-item"><span class="phi-label">Consensus:</span><span class="phi-value">61.8%</span></div>
          <div class="phi-item"><span class="phi-label">Min Doubt:</span><span class="phi-value">φ⁻² = 38.2%</span></div>
        </div>
      </div>
    </div>

    <div id="judgments-section" class="section-content" style="display: none;">
      <div class="section">
        <div class="section-header">
          <span class="section-title">All Judgments</span>
          <select id="verdict-filter" onchange="filterJudgments()">
            <option value="">All Verdicts</option>
            <option value="HOWL">HOWL</option>
            <option value="WAG">WAG</option>
            <option value="GROWL">GROWL</option>
            <option value="BARK">BARK</option>
          </select>
        </div>
        <table class="table">
          <thead><tr><th>ID</th><th>Q-Score</th><th>Global</th><th>Verdict</th><th>Confidence</th><th>Consensus</th><th>Time</th></tr></thead>
          <tbody id="all-judgments"><tr><td colspan="7" class="loading">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="blocks-section" class="section-content" style="display: none;">
      <div class="section">
        <div class="section-header"><span class="section-title">PoJ Blocks</span></div>
        <table class="table">
          <thead><tr><th>Slot</th><th>Hash</th><th>Proposer</th><th>Judgments</th><th>Status</th><th>Time</th></tr></thead>
          <tbody id="all-blocks"><tr><td colspan="6" class="loading">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="operators-section" class="section-content" style="display: none;">
      <div class="section">
        <div class="section-header"><span class="section-title">Network Operators</span></div>
        <table class="table">
          <thead><tr><th>Public Key</th><th>E-Score</th><th>Burns</th><th>Status</th></tr></thead>
          <tbody id="all-operators"><tr><td colspan="4" class="loading">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="burns-section" class="section-content" style="display: none;">
      <div class="section">
        <div class="section-header"><span class="section-title">Verified Burns</span></div>
        <table class="table">
          <thead><tr><th>Signature</th><th>Token</th><th>Amount</th><th>Burner</th><th>Time</th></tr></thead>
          <tbody id="all-burns"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="detail-section" class="section-content" style="display: none;">
      <button class="back-btn" onclick="goBack()">← Back</button>
      <div id="detail-content"></div>
    </div>
  </main>

  <script>
    const API = '';
    let curSec = 'overview';

    // Escape HTML to prevent XSS
    const esc = s => s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString() : '-';
    const fmtScore = s => s == null ? '-' : '<span class="score '+(s>=70?'score-high':s>=40?'score-mid':'score-low')+'">'+s.toFixed(1)+'</span>';
    const fmtVerdict = v => v ? '<span class="verdict verdict-'+esc(v).toLowerCase()+'">'+esc(v)+'</span>' : '-';
    const trunc = h => h && h.length > 16 ? esc(h.slice(0,8))+'...'+esc(h.slice(-6)) : esc(h||'-');
    const fmtUp = ms => {
      if (!ms) return '0s';
      const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60),d=Math.floor(h/24);
      return d>0?d+'d '+(h%24)+'h':h>0?h+'h '+(m%60)+'m':m>0?m+'m '+(s%60)+'s':s+'s';
    };

    function showSection(sec) {
      document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(sec + '-section').style.display = 'block';
      document.querySelector('[onclick="showSection(\\''+sec+'\\')"]').classList.add('active');
      curSec = sec;
      loadSec(sec);
    }

    function goBack() { showSection(curSec || 'overview'); }

    async function fetchJ(url) {
      try { const r = await fetch(API + url); return r.ok ? await r.json() : null; }
      catch (e) { console.error(e); return null; }
    }

    async function loadOverview() {
      const d = await fetchJ('/explorer');
      if (d) {
        document.getElementById('stat-judgments').textContent = d.stats?.judgments || 0;
        document.getElementById('stat-blocks').textContent = d.stats?.blocks || 0;
        document.getElementById('stat-operators').textContent = d.stats?.operators || 0;
        document.getElementById('stat-uptime').textContent = fmtUp(d.stats?.uptime);
      }
      loadRecent();
    }

    async function loadRecent() {
      const d = await fetchJ('/explorer/judgments?limit=10');
      const tb = document.getElementById('recent-judgments');
      if (!d?.judgments?.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">No judgments</td></tr>'; return; }
      tb.innerHTML = d.judgments.map(j =>
        '<tr onclick="showJdg(\\''+esc(j.id)+'\\')" style="cursor:pointer"><td><span class="hash">'+trunc(j.id)+'</span></td><td>'+fmtScore(j.qScore||j.globalScore)+'</td><td>'+fmtVerdict(j.qVerdict||j.verdict)+'</td><td>'+(j.confidence?(j.confidence*100).toFixed(1)+'%':'-')+'</td><td>'+fmtTime(j.timestamp)+'</td></tr>'
      ).join('');
    }

    async function loadJudgments() {
      const f = document.getElementById('verdict-filter').value;
      const d = await fetchJ('/explorer/judgments?limit=50' + (f ? '&verdict='+f : ''));
      const tb = document.getElementById('all-judgments');
      if (!d?.judgments?.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">No judgments</td></tr>'; return; }
      tb.innerHTML = d.judgments.map(j =>
        '<tr onclick="showJdg(\\''+esc(j.id)+'\\')" style="cursor:pointer"><td><span class="hash">'+trunc(j.id)+'</span></td><td>'+fmtScore(j.qScore)+'</td><td>'+fmtScore(j.globalScore)+'</td><td>'+fmtVerdict(j.qVerdict||j.verdict)+'</td><td>'+(j.confidence?(j.confidence*100).toFixed(1)+'%':'-')+'</td><td>'+esc(j.consensusStatus||'-')+'</td><td>'+fmtTime(j.timestamp)+'</td></tr>'
      ).join('');
    }

    async function loadBlocks() {
      const d = await fetchJ('/explorer/blocks?limit=30');
      const tb = document.getElementById('all-blocks');
      if (!d?.blocks?.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">No blocks</td></tr>'; return; }
      tb.innerHTML = d.blocks.map(b =>
        '<tr onclick="showBlk(\\''+esc(b.hash)+'\\')" style="cursor:pointer"><td>'+b.slot+'</td><td><span class="hash">'+trunc(b.hash)+'</span></td><td class="truncate">'+esc(b.proposer||'-')+'</td><td>'+b.judgmentCount+'</td><td><span class="badge badge-active">'+esc(b.status)+'</span></td><td>'+fmtTime(b.timestamp)+'</td></tr>'
      ).join('');
    }

    async function loadOps() {
      const d = await fetchJ('/explorer/operators');
      const tb = document.getElementById('all-operators');
      if (!d?.operators?.length) { tb.innerHTML = '<tr><td colspan="4" class="empty">No operators</td></tr>'; return; }
      tb.innerHTML = d.operators.map(op =>
        '<tr><td><span class="hash" onclick="showOp(\\''+esc(op.publicKey)+'\\')">'+trunc(op.publicKey)+'</span></td><td>'+fmtScore(op.eScore)+'</td><td>'+(op.burned||0)+'</td><td><span class="badge badge-'+esc(op.status||'').toLowerCase()+'">'+esc(op.status)+'</span>'+(op.isSelf?' <span class="badge badge-active">SELF</span>':'')+'</td></tr>'
      ).join('');
    }

    async function loadBurns() {
      const d = await fetchJ('/explorer/burns');
      const tb = document.getElementById('all-burns');
      if (!d?.burns?.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">No burns</td></tr>'; return; }
      tb.innerHTML = d.burns.map(b =>
        '<tr><td><span class="hash">'+trunc(b.signature)+'</span></td><td class="truncate">'+trunc(b.mint)+'</td><td>'+(b.amount||'-')+'</td><td class="truncate">'+trunc(b.burner)+'</td><td>'+fmtTime(b.timestamp)+'</td></tr>'
      ).join('');
    }

    function loadSec(s) {
      if (s==='overview') loadOverview();
      else if (s==='judgments') loadJudgments();
      else if (s==='blocks') loadBlocks();
      else if (s==='operators') loadOps();
      else if (s==='burns') loadBurns();
    }

    function filterJudgments() { loadJudgments(); }

    async function showJdg(id) {
      const d = await fetchJ('/explorer/judgment/'+encodeURIComponent(id));
      if (!d?.judgment) return;
      const j = d.judgment;
      let h = '<div class="detail-card"><h2 style="margin-bottom:1rem">Judgment Details</h2>';
      h += '<div class="detail-row"><span class="detail-label">ID</span><span class="detail-value hash">'+esc(j.id)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Q-Score</span><span class="detail-value">'+fmtScore(j.qScore)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Global</span><span class="detail-value">'+fmtScore(j.globalScore)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Verdict</span><span class="detail-value">'+fmtVerdict(j.qVerdict?.verdict||j.verdict)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Confidence</span><span class="detail-value">'+(j.confidence?(j.confidence*100).toFixed(1)+'%':'-')+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Vote Weight</span><span class="detail-value">'+(j.voteWeight?.toFixed(4)||'-')+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Consensus</span><span class="detail-value">'+esc(j.consensusStatus||'-')+' (Slot: '+(j.consensusSlot||'-')+')</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Block</span><span class="detail-value hash">'+esc(j.consensusBlockHash||'-')+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">'+(j.timestamp?new Date(j.timestamp).toLocaleString():'-')+'</span></div>';
      h += '</div>';
      if (j.axiomScores) {
        h += '<div class="detail-card"><h3 style="margin-bottom:1rem">Axiom Scores</h3>';
        for (const [k,v] of Object.entries(j.axiomScores)) h += '<div class="detail-row"><span class="detail-label">'+esc(k)+'</span><span class="detail-value">'+fmtScore(v)+'</span></div>';
        h += '</div>';
      }
      if (j.weaknesses?.length) {
        h += '<div class="detail-card"><h3 style="margin-bottom:1rem">Weaknesses</h3>';
        j.weaknesses.forEach(w => h += '<div style="padding:0.5rem 0;border-bottom:1px solid var(--border)">'+esc(w)+'</div>');
        h += '</div>';
      }
      document.getElementById('detail-content').innerHTML = h;
      document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
      document.getElementById('detail-section').style.display = 'block';
    }

    async function showBlk(hash) {
      const d = await fetchJ('/explorer/block/'+encodeURIComponent(hash));
      if (!d?.block) return;
      const b = d.block;
      let h = '<div class="detail-card"><h2 style="margin-bottom:1rem">Block Details</h2>';
      h += '<div class="detail-row"><span class="detail-label">Slot</span><span class="detail-value">'+b.slot+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Hash</span><span class="detail-value hash">'+esc(b.hash)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Previous</span><span class="detail-value hash">'+esc(b.previousHash||'Genesis')+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Proposer</span><span class="detail-value hash">'+esc(b.proposer)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-active">'+esc(b.status)+'</span></span></div>';
      h += '<div class="detail-row"><span class="detail-label">Confirms</span><span class="detail-value">'+(b.confirmations||0)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Judgments</span><span class="detail-value">'+(b.judgments?.length||0)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">'+(b.timestamp?new Date(b.timestamp).toLocaleString():'-')+'</span></div>';
      h += '</div>';
      if (b.judgments?.length) {
        h += '<div class="detail-card"><h3 style="margin-bottom:1rem">Judgments</h3>';
        b.judgments.forEach(j => h += '<div class="detail-row" style="cursor:pointer" onclick="showJdg(\\''+esc(j.id)+'\\')"><span class="detail-label hash">'+trunc(j.id)+'</span><span class="detail-value">'+fmtScore(j.globalScore)+' - '+fmtVerdict(j.verdict)+'</span></div>');
        h += '</div>';
      }
      document.getElementById('detail-content').innerHTML = h;
      document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
      document.getElementById('detail-section').style.display = 'block';
    }

    async function showOp(pk) {
      const d = await fetchJ('/explorer/operator/'+encodeURIComponent(pk));
      if (!d?.operator) return;
      const op = d.operator;
      let h = '<div class="detail-card"><h2 style="margin-bottom:1rem">Operator Details</h2>';
      h += '<div class="detail-row"><span class="detail-label">Public Key</span><span class="detail-value hash">'+esc(op.publicKey)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Node ID</span><span class="detail-value hash">'+esc(op.nodeId||'-')+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">E-Score</span><span class="detail-value">'+fmtScore(op.eScore)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Burns</span><span class="detail-value">'+(op.burned||0)+'</span></div>';
      h += '<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-'+esc(op.status||'').toLowerCase()+'">'+esc(op.status)+'</span>'+(op.isSelf?' <span class="badge badge-active">SELF</span>':'')+'</span></div>';
      if (op.address) h += '<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">'+esc(op.address)+'</span></div>';
      if (op.uptime) h += '<div class="detail-row"><span class="detail-label">Uptime</span><span class="detail-value">'+fmtUp(op.uptime)+'</span></div>';
      h += '</div>';
      document.getElementById('detail-content').innerHTML = h;
      document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
      document.getElementById('detail-section').style.display = 'block';
    }

    async function doSearch() {
      const q = document.getElementById('searchInput').value.trim();
      if (!q) return;
      const d = await fetchJ('/explorer/search?q='+encodeURIComponent(q));
      if (!d) return;
      if (d.results.length === 1) {
        const r = d.results[0];
        if (r.type==='judgment') showJdg(r.id);
        else if (r.type==='block') showBlk(r.id);
        else if (r.type==='operator') showOp(r.id);
        return;
      }
      let h = '<div class="detail-card"><h2 style="margin-bottom:1rem">Search: "'+esc(q)+'"</h2>';
      if (!d.results.length) h += '<p class="empty">No results</p>';
      d.results.forEach(r => {
        const fn = r.type==='judgment'?'showJdg':r.type==='block'?'showBlk':'showOp';
        h += '<div class="detail-row" style="cursor:pointer" onclick="'+fn+'(\\''+esc(r.id)+'\\')"><span class="detail-label"><span class="badge badge-'+(r.type==='judgment'?'active':r.type==='block'?'connected':'validator')+'">'+esc(r.type.toUpperCase())+'</span></span><span class="detail-value"><span class="hash">'+trunc(r.id)+'</span><span style="color:var(--text-muted);margin-left:1rem">'+esc(r.preview)+'</span></span></div>';
      });
      h += '</div>';
      document.getElementById('detail-content').innerHTML = h;
      document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
      document.getElementById('detail-section').style.display = 'block';
    }

    document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key==='Enter') doSearch(); });
    loadOverview();
    setInterval(() => { if (document.getElementById('overview-section').style.display !== 'none') loadOverview(); }, 10000);
  </script>
</body>
</html>`;

export default { setupExplorerUI };
