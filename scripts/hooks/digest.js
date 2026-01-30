#!/usr/bin/env node
/**
 * CYNIC Digest Hook - Stop
 *
 * "Le chien digère" - CYNIC extracts knowledge from the session
 *
 * This hook runs when the session ends.
 * It summarizes the session, extracts insights, and updates collective memory.
 *
 * @event Stop
 * @behavior non-blocking (outputs summary)
 */

'use strict';

// ESM imports from the lib bridge
import cynic, {
  DC,
  detectUser,
  detectEcosystem,
  detectProject,
  loadUserProfile,
  loadCollectivePatterns,
  addCollectiveInsight,
  sendHookToCollectiveSync,
  digestToBrain,
  callBrainTool,
  orchestrateFull,  // Phase 21: Full orchestration with UnifiedOrchestrator
  getTaskEnforcer,
  getConsciousness,
  getVoluntaryPoverty,
  getThermodynamics,
  getEmergence,
  getPhysicsBridge,
  getTotalMemory,
} from '../lib/index.js';

// =============================================================================
// FEEDBACK EMISSION (Phase 18 - Complete Automation Layer)
// =============================================================================

/**
 * Emit session feedback event to the brain
 * This allows the automation layer to learn from session outcomes
 *
 * FIXED: Now sends proper format for LearningService.processFeedback()
 * and triggers learn() to actually apply the feedback to weights
 */
async function emitSessionFeedback(userId, analysis, insights) {
  try {
    // Calculate session quality score based on analysis
    const errorRate = analysis.toolsUsed > 0
      ? analysis.errorsEncountered / analysis.toolsUsed
      : 0;

    const completionScore = analysis.completionRate ?? 0;

    // φ-weighted quality: 61.8% completion, 38.2% error-free
    const qualityScore = Math.round((completionScore * 0.618) + ((1 - errorRate) * 0.382) * 100);

    // Determine outcome based on error rate and insights
    const hasNegativeInsights = insights.some(i =>
      i.type === 'recurring_error' || i.type === 'failure_pattern'
    );
    const outcome = errorRate > 0.3 || hasNegativeInsights ? 'incorrect' : 'correct';

    // Prepare session feedback in LearningService format
    // This matches processFeedback() expected schema
    const feedback = {
      outcome,                              // 'correct' | 'incorrect' | 'partial'
      actualScore: qualityScore,            // What the session actually scored (0-100)
      originalScore: 62,                    // φ⁻¹ baseline expectation
      itemType: 'session',                  // Track by session type
      dimensionScores: {
        // Estimate dimension contributions from session metrics
        PHI_COHERENCE: errorRate < 0.1 ? 80 : 50,
        PHI_HARMONY: completionScore * 100,
        VERIFY_ACCURACY: (1 - errorRate) * 100,
        VERIFY_EVIDENCE: analysis.toolsUsed > 5 ? 70 : 50,
        BURN_SIMPLICITY: analysis.toolsUsed < 50 ? 70 : 40,
        CULTURE_PATTERNS: insights.length > 0 ? 60 : 40,
      },
      source: 'session_digest',
      sourceContext: {
        userId,
        toolsUsed: analysis.toolsUsed,
        errorsEncountered: analysis.errorsEncountered,
        insightCount: insights.length,
        timestamp: Date.now(),
      },
    };

    // Step 1: Send feedback to queue
    await callBrainTool('brain_learning', {
      action: 'feedback',
      feedback,
    }).catch(() => {});

    // Step 2: CRITICAL - Trigger learn() to actually process the feedback
    // Without this, feedback accumulates but never updates weights
    const learnResult = await callBrainTool('brain_learning', {
      action: 'learn',
    }).catch(() => ({ success: false, reason: 'MCP call failed' }));

    if (learnResult?.success) {
      console.error(`[CYNIC] Learning cycle completed: ${learnResult.feedbackProcessed} feedback processed`);
    }
  } catch (e) {
    // Non-critical - silently ignore
    console.error('[CYNIC] Session feedback failed:', e.message);
  }
}

// =============================================================================
// SESSION ANALYSIS
// =============================================================================

