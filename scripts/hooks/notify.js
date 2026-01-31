#!/usr/bin/env node
/**
 * CYNIC Notify Hook - Notification
 *
 * "Le chien alerte" - CYNIC receives and processes notifications
 *
 * This hook runs when Claude receives notifications (errors, warnings, etc).
 * It tracks notification patterns and can escalate to the human.
 *
 * @event Notification
 * @behavior non-blocking (logs and tracks)
 */

'use strict';

import path from 'path';
import fs from 'fs';

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
// NOTIFICATION CLASSIFICATION
// =============================================================================

const NOTIFICATION_TYPES = {
  // Errors
  error: { severity: 'high', category: 'error', icon: '🔴' },
  warning: { severity: 'medium', category: 'warning', icon: '⚠️' },

  // Information
  info: { severity: 'low', category: 'info', icon: 'ℹ️' },
  success: { severity: 'low', category: 'success', icon: '✅' },

  // Progress
  progress: { severity: 'low', category: 'progress', icon: '🔄' },
  complete: { severity: 'low', category: 'complete', icon: '✔️' },

  // System
  system: { severity: 'medium', category: 'system', icon: '⚙️' },
  timeout: { severity: 'high', category: 'timeout', icon: '⏱️' },

  // Security
  security: { severity: 'critical', category: 'security', icon: '🛡️' },
  blocked: { severity: 'high', category: 'blocked', icon: '🚫' },
};

/**
 * Classify notification by content analysis
 */
function classifyNotification(notification) {
  const message = (notification.message || notification.title || '').toLowerCase();
  const type = notification.type?.toLowerCase() || 'info';

  // Check explicit type first
  if (NOTIFICATION_TYPES[type]) {
    return {
      ...NOTIFICATION_TYPES[type],
      type,
      matchedBy: 'explicit_type',
    };
  }

  // Content-based classification
  if (message.includes('error') || message.includes('failed') || message.includes('exception')) {
    return { ...NOTIFICATION_TYPES.error, type: 'error', matchedBy: 'content' };
  }
  if (message.includes('warning') || message.includes('deprecated') || message.includes('caution')) {
    return { ...NOTIFICATION_TYPES.warning, type: 'warning', matchedBy: 'content' };
  }
  if (message.includes('success') || message.includes('completed') || message.includes('done')) {
    return { ...NOTIFICATION_TYPES.success, type: 'success', matchedBy: 'content' };
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return { ...NOTIFICATION_TYPES.timeout, type: 'timeout', matchedBy: 'content' };
  }
  if (message.includes('security') || message.includes('vulnerability') || message.includes('unsafe')) {
    return { ...NOTIFICATION_TYPES.security, type: 'security', matchedBy: 'content' };
  }
  if (message.includes('blocked') || message.includes('denied') || message.includes('forbidden')) {
    return { ...NOTIFICATION_TYPES.blocked, type: 'blocked', matchedBy: 'content' };
  }
  if (message.includes('progress') || message.includes('loading') || message.includes('processing')) {
    return { ...NOTIFICATION_TYPES.progress, type: 'progress', matchedBy: 'content' };
  }

  // Default to info
  return { ...NOTIFICATION_TYPES.info, type: 'info', matchedBy: 'default' };
}

// =============================================================================
// NOTIFICATION TRACKING
// =============================================================================

// Track notification frequency for pattern detection
const notificationState = {
  recentNotifications: [],
  windowMs: 5 * 60 * 1000, // 5 minute window
  burstThreshold: 5, // 5 notifications of same type = burst
};

/**
 * Detect notification bursts (same type repeatedly)
 */
function detectBurst(classification) {
  const now = Date.now();

  // Add current notification
  notificationState.recentNotifications.push({
    type: classification.type,
    category: classification.category,
    timestamp: now,
  });

  // Prune old notifications
  notificationState.recentNotifications = notificationState.recentNotifications.filter(
    n => now - n.timestamp < notificationState.windowMs
  );

  // Check for burst
  const sameType = notificationState.recentNotifications.filter(
    n => n.type === classification.type
  );

  if (sameType.length >= notificationState.burstThreshold) {
    return {
      detected: true,
      type: classification.type,
      count: sameType.length,
      message: `Notification burst: ${classification.type} (${sameType.length}x in ${Math.round(notificationState.windowMs / 60000)} min)`,
    };
  }

  return { detected: false };
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
    const fs = await import('fs');
    let input = '';

    try {
      input = fs.readFileSync(0, 'utf8');
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
    const notification = {
      type: hookContext.notification_type || hookContext.type || 'info',
      title: hookContext.title || '',
      message: hookContext.message || hookContext.content || '',
      source: hookContext.source || 'unknown',
      timestamp: hookContext.timestamp || Date.now(),
    };

    // Detect user
    const user = detectUser();

    // Classify notification
    const classification = classifyNotification(notification);

    // Detect burst pattern
    const burst = detectBurst(classification);

    // Record pattern
    const sessionState = getSessionState();
    const pattern = {
      type: 'notification',
      signature: `notification_${classification.type}`,
      description: `${classification.category} notification: ${notification.title || notification.message?.substring(0, 50)}`,
      context: {
        category: classification.category,
        severity: classification.severity,
        source: notification.source,
      },
    };
    saveCollectivePattern(pattern);
    if (sessionState.isInitialized()) {
      sessionState.recordPattern(pattern);
    }

    // Send to collective (async)
    sendHookToCollectiveSync('Notification', {
      classification,
      notification: {
        type: notification.type,
        title: notification.title,
        source: notification.source,
      },
      burst: burst.detected ? burst : null,
      timestamp: Date.now(),
    });

    // Store to brain notifications (async)
    if (classification.severity === 'high' || classification.severity === 'critical') {
      callBrainTool('brain_notifications', {
        action: 'create',
        userId: user.userId,
        title: notification.title || `${classification.type} notification`,
        message: notification.message,
        notificationType: classification.category,
        priority: classification.severity === 'critical' ? 'urgent' : 'high',
        source: 'notification_hook',
      }).catch(() => {});
    }

    // Build output
    const output = {
      continue: true,
      classification: {
        type: classification.type,
        category: classification.category,
        severity: classification.severity,
        icon: classification.icon,
      },
      burst: burst.detected ? burst : null,
      timestamp: new Date().toISOString(),
    };

    // Show message for high severity or bursts
    if (classification.severity === 'high' || classification.severity === 'critical' || burst.detected) {
      const icon = classification.icon;
      const burstNote = burst.detected ? `\n   ⚠️ ${burst.message}` : '';
      output.message = `\n── ${icon} NOTIFICATION ────────────────────────────────────────\n   ${classification.type.toUpperCase()}: ${notification.title || notification.message?.substring(0, 60)}${burstNote}\n`;
    }

    safeOutput(output);

  } catch (error) {
    // Notification hook must never fail - silent continuation
    safeOutput({ continue: true });
  }
}

main();
