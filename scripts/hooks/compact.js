#!/usr/bin/env node
/**
 * CYNIC Compact Hook - PreCompact
 *
 * "Le chien préserve la mémoire" - CYNIC preserves memory before compaction
 *
 * This hook runs before Claude's context is compacted/summarized.
 * It uses C-Score to:
 * 1. Score all context items by value
 * 2. Recommend what to preserve vs evict
 * 3. Use entropy-guided compaction (high entropy = remove first)
 *
 * C-Score = (Pertinence × Fraîcheur × Densité × Entropy) / √Taille
 *
 * φ-aligned thresholds:
 * - TARGET: 23.6% (φ⁻³) - Optimal working context
 * - SOFT: 38.2% (φ⁻²) - Warning, prune low C-Score
 * - HARD: 61.8% (φ⁻¹) - Force compaction
 *
 * @event PreCompact
 * @behavior non-blocking (preserves memories, suggests evictions)
 */

'use strict';

import path from 'path';
import fs from 'fs';
import os from 'os';

// ESM imports from the lib bridge
import {
  detectUser,
  detectProject,
  saveCollectivePattern,
  callBrainTool,
  sendHookToCollectiveSync,
} from '../lib/index.js';

// Phase 22: Session state
import { getSessionState } from './lib/index.js';

// C-Score system
import {
  calculateCScore,
  countTokens,
  DEFAULT_CONTEXT_SIZE,
} from '../../packages/core/src/context/index.js';

// =============================================================================
// φ CONSTANTS
// =============================================================================

const PHI_INV = 0.618033988749895;   // φ⁻¹ = 61.8%
const PHI_INV_2 = 0.381966011250105; // φ⁻² = 38.2%
const PHI_INV_3 = 0.236067977499790; // φ⁻³ = 23.6%

// =============================================================================
// MEMORY PRESERVATION PRIORITIES
// =============================================================================

const PRESERVATION_PRIORITY = {
  CRITICAL: 'critical',     // Must preserve (decisions, errors, security)
  HIGH: 'high',             // Should preserve (patterns, learnings)
  MEDIUM: 'medium',         // Nice to preserve (context, progress)
  LOW: 'low',               // Can be lost (routine observations)
};

/**
 * Memory categories to extract and preserve
 */
const MEMORY_CATEGORIES = {
  // Critical - always preserve
  decisions: {
    priority: PRESERVATION_PRIORITY.CRITICAL,
    patterns: [
      /decided to/i,
      /chose to/i,
      /will use/i,
      /approach:/i,
      /strategy:/i,
    ],
  },
  errors: {
    priority: PRESERVATION_PRIORITY.CRITICAL,
    patterns: [
      /error:/i,
      /failed:/i,
      /bug:/i,
      /issue:/i,
      /fixed:/i,
    ],
  },
  security: {
    priority: PRESERVATION_PRIORITY.CRITICAL,
    patterns: [
      /security/i,
      /vulnerability/i,
      /credential/i,
      /permission/i,
      /blocked/i,
    ],
  },

  // High - should preserve
  learnings: {
    priority: PRESERVATION_PRIORITY.HIGH,
    patterns: [
      /learned that/i,
      /discovered that/i,
      /found that/i,
      /realized/i,
      /note:/i,
    ],
  },
  architecture: {
    priority: PRESERVATION_PRIORITY.HIGH,
    patterns: [
      /architecture/i,
      /structure/i,
      /pattern/i,
      /design/i,
      /component/i,
    ],
  },

  // Medium - nice to preserve
  progress: {
    priority: PRESERVATION_PRIORITY.MEDIUM,
    patterns: [
      /completed/i,
      /finished/i,
      /done/i,
      /implemented/i,
      /created/i,
    ],
  },
  context: {
    priority: PRESERVATION_PRIORITY.MEDIUM,
    patterns: [
      /working on/i,
      /currently/i,
      /next step/i,
      /todo/i,
      /remaining/i,
    ],
  },
};

/**
 * Extract memories from conversation content
 */
