/**
 * CYNIC Daemon — Digest Formatter
 *
 * Formats session digests as TUI banners and markdown files.
 * Ported from scripts/hooks/digest.js (lines 415-706) into daemon context.
 *
 * "Le chien digère" — CYNIC extracts knowledge from the session
 *
 * @module @cynic/node/daemon/digest-formatter
 */

'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════════
// TUI BANNER — Rich console output (stderr)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a rich digest banner for console/stderr output.
 *
 * @param {Object} digest - Digest data from buildSessionDigest()
 * @param {Object} [digest.identity] - Identity validation result
 * @param {Object} [digest.sessionStats] - CostLedger + ModelIntelligence stats
 * @param {Object} [digest.qLearning] - Q-Learning session stats
 * @param {Object} [digest.responseJudgment] - Response judgment (qScore, verdict, etc.)
 * @returns {string} Formatted banner string
 */
export function formatRichBanner(digest) {
  const lines = [];

  lines.push('');
  lines.push('\u2550'.repeat(59));
  lines.push('  CYNIC DIGESTING - Session Complete');
  lines.push('\u2550'.repeat(59));
  lines.push('');

  // Response judgment / identity compliance
  if (digest.identity) {
    const { valid, compliance, violations, warnings } = digest.identity;
    lines.push('\u2500\u2500 IDENTITY COMPLIANCE ' + '\u2500'.repeat(38));

    if (!valid && violations?.length > 0) {
      const violationSummary = violations.map(v => v.found || v.type).join(', ');
      const bar = makeBar(Math.max(0, (compliance || 0.5) * 100));
      lines.push(`   Q-Score: [${bar}] ${Math.round((compliance || 0.5) * 100)}%`);
      lines.push(`   Verdict: *growl* ${violations.length} violations`);
      lines.push(`   Issues: ${violationSummary}`);
    } else if (warnings?.length > 0) {
      const bar = makeBar(Math.round((compliance || 0.7) * 100));
      lines.push(`   Score: [${bar}] ${Math.round((compliance || 0.7) * 100)}%`);
      lines.push(`   Warnings: ${warnings.map(w => w.type).join(', ')}`);
    } else {
      const bar = makeBar(Math.round((compliance || 0.9) * 100));
      lines.push(`   Score: [${bar}] ${Math.round((compliance || 0.9) * 100)}% *tail wag*`);
    }
    lines.push('');
  }

  // Session cost summary
  if (digest.sessionStats?.cost) {
    const { operations, cost, durationMinutes } = digest.sessionStats.cost;
    if (operations > 0) {
      lines.push('\u2500\u2500 SESSION SUMMARY ' + '\u2500'.repeat(42));
      lines.push(`   Operations: ${operations}`);
      lines.push(`   Cost: $${cost.total.toFixed(4)}`);
      lines.push(`   Duration: ${durationMinutes}min`);

      if (cost.input > 0 || cost.output > 0) {
        lines.push(`   Tokens: ${formatTokens(cost.inputTokens)} in / ${formatTokens(cost.outputTokens)} out`);
      }
      lines.push('');
    }
  }

  // Model intelligence
  if (digest.sessionStats?.modelIntelligence) {
    const mi = digest.sessionStats.modelIntelligence;
    if (mi.selectionsTotal > 0) {
      lines.push('\u2500\u2500 MODEL INTELLIGENCE ' + '\u2500'.repeat(39));
      lines.push(`   Selections: ${mi.selectionsTotal} (${mi.downgrades} downgrades)`);
      if (mi.samplerMaturity) {
        lines.push(`   Thompson maturity: ${mi.samplerMaturity}`);
      }
      lines.push('');
    }
  }

  // Q-Learning
  if (digest.qLearning) {
    const ql = digest.qLearning;
    lines.push('\u2500\u2500 Q-LEARNING ' + '\u2500'.repeat(47));
    lines.push(`   States: ${ql.states || 0} | Episodes: ${ql.episodes || 0}`);
    if (ql.accuracy !== undefined) {
      lines.push(`   Accuracy: ${(ql.accuracy * 100).toFixed(1)}%`);
    }
    if (ql.flushed) {
      lines.push('   State flushed to disk');
    }
    lines.push('');
  }

  lines.push('\u2550'.repeat(59));
  lines.push('*yawn* Until next time. \u03C6 remembers.');
  lines.push('\u2550'.repeat(59));

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN EXPORT — Shareable .cynic/digests/*.md files
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format session digest as shareable markdown.
 *
 * @param {Object} digest - Digest data from buildSessionDigest()
 * @param {Object} [meta] - Additional metadata
 * @param {string} [meta.project] - Project name
 * @returns {string} Markdown formatted digest
 */
export function formatDigestMarkdown(digest, meta = {}) {
  const now = new Date();
  const ts = now.toISOString();
  const date = ts.slice(0, 10);
  const time = ts.slice(11, 19);

  const lines = [];

  // Header
  lines.push(`# CYNIC Session Digest - ${date}`);
  lines.push('');
  lines.push(`> *"Le chien dig\u00E8re"* \u2014 ${time} UTC`);
  lines.push('');

  // Identity
  if (digest.identity) {
    lines.push('## Identity Compliance');
    lines.push('');
    const { valid, compliance, violations, warnings } = digest.identity;
    const score = Math.round((compliance || 0) * 100);
    const bar = '\u2588'.repeat(Math.floor(score / 10)) + '\u2591'.repeat(10 - Math.floor(score / 10));

    lines.push(`**Score:** \`[${bar}]\` ${score}% | **Valid:** ${valid ? '\u2705' : '\u274C'}`);
    lines.push('');

    if (violations?.length > 0) {
      lines.push('Violations:');
      for (const v of violations) {
        lines.push(`- \uD83D\uDD34 ${v.type}: ${v.found || v.message || 'unknown'}`);
      }
      lines.push('');
    }

    if (warnings?.length > 0) {
      lines.push('Warnings:');
      for (const w of warnings) {
        lines.push(`- \u26A0\uFE0F ${w.type}: ${w.message || 'unknown'}`);
      }
      lines.push('');
    }
  }

  // Cost summary
  if (digest.sessionStats?.cost) {
    const { operations, cost, durationMinutes } = digest.sessionStats.cost;
    if (operations > 0) {
      lines.push('## Session Summary');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|------:|');
      lines.push(`| Operations | ${operations} |`);
      lines.push(`| Cost | $${cost.total.toFixed(4)} |`);
      lines.push(`| Duration | ${durationMinutes}min |`);
      if (cost.inputTokens) {
        lines.push(`| Input tokens | ${formatTokens(cost.inputTokens)} |`);
      }
      if (cost.outputTokens) {
        lines.push(`| Output tokens | ${formatTokens(cost.outputTokens)} |`);
      }
      lines.push('');
    }
  }

  // Model Intelligence
  if (digest.sessionStats?.modelIntelligence) {
    const mi = digest.sessionStats.modelIntelligence;
    if (mi.selectionsTotal > 0) {
      lines.push('## Model Intelligence');
      lines.push('');
      lines.push(`- **Selections:** ${mi.selectionsTotal}`);
      lines.push(`- **Downgrades:** ${mi.downgrades}`);
      if (mi.samplerMaturity) {
        lines.push(`- **Thompson maturity:** ${mi.samplerMaturity}`);
      }
      lines.push('');
    }
  }

  // Q-Learning
  if (digest.qLearning) {
    const ql = digest.qLearning;
    lines.push('## Q-Learning');
    lines.push('');
    lines.push(`- **States:** ${ql.states || 0}`);
    lines.push(`- **Episodes:** ${ql.episodes || 0}`);
    if (ql.accuracy !== undefined) {
      lines.push(`- **Accuracy:** ${(ql.accuracy * 100).toFixed(1)}%`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Digested by CYNIC (\u03BA\u03C5\u03BD\u03B9\u03BA\u03CC\u03C2) | \u03C6 max: ${Math.round(PHI_INV * 100)}%*`);

  return lines.join('\n');
}

/**
 * Save digest markdown to ~/.cynic/digests/ directory.
 *
 * @param {string} markdown - Formatted markdown content
 * @returns {string|null} File path if saved, null on error
 */
export function saveDigest(markdown) {
  try {
    const digestDir = path.join(os.homedir(), '.cynic', 'digests');

    // Ensure directory exists
    fs.mkdirSync(digestDir, { recursive: true });

    // Filename: YYYY-MM-DD-HHMMSS.md
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.md`;
    const filepath = path.join(digestDir, filename);

    fs.writeFileSync(filepath, markdown, 'utf-8');

    return filepath;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Make a 10-char progress bar.
 * @param {number} percent - 0-100
 * @returns {string}
 */
function makeBar(percent) {
  const filled = Math.min(10, Math.max(0, Math.floor(percent / 10)));
  return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
}

/**
 * Format token count for display (e.g., "12.3k").
 * @param {number} tokens
 * @returns {string}
 */
function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}
