#!/usr/bin/env node
/**
 * CYNIC Collective Demo - The Sefirot Tree in Action
 *
 * Demonstrates inter-agent communication across all 11 agents
 */

import { CollectivePack } from '../src/agents/collective/index.js';
import { AgentEvent } from '../src/agents/events.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

const c = colors;

function banner() {
  console.log(`
${c.cyan}╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ${c.yellow}  ██████╗██╗   ██╗███╗   ██╗██╗ ██████╗${c.cyan}                              ║
║   ${c.yellow} ██╔════╝╚██╗ ██╔╝████╗  ██║██║██╔════╝${c.cyan}                              ║
║   ${c.yellow} ██║      ╚████╔╝ ██╔██╗ ██║██║██║     ${c.cyan}                              ║
║   ${c.yellow} ██║       ╚██╔╝  ██║╚██╗██║██║██║     ${c.cyan}                              ║
║   ${c.yellow} ╚██████╗   ██║   ██║ ╚████║██║╚██████╗${c.cyan}                              ║
║   ${c.yellow}  ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝ ╚═════╝${c.cyan}                              ║
║                                                                       ║
║   ${c.white}THE SEFIROT TREE - 11 Agents Collective Demo${c.cyan}                        ║
║   ${c.dim}κυνικός - Loyal to truth, not to comfort${c.cyan}                            ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function section(title) {
  console.log(`\n${c.bgBlue}${c.white} ${title} ${c.reset}\n`);
}

function log(agent, message, type = 'info') {
  const agentColors = {
    CYNIC: c.yellow,
    Guardian: c.red,
    Analyst: c.blue,
    Scholar: c.green,
    Architect: c.magenta,
    Sage: c.cyan,
    Scout: c.green,
    Cartographer: c.blue,
    Oracle: c.magenta,
    Janitor: c.dim,
    Deployer: c.yellow,
  };
  const color = agentColors[agent] || c.white;
  const typeIcon = {
    info: '📝',
    event: '📡',
    action: '⚡',
    result: '✅',
    warn: '⚠️',
    block: '🛑',
  };
  console.log(`${color}[${agent}]${c.reset} ${typeIcon[type] || ''} ${message}`);
}

async function demoEventBus(pack) {
  section('1. EVENT BUS - Inter-Agent Communication');

  console.log(`${c.dim}The event bus allows all 11 agents to communicate...${c.reset}\n`);

  // Show subscriptions from stats
  const stats = pack.eventBus.getStats();
  console.log(`${c.bright}Active Subscriptions:${c.reset} ${stats.totalSubscriptions}`);
  console.log(`${c.bright}Registered Agents:${c.reset} ${stats.registeredAgents}`);
  console.log(`${c.bright}Events Published:${c.reset} ${stats.eventsPublished}`);
}

async function demoGuardian(pack) {
  section('2. GUARDIAN (Gevurah) - Protection');

  const guardian = pack.guardian;

  // Test dangerous command
  log('Guardian', 'Testing dangerous command: rm -rf /', 'action');
  const result1 = await guardian.analyze({
    tool: 'Bash',
    input: { command: 'rm -rf /' }
  });
  const riskLevel = typeof result1.risk === 'object' ? JSON.stringify(result1.risk) : result1.risk;
  log('Guardian', `Blocked: ${result1.blocked} - Risk: ${riskLevel}`, result1.blocked ? 'block' : 'result');
  if (result1.message) {
    log('Guardian', `Reason: ${result1.message}`, 'info');
  }

  await sleep(300);

  // Test safe command
  log('Guardian', 'Testing safe command: ls -la', 'action');
  const result2 = await guardian.analyze({
    tool: 'Bash',
    input: { command: 'ls -la' }
  });
  log('Guardian', `Allowed: ${!result2.blocked}`, 'result');
}

async function demoAnalyst(pack) {
  section('3. ANALYST (Chesed) - Pattern Detection');

  const analyst = pack.analyst;

  // Simulate tool usage sequence through analyze
  const tools = ['Read', 'Grep', 'Read', 'Edit', 'Bash', 'Read', 'Grep', 'Read'];
  log('Analyst', `Analyzing tool sequence: ${tools.join(' → ')}`, 'action');

  for (const tool of tools) {
    await analyst.analyze({
      tool,
      input: {},
      output: { success: true }
    }, {}); // Pass empty context object
  }

  // Get profile to show patterns
  const profile = analyst.getProfile();
  log('Analyst', `Profile Level: ${profile.level}`, 'result');
  log('Analyst', `Experience Score: ${(profile.experience * 100).toFixed(1)}%`, 'info');

  const summary = analyst.getSummary();
  log('Analyst', `Tools tracked: ${summary.stats?.toolUsage?.total || 0}`, 'info');
}

async function demoScholar(pack) {
  section('4. SCHOLAR (Tiferet) - Knowledge Extraction');

  const scholar = pack.scholar;

  log('Scholar', 'Extracting knowledge from code...', 'action');

  const code = `
export class AgentEventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventType, agentId, handler) {
    // Register subscription
  }

  publish(event) {
    // Distribute to subscribers
  }
}`;

  const result = await scholar.analyze({
    content: code,
    source: 'demo-code'
  }, { source: 'demo' });

  if (result.extracted) {
    log('Scholar', `Extracted: ${result.extracted}`, 'result');
    log('Scholar', `Type: ${result.type}`, 'result');
    log('Scholar', `Confidence: ${(result.confidence * 100).toFixed(1)}%`, 'info');
  } else {
    log('Scholar', `Result: ${result.reason || 'No knowledge extracted'}`, 'info');
  }

  const summary = scholar.getSummary();
  log('Scholar', `Knowledge base size: ${summary.stats?.knowledgeCount || 0}`, 'info');
}

async function demoArchitect(pack) {
  section('5. ARCHITECT (Binah) - Code Review');

  const architect = pack.architect;

  log('Architect', 'Reviewing code quality...', 'action');

  const code = `