function analyzeSession(profile) {
  const analysis = {
    duration: 'unknown',
    toolsUsed: 0,
    errorsEncountered: 0,
    topTools: [],
    languagesWorked: [],
    patterns: []
  };

  // Get session stats
  if (profile.stats) {
    analysis.toolsUsed = profile.stats.toolCalls || 0;
    analysis.errorsEncountered = profile.stats.errorsEncountered || 0;
  }

  // Get top tools used
  const commonTools = profile.patterns?.commonTools || {};
  analysis.topTools = Object.entries(commonTools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, count]) => ({ tool, count }));

  return analysis;
}

function extractInsights(profile, collectivePatterns) {
  const insights = [];

  // Check for error patterns
  const errorPatterns = collectivePatterns.patterns
    .filter(p => p.type === 'error')
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (errorPatterns.length > 0) {
    for (const pattern of errorPatterns) {
      if (pattern.count >= DC.FREQUENCY.ERROR_PATTERN_MIN) {
        insights.push({
          type: 'recurring_error',
          description: `${pattern.description} occurred ${pattern.count} times`,
          suggestion: 'Consider addressing the root cause'
        });
      }
    }
  }

  // Check for tool preferences
  const toolPatterns = collectivePatterns.patterns
    .filter(p => p.type === 'tool_usage')
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (toolPatterns.length > 0) {
    const topTool = toolPatterns[0];
    insights.push({
      type: 'tool_preference',
      description: `${topTool.signature} is the most used tool`,
      count: topTool.count
    });
  }

  return insights;
}