function extractMemories(content, conversationHistory = []) {
  const memories = [];

  // Analyze conversation history if available
  for (const message of conversationHistory) {
    const text = typeof message === 'string' ? message :
                 message.content || message.text || '';

    for (const [category, config] of Object.entries(MEMORY_CATEGORIES)) {
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          // Extract the sentence containing the pattern
          const sentences = text.split(/[.!?]+/);
          const matchingSentences = sentences.filter(s => pattern.test(s));

          for (const sentence of matchingSentences.slice(0, 2)) {
            if (sentence.trim().length > 10 && sentence.trim().length < 500) {
              memories.push({
                category,
                priority: config.priority,
                content: sentence.trim(),
                timestamp: message.timestamp || Date.now(),
                source: 'conversation',
              });
            }
          }
          break; // One match per category per message
        }
      }
    }
  }

  // Deduplicate similar memories
  const seen = new Set();
  return memories.filter(m => {
    const key = `${m.category}:${m.content.substring(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get current session state to preserve
 */
function getSessionMemories(sessionState) {
  const memories = [];

  if (!sessionState?.isInitialized()) return memories;

  // Get patterns from session
  const patterns = sessionState.getPatterns();
  for (const [signature, data] of Object.entries(patterns)) {
    if (data.count > 2) { // Only preserve frequently occurring patterns
      memories.push({
        category: 'pattern',
        priority: PRESERVATION_PRIORITY.HIGH,
        content: `Pattern: ${signature} (occurred ${data.count}x)`,
        timestamp: data.lastSeen,
        source: 'session_state',
      });
    }
  }

  // Get errors from session
  const errors = sessionState.getErrors?.() || [];
  for (const error of errors.slice(-5)) { // Last 5 errors
    memories.push({
      category: 'errors',
      priority: PRESERVATION_PRIORITY.CRITICAL,
      content: `Error: ${error.type} - ${error.message?.substring(0, 100)}`,
      timestamp: error.timestamp,
      source: 'session_state',
    });
  }

  return memories;
}

// =============================================================================
// C-SCORE CONTEXT ANALYSIS
// =============================================================================

/**
 * Score conversation items using C-Score
 * Returns items sorted by value (highest C-Score first)
 */
function scoreContextItems(conversationHistory, currentTurn) {
  const scoredItems = [];

  for (let i = 0; i < conversationHistory.length; i++) {
    const message = conversationHistory[i];
    const text = typeof message === 'string' ? message :
                 message.content || message.text || '';

    if (!text || text.trim().length < 10) continue;

    // Calculate turn distance (for freshness)
    const turnsSinceAdded = currentTurn - (message.turn || i);

    // Determine content type for pertinence
    const contentType = detectContentType(text);

    // Build content object for C-Score
    const contentObj = {
      text,
      type: contentType,
      source: message.role || 'unknown',
    };

    // Get current context (for pertinence calculation)
    const context = {
      query: '', // We don't have the current query in PreCompact
      taskType: contentType,
      references: [],
    };

    try {
      const cScore = calculateCScore(contentObj, context, { turnsSinceAdded });

      scoredItems.push({
        index: i,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        fullText: text,
        cScore: cScore.C,
        breakdown: cScore.breakdown,
        turnsSinceAdded,
        contentType,
        role: message.role || 'unknown',
      });
    } catch (e) {
      // Fallback for items that fail scoring
      scoredItems.push({
        index: i,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        fullText: text,
        cScore: 30, // Default low score
        breakdown: { pertinence: 50, freshness: 50, density: 50, entropy: 80, tokens: countTokens(text) },
        turnsSinceAdded,
        contentType,
        role: message.role || 'unknown',
      });
    }
  }

  // Sort by C-Score descending (highest value first)
  return scoredItems.sort((a, b) => b.cScore - a.cScore);
}

/**
 * Detect content type from text
 */
function detectContentType(text) {
  // Code detection
  if (/function\s+\w+|const\s+\w+\s*=|class\s+\w+|import\s+.*from|export\s+/.test(text)) {
    return 'code';
  }
  // Error detection
  if (/error:|exception:|failed:|stack trace/i.test(text)) {
    return 'error';
  }
  // Decision detection
  if (/decided to|approach:|strategy:|will use/i.test(text)) {
    return 'decision';
  }
  // Documentation
  if (/readme|documentation|guide|tutorial/i.test(text)) {
    return 'docs';
  }
  return 'general';
}

/**
 * Analyze context budget and recommend evictions
 */
function analyzeContextBudget(scoredItems, maxTokens = DEFAULT_CONTEXT_SIZE) {
  const totalTokens = scoredItems.reduce((sum, item) => sum + (item.breakdown?.tokens || 0), 0);
  const utilization = totalTokens / maxTokens;

  // Determine budget status
  let level, action;
  if (utilization <= PHI_INV_3) {
    level = 'OPTIMAL';
    action = 'No compaction needed';
  } else if (utilization <= PHI_INV_2) {
    level = 'SOFT';
    action = 'Consider light compaction';
  } else if (utilization <= PHI_INV) {
    level = 'WARNING';
    action = 'Recommend compaction';
  } else {
    level = 'CRITICAL';
    action = 'Force compaction immediately';
  }

  // Calculate how many tokens to free to reach target
  const targetTokens = Math.floor(maxTokens * PHI_INV_3);
  const tokensToFree = Math.max(0, totalTokens - targetTokens);

  // Select eviction candidates (lowest C-Score first)
  const evictionCandidates = [];
  let freedTokens = 0;

  // Items are already sorted by C-Score descending, so reverse for eviction
  const sortedForEviction = [...scoredItems].reverse();

  for (const item of sortedForEviction) {
    if (freedTokens >= tokensToFree) break;

    // Don't evict very recent items (last 3 turns)
    if (item.turnsSinceAdded < 3) continue;

    // Don't evict critical content types
    if (item.contentType === 'decision' || item.contentType === 'error') continue;

    // Only evict low C-Score items (< 40)
    if (item.cScore < 40) {
      evictionCandidates.push(item);
      freedTokens += item.breakdown?.tokens || 0;
    }
  }

  // Select preservation candidates (highest C-Score)
  const preservationCandidates = scoredItems
    .filter(item => item.cScore >= 60)
    .slice(0, 10);

  return {
    totalTokens,
    utilization: Math.round(utilization * 100 * 10) / 10,
    level,
    action,
    targetTokens,
    tokensToFree,
    evictionCandidates,
    preservationCandidates,
    stats: {
      itemCount: scoredItems.length,
      avgCScore: scoredItems.length > 0
        ? Math.round(scoredItems.reduce((sum, i) => sum + i.cScore, 0) / scoredItems.length)
        : 0,
      highValue: scoredItems.filter(i => i.cScore >= 60).length,
      lowValue: scoredItems.filter(i => i.cScore < 40).length,
    },
  };
}

/**
 * Format memories for preservation
 */
function _formatForPreservation(memories) {
  // Sort by priority
  const priorityOrder = [
    PRESERVATION_PRIORITY.CRITICAL,
    PRESERVATION_PRIORITY.HIGH,
    PRESERVATION_PRIORITY.MEDIUM,
    PRESERVATION_PRIORITY.LOW,
  ];

  memories.sort((a, b) => {
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  // Group by category
  const grouped = {};
  for (const memory of memories) {
    if (!grouped[memory.category]) {
      grouped[memory.category] = [];
    }
    grouped[memory.category].push(memory);
  }

  // Format as markdown-like string
  let formatted = '## Preserved Memories (Pre-Compaction)\n\n';

  for (const [category, items] of Object.entries(grouped)) {
    const priority = items[0]?.priority || 'medium';
    const emoji = priority === 'critical' ? '🔴' :
                  priority === 'high' ? '🟡' :
                  priority === 'medium' ? '🟢' : '⚪';

    formatted += `### ${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    for (const item of items.slice(0, 5)) { // Max 5 per category
      formatted += `- ${item.content}\n`;
    }
    formatted += '\n';
  }

  return formatted;
}

