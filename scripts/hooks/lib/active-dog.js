/**
 * Active Dog Detection & Inline Status
 *
 * "Le Collectif observe - un Chien répond"
 *
 * Determines which Dog (Sefirah) is most relevant for the current action
 * and generates inline status for visibility.
 *
 * @module scripts/hooks/lib/active-dog
 */

'use strict';

import { createRequire } from 'module';
const requireCJS = createRequire(import.meta.url);

// Load colors module
let colors = null;
let ANSI = null;
let DOG_COLORS = null;

try {
  colors = requireCJS('./colors.cjs');
  ANSI = colors.ANSI;
  DOG_COLORS = colors.DOG_COLORS;
} catch {
  // Fallback ANSI codes
  ANSI = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    green: '\x1b[32m',
  };
}

// Color helper
function c(color, text) {
  if (!ANSI) return text;
  return `${color}${text}${ANSI.reset}`;
}

// Collective Dogs (Sefirot) - minimal fallback
const COLLECTIVE_DOGS_FALLBACK = {
  CYNIC: { name: 'CYNIC', icon: '🧠', sefirah: 'Keter' },
  GUARDIAN: { name: 'Guardian', icon: '🛡️', sefirah: 'Gevurah' },
  SCOUT: { name: 'Scout', icon: '🔍', sefirah: 'Netzach' },
  ARCHITECT: { name: 'Architect', icon: '🏗️', sefirah: 'Chesed' },
  JANITOR: { name: 'Janitor', icon: '🧹', sefirah: 'Hod' },
  SCHOLAR: { name: 'Scholar', icon: '📚', sefirah: 'Binah' },
  DEPLOYER: { name: 'Deployer', icon: '🚀', sefirah: 'Yesod' },
  ANALYST: { name: 'Analyst', icon: '📊', sefirah: 'Chokmah' },
  CARTOGRAPHER: { name: 'Cartographer', icon: '🗺️', sefirah: 'Tiferet' },
  ORACLE: { name: 'Oracle', icon: '🔮', sefirah: 'Da\'at' },
  SAGE: { name: 'Sage', icon: '🦉', sefirah: 'Malkhut' },
};

let COLLECTIVE_DOGS = COLLECTIVE_DOGS_FALLBACK;

// Try to load full collective dogs module
try {
  const collectiveDogsModule = requireCJS('./collective-dogs.cjs');
  if (collectiveDogsModule?.COLLECTIVE_DOGS) {
    COLLECTIVE_DOGS = collectiveDogsModule.COLLECTIVE_DOGS;
  }
} catch {
  // Use fallback
}

/**
 * Determine which Dog is most relevant for the current action
 *
 * @param {string} toolName - Name of the tool being used
 * @param {Object} toolInput - Tool input parameters
 * @param {boolean} isError - Whether the tool errored
 * @returns {Object} The relevant Dog object
 */
