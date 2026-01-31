#!/usr/bin/env node
/**
 * CYNIC Compact Hook - PreCompact
 *
 * "Le chien préserve la mémoire" - CYNIC preserves memory before compaction
 *
 * This hook runs before Claude's context is compacted/summarized.
 * It extracts and preserves critical information that might be lost.
 *
 * @event PreCompact
 * @behavior non-blocking (preserves memories)
 */

'use strict';

import path from 'path';
import fs from 'fs';
import os from 'os';

// ESM imports from the lib bridge
import cynic, {
  detectUser,
  detectProject,
  saveCollectivePattern,
  callBrainTool,
  sendHookToCollectiveSync,
} from '../lib/index.js';

// Phase 22: Session state
import { getSessionState } from './lib/index.js';

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

/**
 * Format memories for preservation
 */
function formatForPreservation(memories) {
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

    // Detect user
    const user = detectUser();
    const project = detectProject();

    // Get session state
    const sessionState = getSessionState();

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTRACT MEMORIES TO PRESERVE
    // ═══════════════════════════════════════════════════════════════════════════
    const memories = [
      ...extractMemories(currentContext, conversationHistory),
      ...getSessionMemories(sessionState),
    ];

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
          },
        });
        preserved.push(memory);
      } catch (e) {
        // Continue without this memory
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PERSIST TO LOCAL FILE (backup)
    // ═══════════════════════════════════════════════════════════════════════════
    if (preserved.length > 0) {
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
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD PATTERN
    // ═══════════════════════════════════════════════════════════════════════════
    const pattern = {
      type: 'compaction',
      signature: 'pre_compact_preservation',
      description: `Preserved ${preserved.length} memories before compaction`,
      context: {
        totalExtracted: memories.length,
        preserved: preserved.length,
        categories: [...new Set(preserved.map(m => m.category))],
      },
    };
    saveCollectivePattern(pattern);

    // Send to collective
    sendHookToCollectiveSync('PreCompact', {
      memoriesExtracted: memories.length,
      memoriesPreserved: preserved.length,
      categories: [...new Set(preserved.map(m => m.category))],
      timestamp: Date.now(),
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // OUTPUT
    // ═══════════════════════════════════════════════════════════════════════════
    const output = {
      continue: true,
      preserved: {
        count: preserved.length,
        categories: [...new Set(preserved.map(m => m.category))],
      },
      timestamp: new Date().toISOString(),
    };

    // Show preservation summary if significant memories were preserved
    if (preserved.length >= 3) {
      const criticalCount = preserved.filter(m => m.priority === PRESERVATION_PRIORITY.CRITICAL).length;
      output.message = `\n── 🧠 MEMORY PRESERVATION ────────────────────────────────────\n   Preserved ${preserved.length} memories before compaction\n   🔴 Critical: ${criticalCount} │ 🟡 High: ${preserved.length - criticalCount}\n   Categories: ${[...new Set(preserved.map(m => m.category))].join(', ')}\n`;
    }

    safeOutput(output);

  } catch (error) {
    // PreCompact hook must never fail - silent continuation
    safeOutput({ continue: true });
  }
}

main();