// =============================================================================
// SAFE OUTPUT
// =============================================================================

function safeOutput(data) {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    process.stdout.write(str + '\n');
  } catch (e) {
    if (e.code === 'EPIPE') process.exit(0);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function main() {
  try {
    // Read stdin
    const fsModule = await import('fs');
    let input = '';

    try {
      input = fsModule.readFileSync(0, 'utf8');
    } catch (syncErr) {
      input = await new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(''));
        process.stdin.resume();
        setTimeout(() => resolve(data), 3000);
      });
    }

    if (!input || input.trim().length === 0) {
      safeOutput({ continue: true });
      return;
    }

    const hookContext = JSON.parse(input);
    const conversationHistory = hookContext.conversation || hookContext.messages || [];
    const currentContext = hookContext.context || hookContext.content || '';
    const currentTurn = hookContext.turn || conversationHistory.length;

    // Detect user
    const user = detectUser();
    const project = detectProject();

    // Get session state
    const sessionState = getSessionState();

    // ═══════════════════════════════════════════════════════════════════════════
    // C-SCORE ANALYSIS - Score all context items
    // ═══════════════════════════════════════════════════════════════════════════
    const scoredItems = scoreContextItems(conversationHistory, currentTurn);
    const budgetAnalysis = analyzeContextBudget(scoredItems);

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTRACT MEMORIES TO PRESERVE (Pattern-based + C-Score high-value)
    // ═══════════════════════════════════════════════════════════════════════════
    const memories = [
      ...extractMemories(currentContext, conversationHistory),
      ...getSessionMemories(sessionState),
    ];

    // Add high C-Score items as memories to preserve
    for (const item of budgetAnalysis.preservationCandidates) {
      memories.push({
        category: item.contentType,
        priority: item.cScore >= 70 ? PRESERVATION_PRIORITY.HIGH : PRESERVATION_PRIORITY.MEDIUM,
        content: item.text,
        timestamp: Date.now(),
        source: 'c_score_high_value',
        cScore: item.cScore,
      });
    }

    // Filter to critical/high priority (preserve important stuff)
    const criticalMemories = memories.filter(m =>
      m.priority === PRESERVATION_PRIORITY.CRITICAL ||
      m.priority === PRESERVATION_PRIORITY.HIGH
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // PERSIST TO BRAIN MEMORY
    // ═══════════════════════════════════════════════════════════════════════════
    const preserved = [];
    for (const memory of criticalMemories.slice(0, 20)) { // Max 20 memories
      try {
        await callBrainTool('brain_memory_store', {
          type: `compaction_preserved_${memory.category}`,
          content: memory.content,
          confidence: memory.priority === PRESERVATION_PRIORITY.CRITICAL ? 0.9 : 0.7,
          context: {
            category: memory.category,
            priority: memory.priority,
            source: memory.source,
            project: project?.name,
            preservedAt: Date.now(),
            reason: 'pre_compaction',
            cScore: memory.cScore,
          },
        });
        preserved.push(memory);
      } catch (e) {
        // Continue without this memory
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PERSIST TO LOCAL FILE (backup with C-Score data)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const preserveDir = path.join(os.homedir(), '.cynic', 'preserved');
      if (!fs.existsSync(preserveDir)) {
        fs.mkdirSync(preserveDir, { recursive: true });
      }

      const preserveFile = path.join(preserveDir, `compact_${Date.now()}.json`);
      fs.writeFileSync(preserveFile, JSON.stringify({
        timestamp: Date.now(),
        userId: user.userId,
        project: project?.name,
        memories: preserved,
        cScoreAnalysis: {
          utilization: budgetAnalysis.utilization,
          level: budgetAnalysis.level,
          stats: budgetAnalysis.stats,
          evictionCount: budgetAnalysis.evictionCandidates.length,
          preservationCount: budgetAnalysis.preservationCandidates.length,
        },
      }, null, 2));

      // Clean old preservation files (keep last 10)
      const files = fs.readdirSync(preserveDir)
        .filter(f => f.startsWith('compact_'))
        .sort()
        .reverse();

      for (const file of files.slice(10)) {
        fs.unlinkSync(path.join(preserveDir, file));
      }
    } catch (e) {
      // File preservation failed - continue
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD PATTERN
    // ═══════════════════════════════════════════════════════════════════════════
    const pattern = {
      type: 'compaction',
      signature: 'pre_compact_cscore',
      description: `C-Score analysis: ${budgetAnalysis.level} (${budgetAnalysis.utilization}%)`,
      context: {
        totalExtracted: memories.length,
        preserved: preserved.length,
        utilization: budgetAnalysis.utilization,
        level: budgetAnalysis.level,
        evictionCandidates: budgetAnalysis.evictionCandidates.length,
        avgCScore: budgetAnalysis.stats.avgCScore,
      },
    };
    saveCollectivePattern(pattern);

    // Send to collective
    sendHookToCollectiveSync('PreCompact', {
      memoriesExtracted: memories.length,
      memoriesPreserved: preserved.length,
      cScoreAnalysis: {
        utilization: budgetAnalysis.utilization,
        level: budgetAnalysis.level,
        action: budgetAnalysis.action,
        stats: budgetAnalysis.stats,
      },
      timestamp: Date.now(),
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // OUTPUT - Include C-Score recommendations
    // ═══════════════════════════════════════════════════════════════════════════
    const output = {
      continue: true,
      preserved: {
        count: preserved.length,
        categories: [...new Set(preserved.map(m => m.category))],
      },
      cScore: {
        utilization: budgetAnalysis.utilization,
        level: budgetAnalysis.level,
        action: budgetAnalysis.action,
        avgScore: budgetAnalysis.stats.avgCScore,
        highValue: budgetAnalysis.stats.highValue,
        lowValue: budgetAnalysis.stats.lowValue,
      },
      timestamp: new Date().toISOString(),
    };

    // Build detailed message for display
    const levelEmoji = {
      OPTIMAL: '✅',
      SOFT: '🟡',
      WARNING: '🟠',
      CRITICAL: '🔴',
    };

    const utilizationBar = buildProgressBar(budgetAnalysis.utilization);

    let message = `
── 🧠 CONTEXT INTELLIGENCE (C-Score) ─────────────────────────
   Utilization: [${utilizationBar}] ${budgetAnalysis.utilization}%
   Status: ${levelEmoji[budgetAnalysis.level] || '❓'} ${budgetAnalysis.level} - ${budgetAnalysis.action}

   📊 Stats: ${budgetAnalysis.stats.itemCount} items │ Avg C-Score: ${budgetAnalysis.stats.avgCScore}
   🟢 High Value (≥60): ${budgetAnalysis.stats.highValue} │ 🔴 Low Value (<40): ${budgetAnalysis.stats.lowValue}
`;

    // Add preservation summary
    if (preserved.length > 0) {
      const criticalCount = preserved.filter(m => m.priority === PRESERVATION_PRIORITY.CRITICAL).length;
      message += `
   💾 Preserved: ${preserved.length} memories (🔴 ${criticalCount} critical)
`;
    }

    // Add eviction recommendations if needed
    if (budgetAnalysis.evictionCandidates.length > 0 && budgetAnalysis.level !== 'OPTIMAL') {
      message += `
   🗑️ Eviction candidates: ${budgetAnalysis.evictionCandidates.length} items (lowest C-Score)
`;
      // Show top 3 eviction candidates
      for (const candidate of budgetAnalysis.evictionCandidates.slice(0, 3)) {
        message += `      └─ C=${candidate.cScore} [${candidate.contentType}] ${candidate.text.substring(0, 50)}...\n`;
      }
    }

    // Add preservation highlights
    if (budgetAnalysis.preservationCandidates.length > 0) {
      message += `
   ⭐ Top preserved (highest C-Score):
`;
      for (const candidate of budgetAnalysis.preservationCandidates.slice(0, 3)) {
        message += `      └─ C=${candidate.cScore} [${candidate.contentType}] ${candidate.text.substring(0, 50)}...\n`;
      }
    }

    output.message = message;

    safeOutput(output);

  } catch (error) {
    // PreCompact hook must never fail - silent continuation with error info
    safeOutput({
      continue: true,
      error: error.message,
      fallback: true,
    });
  }
}

/**
 * Build a 10-character progress bar
 */
function buildProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(Math.min(10, filled)) + '░'.repeat(Math.max(0, empty));
}

main();