export function getActiveDog(toolName, toolInput, isError) {
  const command = toolInput?.command || '';
  const filePath = toolInput?.file_path || toolInput?.filePath || '';

  // Errors activate the Guardian
  if (isError) {
    return COLLECTIVE_DOGS.GUARDIAN;
  }

  // Tool-specific mappings
  switch (toolName) {
    // Exploration tools → Scout
    case 'Read':
    case 'Glob':
    case 'Grep':
    case 'LS':
      return COLLECTIVE_DOGS.SCOUT;

    // Building tools → Architect
    case 'Write':
    case 'Edit':
    case 'NotebookEdit':
      // Unless it's cleanup/deletion
      if (toolInput?.new_string === '' || toolInput?.content?.length < (toolInput?.old_string?.length || 0)) {
        return COLLECTIVE_DOGS.JANITOR;
      }
      return COLLECTIVE_DOGS.ARCHITECT;

    // Task/Agent dispatch → CYNIC (orchestration)
    case 'Task':
      return COLLECTIVE_DOGS.CYNIC;

    // Web research → Scholar
    case 'WebFetch':
    case 'WebSearch':
      return COLLECTIVE_DOGS.SCHOLAR;

    // Bash commands need deeper analysis
    case 'Bash':
      // Git operations
      if (command.startsWith('git ')) {
        const gitCmd = command.split(' ')[1];
        if (['push', 'deploy', 'publish'].includes(gitCmd)) {
          return COLLECTIVE_DOGS.DEPLOYER;
        }
        if (['log', 'diff', 'show', 'blame'].includes(gitCmd)) {
          return COLLECTIVE_DOGS.ANALYST;
        }
        if (['clean', 'gc', 'prune'].includes(gitCmd)) {
          return COLLECTIVE_DOGS.JANITOR;
        }
        return COLLECTIVE_DOGS.CARTOGRAPHER;
      }
      // Test commands → Guardian (verification)
      if (command.match(/test|jest|vitest|mocha|pytest|cargo\s+test/i)) {
        return COLLECTIVE_DOGS.GUARDIAN;
      }
      // Build/compile → Architect
      if (command.match(/build|compile|tsc|webpack|vite/i)) {
        return COLLECTIVE_DOGS.ARCHITECT;
      }
      // Deploy commands → Deployer
      if (command.match(/deploy|publish|release/i)) {
        return COLLECTIVE_DOGS.DEPLOYER;
      }
      // Cleanup → Janitor
      if (command.match(/clean|rm\s|del\s|remove/i)) {
        return COLLECTIVE_DOGS.JANITOR;
      }
      // Default bash → Cartographer
      return COLLECTIVE_DOGS.CARTOGRAPHER;

    // MCP tools → depends on the tool
    default:
      if (toolName.startsWith('mcp__')) {
        if (toolName.includes('search') || toolName.includes('query')) {
          return COLLECTIVE_DOGS.SCOUT;
        }
        if (toolName.includes('memory') || toolName.includes('learn')) {
          return COLLECTIVE_DOGS.SCHOLAR;
        }
        if (toolName.includes('judge') || toolName.includes('refine')) {
          return COLLECTIVE_DOGS.ORACLE;
        }
        if (toolName.includes('pattern')) {
          return COLLECTIVE_DOGS.ANALYST;
        }
      }
      // Default → Scout
      return COLLECTIVE_DOGS.SCOUT;
  }
}

/**
 * Format the active Dog display
 *
 * @param {Object} dog - The dog object
 * @param {string} action - Optional action description
 * @returns {string} Formatted display string
 */
export function formatActiveDog(dog, action = '') {
  const actionText = action ? ` - ${action}` : '';
  return `${dog.icon} ${dog.name} (${dog.sefirah})${actionText}`;
}

/**
 * Generate inline status for TUI
 *
 * Target format (CLAUDE.md): [🔥{temp}° η:{eta}% │ 🛡️ {dog} │ ⚡{state} │ 📊 {patterns} │ Q:{score} │ 🗳️ {consensus}]
 *
 * @param {Object} activeDog - The active dog object
 * @param {Object} options - Status options
 * @param {Object} options.thermodynamics - Thermodynamics service
 * @param {Object} options.psychology - Psychology service
 * @param {Object} options.harmonicFeedback - Harmonic feedback system
 * @param {boolean} options.showPsychology - Whether to show psychology state
 * @param {Object} options.judgment - Recent judgment result (Q-Score, verdict)
 * @param {Object} options.consensus - Collective Dog consensus/votes
 * @returns {string|null} Inline status string or null
 */
