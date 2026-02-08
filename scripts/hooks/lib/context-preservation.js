/**
 * CYNIC Context Preservation
 *
 * Cross-session persistence for high-value context items.
 * compact.js SAVES → file → awaken.js LOADS → boot context → LLM sees insights.
 *
 * Pattern: Same as symbiosis-cache.json — file-based, cross-process, TTL-bounded.
 *
 * @module scripts/hooks/lib/context-preservation
 */

'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';

const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;

const CONTEXT_DIR = path.join(os.homedir(), '.cynic', 'context');
const TOP_ITEMS_FILE = path.join(CONTEXT_DIR, 'top-items.json');

/** Max file size in bytes (10KB) */
const MAX_FILE_SIZE = 10 * 1024;

/** Max age in ms (7 days) */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Save top C-Score items to persistent file.
 *
 * @param {Array<{ content: string, cScore: number, category: string, timestamp: number }>} items
 */
export function saveTopItems(items) {
  try {
    if (!items || items.length === 0) return;

    // Ensure directory exists
    if (!fs.existsSync(CONTEXT_DIR)) {
      fs.mkdirSync(CONTEXT_DIR, { recursive: true });
    }

    // Truncate content to 200 chars, keep top 5
    const toSave = items.slice(0, 5).map(item => ({
      content: (item.content || '').slice(0, 200),
      cScore: item.cScore || 0,
      category: item.category || 'general',
      timestamp: item.timestamp || Date.now(),
    }));

    const data = {
      items: toSave,
      savedAt: Date.now(),
    };

    const serialized = JSON.stringify(data, null, 2);

    // Enforce max file size
    if (serialized.length > MAX_FILE_SIZE) {
      // Trim to fewer items until under limit
      while (data.items.length > 1 && JSON.stringify(data).length > MAX_FILE_SIZE) {
        data.items.pop();
      }
    }

    fs.writeFileSync(TOP_ITEMS_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Best-effort — don't crash the hook
  }
}

/**
 * Load saved top items with freshness decay.
 * Items older than 7 days are excluded.
 * Items between 3-7 days get C-Score * phi^-2 penalty.
 *
 * @returns {Array<{ content: string, cScore: number, category: string, timestamp: number, age: string }>}
 */
export function loadTopItems() {
  try {
    if (!fs.existsSync(TOP_ITEMS_FILE)) return [];

    const raw = fs.readFileSync(TOP_ITEMS_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (!data.items || !Array.isArray(data.items)) return [];

    const now = Date.now();
    const results = [];

    for (const item of data.items) {
      const age = now - (item.timestamp || 0);

      // Exclude items older than 7 days
      if (age > MAX_AGE_MS) continue;

      // Apply freshness decay for items > 3 days old
      let adjustedScore = item.cScore || 0;
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      if (age > THREE_DAYS) {
        adjustedScore = Math.round(adjustedScore * PHI_INV_2);
      }

      // Format age for display
      const ageHours = Math.round(age / (60 * 60 * 1000));
      const ageStr = ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`;

      results.push({
        content: item.content,
        cScore: adjustedScore,
        category: item.category,
        timestamp: item.timestamp,
        age: ageStr,
      });
    }

    // Sort by adjusted score descending
    return results.sort((a, b) => b.cScore - a.cScore);
  } catch {
    return [];
  }
}