function processData(data) {
  if (data) {
    if (data.items) {
      if (data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          if (data.items[i].active) {
            console.log(data.items[i]);
          }
        }
      }
    }
  }
}`;

  const review = await architect.analyze({
    code,
    filename: 'demo.js'
  }, { filename: 'demo.js' });

  if (review.reviewed) {
    log('Architect', `Score: ${review.score?.toFixed(1) || 'N/A'}`, 'result');
    if (review.patterns?.length > 0) {
      review.patterns.forEach(p => {
        log('Architect', `Pattern: ${p.name}`, 'info');
      });
    }
    if (review.feedback?.length > 0) {
      review.feedback.slice(0, 3).forEach(f => {
        log('Architect', `${f.type}: ${f.message}`, f.type === 'error' ? 'warn' : 'info');
      });
    }
  } else {
    log('Architect', `Result: ${review.reason || 'No review'}`, 'info');
  }
}

async function demoSage(pack) {
  section('6. SAGE (Chochmah) - Wisdom Sharing');

  const sage = pack.sage;

  log('Sage', 'Sharing wisdom on "event-driven architecture"...', 'action');

  const result = await sage.shareWisdom('event-driven architecture');

  if (result.wisdom) {
    log('Sage', `Type: ${result.wisdom.type}`, 'result');
    log('Sage', `Insight: ${result.wisdom.insight?.slice(0, 80)}...`, 'info');
  } else if (result.response) {
    log('Sage', `Response: ${result.response}`, 'info');
  } else {
    log('Sage', 'Wisdom shared via event', 'info');
  }

  const summary = sage.getSummary();
  log('Sage', `Insights collected: ${summary.stats?.wisdomShared || 0}`, 'info');
}

async function demoCynic(pack) {
  section('7. CYNIC (Keter) - Crown Consciousness');

  const cynic = pack.cynic;

  // Awaken CYNIC
  log('CYNIC', 'Awakening...', 'action');
  await cynic.awaken();
  log('CYNIC', `State: ${cynic.metaState}`, 'result');

  await sleep(300);

  // Issue guidance
  log('CYNIC', 'Issuing guidance on deployment...', 'action');
  const guidance = await cynic.issueGuidance({
    type: 'behavioral',
    message: 'Verify tests before deployment',
    context: { environment: 'production', changes: 15 }
  });

  log('CYNIC', `Guidance issued: ${guidance.success}`, 'result');
  log('CYNIC', `Guidance ID: ${guidance.guidanceId}`, 'info');

  await sleep(300);

  // Make a decision
  log('CYNIC', 'Making decision on operation...', 'action');
  const decision = await cynic.makeDecision({
    type: 'synthesis',
    outcome: 'proceed_with_caution',
    reasoning: 'φ doute de φ - but tests pass',
    confidence: 0.55,
  });

  log('CYNIC', `Decision success: ${decision.success}`, 'result');
  log('CYNIC', `Decision ID: ${decision.decisionId}`, 'info');
}

async function demoConsensus(pack) {
  section('8. CONSENSUS - Collective Decision Making');

  log('CYNIC', 'Publishing consensus request via event bus...', 'action');

  // Publish a consensus request event
  const { ConsensusRequestEvent, AgentId } = await import('../src/agents/events.js');

  const question = 'Should we deploy to production?';
  const consensusEvent = new ConsensusRequestEvent(
    AgentId.CYNIC,
    question,
    { tests: 'all passing', coverage: '89%' },
    { timeout: 2000 }
  );

  await pack.eventBus.publish(consensusEvent);

  // Wait for processing
  await sleep(100);

  console.log(`\n${c.bright}Consensus Mechanism:${c.reset}`);
  console.log(`  Event ID: ${consensusEvent.id}`);
  console.log(`  Question: ${question}`);
  console.log(`  Threshold (φ⁻¹): 61.8%`);
  console.log(`  CYNIC participation: ${pack.cynic.stats.consensusParticipated}`);
}

async function demoIntrospection(pack) {
  section('9. INTROSPECTION - Self-Analysis');

  const cynic = pack.cynic;

  log('CYNIC', 'Initiating collective introspection...', 'action');

  const introspection = await cynic.introspect({ timeout: 2000 });

  console.log(`\n${c.bright}Collective State:${c.reset}`);
  console.log(`  Responses: ${introspection.responses}/${introspection.expected}`);
  console.log(`  Overall Health: ${introspection.overallHealth}`);

  if (introspection.dogStates) {
    console.log(`\n${c.bright}Agent States:${c.reset}`);
    Object.entries(introspection.dogStates).forEach(([dog, state]) => {
      const statusIcon = state.health === 'healthy' ? '🟢' : state.health === 'degraded' ? '🟡' : '🔴';
      console.log(`  ${statusIcon} ${dog}: ${state.health || 'unknown'}`);
    });
  }
}

async function showSummary(pack) {
  section('10. COLLECTIVE SUMMARY');

  const summary = pack.getSummary();

  console.log(`${c.bright}The Sefirot Tree:${c.reset}\n`);

  const tree = `
                    ${c.yellow}[CYNIC]${c.reset}
                     Keter
                       │
           ┌───────────┼───────────┐
           │           │           │
      ${c.magenta}[Sage]${c.reset}    ${c.blue}[Analyst]${c.reset}   ${c.cyan}[Architect]${c.reset}
      Chochmah     Chesed       Binah
           │           │           │
           └─────┬─────┴─────┬─────┘
                 │           │
            ${c.red}[Guardian]${c.reset}  ${c.green}[Scholar]${c.reset}
              Gevurah     Tiferet
                 │           │
           ┌─────┴─────┬─────┴─────┐
           │           │           │
      ${c.green}[Scout]${c.reset}   ${c.blue}[Cartographer]${c.reset}  ${c.magenta}[Oracle]${c.reset}
       Netzach      Hod          Yesod
           │           │           │
           └─────┬─────┴─────┬─────┘
                 │           │
            ${c.dim}[Janitor]${c.reset}  ${c.yellow}[Deployer]${c.reset}
              Malkuth      Hod
