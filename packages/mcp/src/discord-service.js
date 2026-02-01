/**
 * Discord Notification Service
 *
 * Bridges CYNIC's internal notifications to Discord channels.
 * Supports both webhooks (simple) and bot API (advanced).
 *
 * "The dog howls to the pack" - κυνικός
 *
 * @module @cynic/mcp/discord-service
 */

'use strict';

import { createLogger, PHI_INV } from '@cynic/core';

const log = createLogger('DiscordService');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Discord embed colors (decimal format)
 */
const COLORS = {
  critical: 0xe74c3c, // Red
  high: 0xf39c12,     // Orange
  medium: 0xf1c40f,   // Yellow
  low: 0x27ae60,      // Green
  info: 0x3498db,     // Blue
  cynic: 0x9b59b6,    // Purple (CYNIC brand)
};

/**
 * Verdict colors
 */
const VERDICT_COLORS = {
  HOWL: 0x27ae60,  // Green - strong approval
  WAG: 0xf1c40f,   // Yellow - mild approval
  BARK: 0xf39c12,  // Orange - caution
  GROWL: 0xe74c3c, // Red - danger
};

/**
 * Notification type to emoji mapping
 */
const TYPE_EMOJI = {
  insight: '💡',
  warning: '⚠️',
  danger: '🚨',
  achievement: '🏆',
  pattern: '🔄',
  suggestion: '💭',
  learning: '🧠',
  question: '❓',
  judgment: '⚖️',
  success: '✅',
  session: '🐕',
};

// ═══════════════════════════════════════════════════════════════════════════
// DISCORD SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Discord Notification Service
 *
 * Provides integration with Discord for sending CYNIC notifications.
 * Supports webhooks (simple, no auth) and bot API (advanced features).
 *
 * @example
 * // Webhook mode (recommended for alerts)
 * const discord = new DiscordService({
 *   webhookUrl: process.env.DISCORD_WEBHOOK_URL,
 * });
 *
 * // Bot mode (for advanced features)
 * const discord = new DiscordService({
 *   botToken: process.env.DISCORD_BOT_TOKEN,
 *   channelId: process.env.DISCORD_CHANNEL_ID,
 * });
 */