function formatDigestMessage(profile, analysis, insights, engineStats) {
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('🧠 CYNIC DIGESTING - Session Complete');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // Session summary
  lines.push('── SESSION SUMMARY ────────────────────────────────────────');
  lines.push(`   Tools used: ${analysis.toolsUsed}`);
  if (analysis.errorsEncountered > 0) {
    lines.push(`   Errors encountered: ${analysis.errorsEncountered}`);
  }

  // Todo completion stats
  if (analysis.todosTotal > 0) {
    const emoji = analysis.completionRate >= DC.PHI.PHI_INV ? '✅' : '⚠️';
    lines.push(`   Tasks: ${analysis.todosCompleted}/${analysis.todosTotal} completed ${emoji} (${Math.round(analysis.completionRate * 100)}%)`);
  }

  if (analysis.topTools.length > 0) {
    lines.push('   Top tools:');
    for (const { tool, count } of analysis.topTools.slice(0, 3)) {
      lines.push(`      • ${tool} (${count}x)`);
    }
  }
  lines.push('');

  // Engine stats (new)
  if (engineStats && Object.keys(engineStats).length > 0) {
    lines.push('── ENGINE ACTIVITY ────────────────────────────────────────');
    if (engineStats.deletions > 0) {
      lines.push(`   ✂️ Deletions celebrated: ${engineStats.deletions} (voluntary poverty)`);
    }
    if (engineStats.efficiency) {
      lines.push(`   ⚡ Cognitive efficiency: ${Math.round(engineStats.efficiency * 100)}%`);
    }
    // Show emergence status (Phase 4) or fallback to old consciousness score
    if (engineStats.emergence) {
      const e = engineStats.emergence;
      const emoji = e.emerged ? '✨' : '🧠';
      lines.push(`   ${emoji} Consciousness: [${e.bar}] ${e.score.toFixed(1)}% / ${e.maxScore}%`);
      if (e.emerged) {
        lines.push(`   Status: EMERGED - φ⁻¹ threshold reached`);
      }
    } else if (engineStats.consciousnessScore) {
      const bar = '█'.repeat(Math.floor(engineStats.consciousnessScore / 10)) +
                  '░'.repeat(10 - Math.floor(engineStats.consciousnessScore / 10));
      lines.push(`   🧠 Consciousness: [${bar}] ${engineStats.consciousnessScore}% / 61.8%`);
    }
    // Show physics engine stats
    if (engineStats.physicsLoaded > 0) {
      lines.push(`   🔬 Physics engines: ${engineStats.physicsLoaded}/5 loaded`);
    }
    if (engineStats.entangledPairs > 0) {
      lines.push(`   ⊗  Pattern entanglements: ${engineStats.entangledPairs} pairs`);
    }
    if (engineStats.activeDog) {
      lines.push(`   🐕 Active Dog: ${engineStats.activeDog}`);
    }
    if (engineStats.perspectiveConflicts > 0) {
      lines.push(`   ⚖️  Perspective conflicts: ${engineStats.perspectiveConflicts}`);
    }
    lines.push('');
  }

  // Insights
  if (insights.length > 0) {
    lines.push('── INSIGHTS EXTRACTED ─────────────────────────────────────');
    for (const insight of insights) {
      lines.push(`   💡 ${insight.description}`);
      if (insight.suggestion) {
        lines.push(`      → ${insight.suggestion}`);
      }
    }
    lines.push('');
  }

  // Profile update confirmation
  lines.push('── PROFILE UPDATED ────────────────────────────────────────');
  const sessions = profile.stats?.sessions || 0;
  lines.push(`   Sessions completed: ${sessions}`);
  lines.push(`   Knowledge base growing...`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('*yawn* Until next time. φ remembers.');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// =============================================================================
// SAFE OUTPUT - Handle EPIPE errors gracefully
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
    // Read stdin - try sync first, fall back to async (ESM stdin fix)
    const fs = await import('fs');
    let input = '';

    try {
      input = fs.readFileSync(0, 'utf8');
      if (process.env.CYNIC_DEBUG) console.error('[DIGEST] Sync read:', input.length, 'bytes');
    } catch (syncErr) {
      if (process.env.CYNIC_DEBUG) console.error('[DIGEST] Sync failed:', syncErr.message);
      input = await new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(''));
        process.stdin.resume();
        setTimeout(() => resolve(data), 3000);
      });
      if (process.env.CYNIC_DEBUG) console.error('[DIGEST] Async read:', input.length, 'bytes');
    }

    let hookContext = {};
    try {
      hookContext = input ? JSON.parse(input) : {};
    } catch (e) {
      // Ignore parse errors
    }

    // Load optional modules
    const enforcer = getTaskEnforcer();
    const consciousness = getConsciousness();
    const voluntaryPoverty = getVoluntaryPoverty();
    const thermodynamics = getThermodynamics();
    const emergence = getEmergence();
    const physicsBridge = getPhysicsBridge();

    // Get session ID
    const sessionId = process.env.CYNIC_SESSION_ID || hookContext.session_id || 'default';

    // ==========================================================================
    // TASK CONTINUATION ENFORCER - Check before allowing stop
    // ==========================================================================
    if (enforcer) {
      const blockDecision = enforcer.shouldBlockStop(sessionId);

      if (blockDecision.block) {
        // Block the stop and inject continuation prompt
        safeOutput({
          continue: false,
          decision: 'block',
          reason: blockDecision.reason,
          message: blockDecision.injectPrompt,
        });
        return;
      }
    }

    // ==========================================================================
    // Normal digest flow - session is ending
    // ==========================================================================

    // Detect user and load profile
    const user = detectUser();
    const profile = loadUserProfile(user.userId);

    // Load collective patterns
    const collectivePatterns = loadCollectivePatterns();

    // Analyze session
    const analysis = analyzeSession(profile);

    // Extract insights
    const insights = extractInsights(profile, collectivePatterns);

    // Save insights to collective
    for (const insight of insights) {
      addCollectiveInsight({
        ...insight,
        userId: user.userId,
        project: detectEcosystem().currentProject?.name
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOTAL MEMORY: Store insights as memories and lessons
    // "φ remembers everything"
    // ═══════════════════════════════════════════════════════════════════════════
    const totalMemory = getTotalMemory();
    if (totalMemory && insights.length > 0) {
      try {
        await totalMemory.init();

        for (const insight of insights) {
          // Store recurring errors as lessons learned
          if (insight.type === 'recurring_error') {
            await totalMemory.rememberLesson(user.userId, {
              category: 'bug',
              mistake: insight.description,
              correction: insight.suggestion || 'Address the root cause',
              prevention: 'Monitor for this pattern',
              severity: 'medium',
            });
          }

          // Store other insights as key moments
          else {
            await totalMemory.rememberConversation(user.userId, 'insight', insight.description, {
              importance: 0.6,
              context: {
                type: insight.type,
                project: detectEcosystem().currentProject?.name,
              },
            });
          }
        }
      } catch (e) {
        // Total Memory storage failed - continue (non-critical)
        console.error('[CYNIC] Total Memory storage failed:', e.message);
      }
    }

    // Get final todo stats
    if (enforcer) {
      const incompleteTodos = enforcer.getIncompleteTodos(sessionId);
      const completionRate = enforcer.getCompletionRate(sessionId);

      // Add todo stats to analysis
      analysis.todosTotal = enforcer.loadTodos(sessionId).length;
      analysis.todosCompleted = analysis.todosTotal - incompleteTodos.length;
      analysis.completionRate = completionRate;
    }

    // Collect engine stats
    const engineStats = {};

    if (voluntaryPoverty) {
      try {
        const stats = voluntaryPoverty.getStats();
        if (stats.totalDeletions > 0) {
          engineStats.deletions = stats.totalDeletions;
        }
      } catch (e) { /* ignore */ }
    }

    if (thermodynamics) {
      try {
        const stats = thermodynamics.getStats();
        if (stats.efficiency) {
          engineStats.efficiency = stats.efficiency;
        }
      } catch (e) { /* ignore */ }
    }

    if (consciousness) {
      try {
        const snapshot = consciousness.getConsciousnessSnapshot();
        if (snapshot.consciousnessScore) {
          engineStats.consciousnessScore = Math.round(snapshot.consciousnessScore);
        }
      } catch (e) { /* ignore */ }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RELATIVITY: Multi-Perspective Session Evaluation
    // "Πάντα πρός τι - all things are relative"
    // ═══════════════════════════════════════════════════════════════════════════
    if (physicsBridge) {
      try {
        // Evaluate session from multiple stakeholder perspectives
        const sessionSummary = `Session with ${analysis.toolsUsed} tool calls, ${analysis.errorsEncountered} errors, completion rate ${Math.round((analysis.completionRate || 0) * 100)}%`;

        const evaluation = physicsBridge.evaluatePerspectives(
          sessionSummary,
          { toolsUsed: analysis.toolsUsed, errors: analysis.errorsEncountered },
          ['developer', 'futureYou', 'operator'] // Key perspectives for session review
        );

        if (evaluation.conflicts && evaluation.conflicts.length > 0) {
          // Record perspective conflicts as insights
          for (const conflict of evaluation.conflicts) {
            insights.push({
              type: 'perspective_conflict',
              description: conflict.description,
              suggestion: 'Consider balancing these viewpoints'
            });
          }
          engineStats.perspectiveConflicts = evaluation.conflicts.length;
        }

        // Get perspective suggestion for next session
        const suggestion = physicsBridge.suggestPerspective(sessionSummary);
        if (suggestion) {
          engineStats.perspectiveSuggestion = suggestion.suggestion?.name;
        }

        // Record physics stats
        const physicsStatus = physicsBridge.getPhysicsStatus();
        if (physicsStatus) {
          engineStats.physicsLoaded = Object.values(physicsStatus.loaded).filter(Boolean).length;
          if (physicsStatus.entanglement?.activePairs > 0) {
            engineStats.entangledPairs = physicsStatus.entanglement.activePairs;
          }
          if (physicsStatus.symmetry?.broken) {
            engineStats.activeDog = physicsStatus.symmetry.currentDog;
          }
        }
      } catch (e) {
        // Multi-perspective evaluation failed - continue without
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCE DETECTION (Phase 4): Track consciousness emergence
    // "φ distrusts φ" - Max 61.8%
    // ═══════════════════════════════════════════════════════════════════════════
    if (emergence) {
      try {
        const state = emergence.getConsciousnessState();
        engineStats.emergence = {
          score: state.score,
          maxScore: state.maxScore,
          status: state.status,
          bar: state.bar,
          emerged: state.emerged,
        };
      } catch (e) { /* ignore */ }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ORCHESTRATION: Full orchestration for session_end event (Phase 21)
    // Records session summary decision for tracing and learning
    // "Le chien rapporte la fin de session au cerveau collectif"
    // ═══════════════════════════════════════════════════════════════════════════
    let orchestration = null;
    try {
      orchestration = await orchestrateFull(
        `Session ended: ${analysis.toolsUsed} tools, ${analysis.errorsEncountered} errors, ${insights.length} insights`,
        {
          eventType: 'session_end',
          requestJudgment: analysis.errorsEncountered > 0,  // Judge sessions with errors
          metadata: {
            source: 'digest_hook',
            project: detectProject(),
            toolsUsed: analysis.toolsUsed,
            errorsEncountered: analysis.errorsEncountered,
            completionRate: analysis.completionRate,
            insightCount: insights.length,
          },
        }
      );
    } catch (e) {
      // Orchestration failed - continue without (non-critical)
      if (process.env.CYNIC_DEBUG) {
        console.error('[DIGEST] Orchestration failed:', e.message);
      }
    }

    // Format message
    const message = formatDigestMessage(profile, analysis, insights, engineStats);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 18: Emit session feedback for automation layer
    // "φ learns from every session"
    // ═══════════════════════════════════════════════════════════════════════════
    await emitSessionFeedback(user.userId, analysis, insights);

    // Cleanup enforcer data for this session
    if (enforcer) {
      enforcer.cleanupSession(sessionId);
    }

    // Send to MCP server (non-blocking) - include decision tracing
    sendHookToCollectiveSync('Stop', {
      userId: user.userId,
      toolsUsed: analysis.toolsUsed,
      errorsEncountered: analysis.errorsEncountered,
      topTools: analysis.topTools,
      insights: insights.map(i => ({ type: i.type, description: i.description })),
      timestamp: Date.now(),
      // Phase 21: Include orchestration tracing
      decisionId: orchestration?.decisionId,
      outcome: orchestration?.outcome,
      qScore: orchestration?.judgment?.qScore,
    });

    // Digest session insights to brain memory (non-blocking)
    if (insights.length > 0) {
      digestToBrain(
        `Session digest for ${user.name}:\n` +
        `- Tools: ${analysis.toolsUsed}\n` +
        `- Errors: ${analysis.errorsEncountered}\n` +
        `- Insights: ${insights.map(i => i.description).join('; ')}`,
        {
          source: 'digest_hook',
          type: 'session_summary',
          userId: user.userId,
        }
      ).catch(() => {
        // Silently ignore - digest is optional
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 16: Store session summary to PostgreSQL via brain tools
    // "φ remembers everything" - persistent memory across sessions
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      // Store session summary as memory
      await callBrainTool('brain_memory_store', {
        action: 'store',
        memoryType: 'summary',
        content: `Session completed: ${analysis.toolsUsed} tools, ${analysis.errorsEncountered} errors, ${Math.round((analysis.completionRate || 0) * 100)}% completion`,
        userId: user.userId,
        importance: 0.5 + (analysis.completionRate || 0) * 0.3, // Higher importance for better sessions
        context: {
          project: detectProject(),
          toolsUsed: analysis.toolsUsed,
          errorsEncountered: analysis.errorsEncountered,
          completionRate: analysis.completionRate,
          topTools: analysis.topTools,
        },
      }).catch(() => {});

      // Store lessons learned from errors
      for (const insight of insights.filter(i => i.type === 'recurring_error')) {
        await callBrainTool('brain_memory_store', {
          action: 'lesson',
          category: 'bug',
          mistake: insight.description,
          correction: insight.suggestion || 'Address the root cause',
          prevention: 'Monitor for this pattern',
          severity: 'medium',
          userId: user.userId,
        }).catch(() => {});
      }

      // Store key insights as memories
      for (const insight of insights.filter(i => i.type !== 'recurring_error').slice(0, 3)) {
        await callBrainTool('brain_memory_store', {
          action: 'store',
          memoryType: 'key_moment',
          content: insight.description,
          userId: user.userId,
          importance: 0.6,
          context: {
            type: insight.type,
            project: detectProject(),
          },
        }).catch(() => {});
      }
    } catch (e) {
      // Memory storage to PostgreSQL failed - continue (non-critical)
      if (process.env.CYNIC_DEBUG) {
        console.error('[DIGEST] Brain memory storage failed:', e.message);
      }
    }

    // Output directly to stdout for banner display (like awaken.cjs)
    console.log(message);

  } catch (error) {
    // Graceful exit even on error
    console.log('*yawn* Session complete. φ remembers.');
  }
}

main();