`;
  console.log(tree);

  console.log(`\n${c.bright}Statistics:${c.reset}`);
  console.log(`  Total Agents: ${summary.agentCount}`);
  console.log(`  Event Subscriptions: ${summary.eventBusStats?.totalSubscriptions || 'N/A'}`);
  console.log(`  Profile Level: ${summary.profileLevel}`);
  console.log(`  CYNIC State: ${summary.agents?.cynic?.state || 'unknown'}`);
}

async function main() {
  banner();

  console.log(`${c.dim}Initializing collective...${c.reset}`);
  const pack = new CollectivePack();
  const agentCount = ['guardian', 'analyst', 'scholar', 'architect', 'sage', 'cynic', 'janitor', 'scout', 'cartographer', 'oracle', 'deployer'].filter(a => pack[a]).length;
  console.log(`${c.green}✓ Collective initialized with ${agentCount} agents${c.reset}`);

  await sleep(500);

  try {
    await demoEventBus(pack);
    await sleep(500);

    await demoGuardian(pack);
    await sleep(500);

    await demoAnalyst(pack);
    await sleep(500);

    await demoScholar(pack);
    await sleep(500);

    await demoArchitect(pack);
    await sleep(500);

    await demoSage(pack);
    await sleep(500);

    await demoCynic(pack);
    await sleep(500);

    await demoConsensus(pack);
    await sleep(500);

    await demoIntrospection(pack);
    await sleep(500);

    await showSummary(pack);

    console.log(`\n${c.green}${c.bright}Demo complete!${c.reset}`);
    console.log(`${c.dim}φ distrusts φ - Max confidence 61.8%${c.reset}\n`);

  } catch (error) {
    console.error(`${c.red}Error: ${error.message}${c.reset}`);
    console.error(error.stack);
  }
}

main();