export class DiscordService {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.webhookUrl] - Discord webhook URL (simple mode)
   * @param {string} [options.botToken] - Discord Bot Token (advanced mode)
   * @param {string} [options.channelId] - Default channel ID (bot mode only)
   * @param {string} [options.username] - Webhook username override
   * @param {string} [options.avatarUrl] - Webhook avatar URL
   * @param {boolean} [options.enabled] - Enable/disable notifications
   * @param {number} [options.rateLimit] - Max messages per minute (default: 30)
   */
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    this.botToken = options.botToken || process.env.DISCORD_BOT_TOKEN;
    this.channelId = options.channelId || process.env.DISCORD_CHANNEL_ID;
    this.username = options.username || 'CYNIC';
    this.avatarUrl = options.avatarUrl || 'https://i.imgur.com/cynic-dog.png'; // TODO: host avatar
    this.rateLimit = options.rateLimit || 30;

    // Determine mode
    this.mode = this.webhookUrl ? 'webhook' : (this.botToken ? 'bot' : 'disabled');
    this.enabled = options.enabled !== false && this.mode !== 'disabled';

    // Rate limiting
    this._sentThisMinute = 0;
    this._lastReset = Date.now();
    this._messageQueue = [];

    // Stats
    this._stats = {
      sent: 0,
      failed: 0,
      rateLimited: 0,
      queued: 0,
    };

    if (this.enabled) {
      log.info('Discord service initialized', { mode: this.mode });
    } else {
      log.warn('Discord service disabled (no webhook or bot token)');
    }
  }

  // =========================================================================
  // CORE API
  // =========================================================================

  /**
   * Send a notification to Discord
   *
   * @param {Object} notification - Notification data
   * @param {string} notification.type - Notification type
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} [notification.priority] - Priority level
   * @param {Object} [notification.context] - Additional context
   * @param {string} [notification.channelId] - Override channel (bot mode)
   * @returns {Promise<Object>} Result
   */
  async sendNotification(notification) {
    if (!this.enabled) {
      return { ok: false, error: 'discord_disabled' };
    }

    // Rate limiting
    this._checkRateLimit();
    if (this._sentThisMinute >= this.rateLimit) {
      this._stats.rateLimited++;
      this._messageQueue.push(notification);
      this._stats.queued = this._messageQueue.length;
      return { ok: false, error: 'rate_limited', queued: true };
    }

    const emoji = TYPE_EMOJI[notification.type] || '🐕';
    const color = COLORS[notification.priority] || COLORS.info;

    // Build Discord embed
    const embed = {
      title: `${emoji} ${notification.title}`,
      description: notification.message,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: `CYNIC | φ confidence max: ${(PHI_INV * 100).toFixed(1)}%`,
      },
    };

    // Add context fields
    if (notification.context && Object.keys(notification.context).length > 0) {
      embed.fields = Object.entries(notification.context)
        .slice(0, 25) // Discord limit
        .map(([name, value]) => ({
          name,
          value: String(value).slice(0, 1024),
          inline: true,
        }));
    }

    try {
      const result = this.mode === 'webhook'
        ? await this._sendWebhook({ embeds: [embed] })
        : await this._sendBot(notification.channelId, { embeds: [embed] });

      this._sentThisMinute++;
      this._stats.sent++;
      return result;

    } catch (error) {
      this._stats.failed++;
      log.error('Discord send failed', { error: error.message });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Send a CYNIC judgment result
   *
   * @param {Object} judgment - Judgment result
   * @param {string} [channelId] - Override channel
   * @returns {Promise<Object>} Result
   */
  async sendJudgment(judgment, channelId = null) {
    const verdictEmoji = {
      HOWL: '🐺',
      WAG: '🐕',
      BARK: '🐶',
      GROWL: '😠',
    };

    const embed = {
      title: `${verdictEmoji[judgment.verdict] || '⚖️'} CYNIC Verdict: ${judgment.verdict}`,
      description: judgment.summary || `Q-Score: ${(judgment.qScore * 100).toFixed(1)}%`,
      color: VERDICT_COLORS[judgment.verdict] || COLORS.info,
      fields: [
        {
          name: 'Q-Score',
          value: `${(judgment.qScore * 100).toFixed(1)}%`,
          inline: true,
        },
        {
          name: 'Confidence',
          value: `${((judgment.confidence || PHI_INV) * 100).toFixed(1)}%`,
          inline: true,
        },
        {
          name: 'Dimensions',
          value: `${judgment.dimensions?.length || 25}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'CYNIC Collective Judgment',
      },
    };

    return this._send({ embeds: [embed] }, channelId);
  }

  /**
   * Send a danger alert (Guardian detection)
   *
   * @param {Object} alert - Alert data
   * @returns {Promise<Object>} Result
   */
  async sendDangerAlert(alert) {
    const embed = {
      title: '🚨 GUARDIAN ALERT',
      description: alert.threat,
      color: COLORS.critical,
      fields: [
        {
          name: 'Action Taken',
          value: alert.action || 'Blocked',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: '🛡️ Guardian Dog | CYNIC Security',
      },
    };

    if (alert.context) {
      Object.entries(alert.context).slice(0, 5).forEach(([name, value]) => {
        embed.fields.push({ name, value: String(value), inline: true });
      });
    }

    return this._send({ embeds: [embed] });
  }

  /**
   * Send pattern detection notification
   *
   * @param {Object} pattern - Pattern data
   * @returns {Promise<Object>} Result
   */
  async sendPatternDetected(pattern) {
    const embed = {
      title: `🔄 Pattern: "${pattern.name}"`,
      description: pattern.recommendation || `Detected ${pattern.occurrences}x`,
      color: pattern.occurrences > 5 ? COLORS.medium : COLORS.low,
      fields: [
        {
          name: 'Occurrences',
          value: String(pattern.occurrences),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return this._send({ embeds: [embed] });
  }

  /**
   * Send session summary
   *
   * @param {Object} summary - Session summary
   * @returns {Promise<Object>} Result
   */
  async sendSessionSummary(summary) {
    const embed = {
      title: '🐕 CYNIC Session Summary',
      color: COLORS.cynic,
      fields: [
        {
          name: '⏱️ Duration',
          value: summary.duration || 'N/A',
          inline: true,
        },
        {
          name: '⚖️ Judgments',
          value: String(summary.judgmentCount || 0),
          inline: true,
        },
        {
          name: '🔄 Patterns',
          value: `+${summary.newPatterns || 0}`,
          inline: true,
        },
        {
          name: '⚡ Efficiency (η)',
          value: `${((summary.efficiency || 0) * 100).toFixed(1)}%`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'φ distrusts φ | Loyal to truth, not to comfort',
      },
    };

    if (summary.activeDogs?.length > 0) {
      embed.fields.push({
        name: '🐕 Active Dogs',
        value: summary.activeDogs.join(', '),
        inline: false,
      });
    }

    return this._send({ embeds: [embed] });
  }

  /**
   * Send a simple text message
   *
   * @param {string} content - Message content
   * @param {string} [channelId] - Override channel
   * @returns {Promise<Object>} Result
   */
  async sendMessage(content, channelId = null) {
    return this._send({ content }, channelId);
  }

  // =========================================================================
  // INTERNAL METHODS
  // =========================================================================

  /**
   * Send via appropriate method
   * @private
   */
  async _send(payload, channelId = null) {
    if (!this.enabled) {
      return { ok: false, error: 'discord_disabled' };
    }

    this._checkRateLimit();
    if (this._sentThisMinute >= this.rateLimit) {
      this._stats.rateLimited++;
      return { ok: false, error: 'rate_limited' };
    }

    try {
      const result = this.mode === 'webhook'
        ? await this._sendWebhook(payload)
        : await this._sendBot(channelId, payload);

      this._sentThisMinute++;
      this._stats.sent++;
      return result;
    } catch (error) {
      this._stats.failed++;
      throw error;
    }
  }

  /**
   * Send via webhook
   * @private
   */
  async _sendWebhook(payload) {
    const body = {
      username: this.username,
      avatar_url: this.avatarUrl,
      ...payload,
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Discord webhooks return 204 No Content on success
    if (!response.ok && response.status !== 204) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Discord webhook error: ${response.status} - ${error}`);
    }

    return { ok: true, mode: 'webhook' };
  }

  /**
   * Send via bot API
   * @private
   */
  async _sendBot(channelId, payload) {
    const channel = channelId || this.channelId;
    if (!channel) {
      throw new Error('No channel ID specified');
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${channel}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${this.botToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Discord API error: ${error.message || response.status}`);
    }

    const data = await response.json();
    return { ok: true, mode: 'bot', messageId: data.id };
  }

  /**
   * Check and reset rate limit
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();
    if (now - this._lastReset >= 60000) {
      this._sentThisMinute = 0;
      this._lastReset = now;
      this._processQueue();
    }
  }

  /**
   * Process queued messages
   * @private
   */
  async _processQueue() {
    const toProcess = this._messageQueue.splice(0, this.rateLimit);
    for (const notification of toProcess) {
      await this.sendNotification(notification);
    }
    this._stats.queued = this._messageQueue.length;
  }

  // =========================================================================
  // STATS & HEALTH
  // =========================================================================

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this._stats,
      enabled: this.enabled,
      mode: this.mode,
      rateLimit: this.rateLimit,
      sentThisMinute: this._sentThisMinute,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.enabled) return false;

    // For webhooks, just check if URL is set
    if (this.mode === 'webhook') {
      return !!this.webhookUrl;
    }

    // For bot, check API
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { 'Authorization': `Bot ${this.botToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a Discord service instance
 */
export function createDiscordService(options = {}) {
  return new DiscordService(options);
}

export default DiscordService;