export function generateInlineStatus(activeDog, options = {}) {
  const { thermodynamics, psychology, harmonicFeedback, showPsychology = true, judgment, consensus } = options;
  const parts = [];

  // 1. THERMODYNAMICS - 🔥 Heat & η Efficiency
  if (thermodynamics) {
    try {
      const thermoState = thermodynamics.getState();
      if (thermoState) {
        const temp = Math.round(thermoState.heat || 0);
        const tempColor = temp > 50 ? ANSI.brightRed :
                         temp > 30 ? ANSI.yellow : ANSI.brightGreen;
        parts.push(c(tempColor, `🔥${temp}°`));

        const eta = Math.min(Math.round(thermoState.efficiency || 0), 62);
        const etaColor = eta > 50 ? ANSI.brightGreen :
                        eta > 30 ? ANSI.yellow : ANSI.brightRed;
        parts.push(c(etaColor, `η:${eta}%`));
      }
    } catch { /* continue without */ }
  }

  // 2. ACTIVE DOG - Which Sefirot is responding
  if (activeDog) {
    const dogName = activeDog.name || 'CYNIC';
    parts.push(`${activeDog.icon} ${dogName}`);
  }

  // 3. PSYCHOLOGY STATE - Complete cognitive state
  if (psychology && showPsychology) {
    try {
      const summary = psychology.getSummary?.();
      if (summary) {
        if (summary.composites?.flow) {
          parts.push(c(ANSI.brightGreen, '⚡ flow'));
        } else if (summary.composites?.burnoutRisk) {
          parts.push(c(ANSI.brightRed, '⚡ burnout'));
        } else if (summary.frustration?.value > 0.5) {
          parts.push(c(ANSI.yellow, '⚡ friction'));
        } else {
          const energy = Math.round((summary.energy?.value || 0.5) * 100);
          const focus = Math.round((summary.focus?.value || 0.5) * 100);
          const load = Math.round(summary.cognitiveLoad?.value || 0);

          const minMetric = Math.min(energy, focus);
          const stateColor = minMetric > 60 ? ANSI.brightGreen :
                            minMetric > 40 ? ANSI.yellow : ANSI.brightRed;

          parts.push(c(stateColor, `⚡E:${energy}% F:${focus}%${load > 0 ? ` L:${load}` : ''}`));
        }
      }
    } catch { /* continue without */ }
  }

  // 4. THOMPSON COHERENCE + PATTERNS - 📊 Learning state
  if (harmonicFeedback) {
    try {
      const state = harmonicFeedback.getState?.();
      const stats = harmonicFeedback.thompsonSampler?.getStats?.();

      if (state || stats) {
        const coherence = state ? Math.round((state.coherence || 0.5) * 100) : null;
        const patterns = stats?.armCount || 0;

        let patternText = '';
        if (coherence !== null && patterns > 0) {
          patternText = `📊 ${coherence}%/${patterns}p`;
        } else if (patterns > 0) {
          patternText = `📊 ${patterns}p`;
        } else if (coherence !== null) {
          patternText = `📊 ${coherence}%`;
        }

        if (patternText) {
          const patternColor = coherence && coherence > 50 ? ANSI.cyan : ANSI.white;
          parts.push(c(patternColor, patternText));
        }
      }
    } catch { /* continue without */ }
  }

  // 5. Q-SCORE - 🎯 Quality score from judgment (SYMBIOSIS: human sees CYNIC's evaluation)
  if (judgment) {
    try {
      const qScore = judgment.qScore ?? judgment.q_score ?? judgment.score;
      const verdict = judgment.verdict;

      if (qScore !== undefined && qScore !== null) {
        // Color based on Q-Score: >61.8 green, >38.2 yellow, else red (φ-aligned)
        const qColor = qScore > 61.8 ? ANSI.brightGreen :
                      qScore > 38.2 ? ANSI.yellow : ANSI.brightRed;

        // Verdict emoji mapping
        const verdictEmoji = {
          HOWL: '🐺',      // Exceptional
          WAG: '✅',       // Approved
          GROWL: '⚠️',     // Warning
          BARK: '❌',      // Rejected
        };

        const emoji = verdict ? (verdictEmoji[verdict] || '🎯') : '🎯';
        parts.push(c(qColor, `${emoji}Q:${Math.round(qScore)}`));
      }
    } catch { /* continue without */ }
  }

  // 6. CONSENSUS - 🗳️ Collective Dog votes (SYMBIOSIS: human sees collective decision)
  if (consensus) {
    try {
      const votes = consensus.votes || consensus.dogVotes || [];
      const totalVotes = votes.length;

      if (totalVotes > 0) {
        // Count approvals vs rejections
        const approvals = votes.filter(v =>
          v.vote === 'approve' || v.vote === 'wag' || v.approved === true || v.support > 0.5
        ).length;

        const consensusRatio = approvals / totalVotes;
        const consensusColor = consensusRatio > 0.618 ? ANSI.brightGreen :
                              consensusRatio > 0.382 ? ANSI.yellow : ANSI.brightRed;

        // Show leading voter if available
        const leader = consensus.leader || consensus.dominantDog ||
          (votes[0]?.dog ? votes[0].dog.name || votes[0].dog : null);

        const leaderText = leader ? ` ${leader}` : '';
        parts.push(c(consensusColor, `🗳️${approvals}/${totalVotes}${leaderText}`));
      }
    } catch { /* continue without */ }
  }

  if (parts.length === 0) {
    return null;
  }

  return `${c(ANSI.dim, '[')}${parts.join(c(ANSI.dim, ' │ '))}${c(ANSI.dim, ']')}`;
}

export { COLLECTIVE_DOGS, ANSI };

export default {
  getActiveDog,
  formatActiveDog,
  generateInlineStatus,
  COLLECTIVE_DOGS,
};
