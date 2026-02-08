/**
 * CYNIC Consciousness Read-Back
 *
 * File-based cross-process persistence for consciousness state.
 * observe.js WRITES → file → perceive.js READS → framing directive → LLM sees history.
 *
 * Pattern: Same as Thompson state persistence (commit 56a63dd).
 *
 * @module scripts/hooks/lib/consciousness-readback
 */

'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';

const PHI_INV = 0.618033988749895;

const READBACK_DIR = path.join(os.homedir(), '.cynic', 'consciousness');
const READBACK_FILE = path.join(READBACK_DIR, 'readback.json');

/**
 * Load consciousness state from persistent file.
 * Returns null if file doesn't exist or is stale (> 24h).
 *
 * @returns {{ lastECE: number|null, driftDetected: boolean, lastSelfJudgmentScore: number|null, trend: string, timestamp: number }|null}
 */
export function loadConsciousnessState() {
  try {
    if (!fs.existsSync(READBACK_FILE)) return null;

    const raw = fs.readFileSync(READBACK_FILE, 'utf8');
    const data = JSON.parse(raw);

    // Staleness: ignore data older than 24h
    const age = Date.now() - (data.timestamp || 0);
    if (age > 24 * 60 * 60 * 1000) return null;

    return {
      lastECE: data.lastECE ?? null,
      driftDetected: data.driftDetected ?? false,
      lastSelfJudgmentScore: data.lastSelfJudgmentScore ?? null,
      trend: data.trend ?? 'stable',
      timestamp: data.timestamp || 0,
      sessionSelfJudgmentAvg: data.sessionSelfJudgmentAvg ?? null,
      calibrationFactor: data.calibrationFactor ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Save consciousness state to persistent file.
 * Merges with existing data (doesn't overwrite unrelated fields).
 *
 * @param {Object} update - Fields to update
 * @param {number} [update.lastSelfJudgmentScore] - Score from self-judgment (0-100)
 * @param {string} [update.filePath] - File that was self-modified
 * @param {number} [update.lastECE] - Expected Calibration Error
 * @param {boolean} [update.driftDetected] - Whether calibration drift was found
 * @param {string} [update.trend] - 'improving', 'declining', 'stable'
 * @param {number} [update.sessionSelfJudgmentAvg] - Session average score
 * @param {number} [update.calibrationFactor] - Current calibration factor
 */
export function saveConsciousnessState(update) {
  try {
    // Ensure directory exists
    if (!fs.existsSync(READBACK_DIR)) {
      fs.mkdirSync(READBACK_DIR, { recursive: true });
    }

    // Load existing state and merge
    let existing = {};
    try {
      if (fs.existsSync(READBACK_FILE)) {
        existing = JSON.parse(fs.readFileSync(READBACK_FILE, 'utf8'));
      }
    } catch {
      // Start fresh if corrupt
    }

    // Track self-judgment history (last 10)
    if (update.lastSelfJudgmentScore != null) {
      const history = existing.selfJudgmentHistory || [];
      history.push({
        score: update.lastSelfJudgmentScore,
        filePath: update.filePath || null,
        timestamp: Date.now(),
      });
      // Keep last 10
      existing.selfJudgmentHistory = history.slice(-10);

      // Compute trend from history
      if (history.length >= 3) {
        const recent = history.slice(-3).map(h => h.score);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const older = history.slice(-6, -3).map(h => h.score);
        if (older.length > 0) {
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          update.trend = avg > olderAvg + 5 ? 'improving' : (avg < olderAvg - 5 ? 'declining' : 'stable');
        }
      }
    }

    const merged = {
      ...existing,
      ...update,
      timestamp: Date.now(),
    };

    fs.writeFileSync(READBACK_FILE, JSON.stringify(merged, null, 2));
  } catch {
    // Best-effort persistence — don't crash the hook
  }
}
