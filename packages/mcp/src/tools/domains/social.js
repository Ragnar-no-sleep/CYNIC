/**
 * Social Domain Tools
 *
 * MCP tools for X/Twitter vision:
 * - brain_x_feed: View captured feed/timeline
 * - brain_x_search: Search captured tweets (FTS + vector)
 * - brain_x_analyze: Analyze tweet/thread with CYNIC judgment
 * - brain_x_trends: View trending topics
 * - brain_x_sync: Selective sync to cloud (privacy control)
 *
 * PRIVACY BY DESIGN:
 * - All data comes from LOCAL SQLite first (LocalXStore)
 * - Cloud data (PostgreSQL) is optional and requires explicit action
 * - User controls what syncs via brain_x_sync
 *
 * "Your data, your device, your choice" - κυνικός
 *
 * @module @cynic/mcp/tools/domains/social
 */

'use strict';

import { createLogger, PHI_INV } from '@cynic/core';

const log = createLogger('SocialTools');

// φ constants
const PHI_FTS = 0.382;
const PHI_VECTOR = 0.618;
const MAX_CONFIDENCE = PHI_INV; // 0.618 - never claim certainty

/**
 * Create X feed tool
 * @param {Object} localXStore - LocalXStore instance (PRIMARY - local SQLite)
 * @param {Object} [xRepository] - XDataRepository instance (OPTIONAL - cloud PostgreSQL)
 * @returns {Object} Tool definition
 */
export function createXFeedTool(localXStore, xRepository) {
  return {
    name: 'brain_x_feed',
    description: `View captured X/Twitter feed. Data is LOCAL by default (privacy-first).
Actions: recent (latest captured), feed (custom feed), user (user timeline), thread (conversation)
Add includeCloud:true to also query cloud data if synced.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['recent', 'feed', 'user', 'thread', 'stats'],
          description: 'Action: recent, feed, user, thread, or stats',
        },
        feedId: {
          type: 'string',
          description: 'Feed ID (for action: feed)',
        },
        username: {
          type: 'string',
          description: 'Twitter username without @ (for action: user)',
        },
        tweetId: {
          type: 'string',
          description: 'Tweet ID (for action: thread)',
        },
        conversationId: {
          type: 'string',
          description: 'Conversation ID (for action: thread)',
        },
        limit: {
          type: 'number',
          description: 'Maximum tweets to return (default: 20, max: 100)',
        },
        includeCloud: {
          type: 'boolean',
          description: 'Also include cloud data if available (default: false)',
        },
        includePrivate: {
          type: 'boolean',
          description: 'Include private/personal tweets (default: true)',
        },
      },
    },
    handler: async (params) => {
      const {
        action = 'recent',
        feedId,
        username,
        tweetId,
        conversationId,
        limit = 20,
        includeCloud = false,
        includePrivate = true,
      } = params;

      if (!localXStore) {
        return {
          success: false,
          error: 'Local X store not available.',
          message: '*head tilt* X vision not initialized. Local store missing.',
        };
      }

      try {
        let tweets = [];
        let source = 'local';

        switch (action) {
          case 'recent':
            tweets = localXStore.getRecentTweets({ limit, includePrivate });
            break;

          case 'feed':
            if (!feedId) {
              // List all feeds
              const feeds = localXStore.getFeeds();
              return {
                success: true,
                action: 'list_feeds',
                feeds: feeds.map(f => ({
                  id: f.id,
                  name: f.name,
                  description: f.description,
                  syncStatus: f.sync_status,
                })),
                count: feeds.length,
                source: 'local',
              };
            }
            tweets = localXStore.getFeedTweets(parseInt(feedId), { limit });
            break;

          case 'user':
            if (!username) {
              return { success: false, error: 'Username required for user action' };
            }
            const user = localXStore.findUserByUsername(username);
            if (!user) {
              return {
                success: false,
                error: `User @${username} not found in local store`,
                message: '*sniff* User not captured yet. Browse their profile with proxy enabled.',
              };
            }
            tweets = localXStore.getTweetsByUser(user.x_user_id, { limit });
            break;

          case 'thread':
            const threadId = conversationId || tweetId;
            if (!threadId) {
              return { success: false, error: 'tweetId or conversationId required for thread action' };
            }
            tweets = localXStore.getTweetThread(threadId);
            break;

          case 'stats':
            const stats = localXStore.getStats();
            return {
              success: true,
              action: 'stats',
              stats: {
                ...stats,
                privacyNote: 'All data is stored locally by default. Use brain_x_sync to share specific items.',
              },
              source: 'local',
            };

          default:
            return { success: false, error: `Unknown action: ${action}` };
        }

        // Optionally merge cloud data
        if (includeCloud && xRepository && action === 'recent') {
          try {
            const cloudTweets = await xRepository.getRecentTweets({ limit });
            const cloudIds = new Set(cloudTweets.map(t => t.tweet_id));
            const localOnly = tweets.filter(t => !cloudIds.has(t.tweet_id));
            tweets = [...cloudTweets, ...localOnly].slice(0, limit);
            source = 'local+cloud';
          } catch (e) {
            log.debug('Cloud query failed, using local only', { error: e.message });
          }
        }

        return {
          success: true,
          action,
          tweets: tweets.map(formatTweet),
          count: tweets.length,
          source,
          privacy: {
            localOnly: !includeCloud,
            message: includeCloud
              ? 'Includes synced cloud data'
              : 'Local data only (privacy-first)',
          },
        };

      } catch (err) {
        log.error('X feed error', { error: err.message });
        return {
          success: false,
          error: err.message,
          message: `*GROWL* Feed error: ${err.message}`,
        };
      }
    },
  };
}

/**
 * Create X search tool
 * @param {Object} localXStore - LocalXStore instance
 * @param {Object} [xRepository] - XDataRepository instance
 * @param {Object} [judge] - CYNICJudge instance
 * @returns {Object} Tool definition
 */
export function createXSearchTool(localXStore, xRepository, judge) {
  return {
    name: 'brain_x_search',
    description: `Search captured tweets. Searches LOCAL data by default (privacy-first).
Supports text search with optional filters.
Add includeCloud:true for hybrid local+cloud search.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (required)',
        },
        username: {
          type: 'string',
          description: 'Filter by username',
        },
        hashtag: {
          type: 'string',
          description: 'Filter by hashtag',
        },
        minEngagement: {
          type: 'number',
          description: 'Minimum engagement (likes + retweets)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 20)',
        },
        includeCloud: {
          type: 'boolean',
          description: 'Also search cloud data (default: false)',
        },
        includePrivate: {
          type: 'boolean',
          description: 'Include private tweets (default: true)',
        },
      },
      required: ['query'],
    },
    handler: async (params) => {
      const {
        query,
        username,
        hashtag,
        minEngagement,
        limit = 20,
        includeCloud = false,
        includePrivate = true,
      } = params;

      if (!localXStore) {
        return {
          success: false,
          error: 'Local X store not available.',
        };
      }

      try {
        // Search local first
        let tweets = localXStore.searchTweets(query, {
          username,
          limit: limit * 2, // Get more to filter
          includePrivate,
        });

        // Filter by hashtag if specified
        if (hashtag) {
          const tag = hashtag.replace('#', '').toLowerCase();
          tweets = tweets.filter(t =>
            t.hashtags?.some(h => h.toLowerCase() === tag),
          );
        }

        // Filter by engagement if specified
        if (minEngagement) {
          tweets = tweets.filter(t =>
            (t.like_count || 0) + (t.retweet_count || 0) >= minEngagement,
          );
        }

        let source = 'local';

        // Optionally include cloud results
        if (includeCloud && xRepository) {
          try {
            const cloudResults = await xRepository.searchTweets(query, {
              username,
              limit,
            });
            const localIds = new Set(tweets.map(t => t.tweet_id));
            const newFromCloud = cloudResults.filter(t => !localIds.has(t.tweet_id));
            tweets = [...tweets, ...newFromCloud];
            source = 'local+cloud';
          } catch (e) {
            log.debug('Cloud search failed', { error: e.message });
          }
        }

        // Sort by relevance (simple: engagement-based)
        tweets.sort((a, b) => {
          const engA = (a.like_count || 0) + (a.retweet_count || 0) * 2;
          const engB = (b.like_count || 0) + (b.retweet_count || 0) * 2;
          return engB - engA;
        });

        tweets = tweets.slice(0, limit);

        return {
          success: true,
          query,
          results: tweets.map(formatTweet),
          count: tweets.length,
          source,
          privacy: {
            localOnly: !includeCloud,
            message: includeCloud
              ? 'Searched local + cloud'
              : 'Searched local only (privacy-first)',
          },
        };

      } catch (err) {
        log.error('X search error', { error: err.message });
        return {
          success: false,
          error: err.message,
        };
      }
    },
  };
}

/**
 * Create X analyze tool
 * @param {Object} localXStore - LocalXStore instance
 * @param {Object} [judge] - CYNICJudge instance
 * @returns {Object} Tool definition
 */
export function createXAnalyzeTool(localXStore, judge) {
  return {
    name: 'brain_x_analyze',
    description: 'Analyze a tweet or thread with CYNIC 25-dimension judgment. Works on LOCAL data.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetId: {
          type: 'string',
          description: 'Tweet ID to analyze',
        },
        content: {
          type: 'string',
          description: 'Or provide raw content to analyze',
        },
        includeReplies: {
          type: 'boolean',
          description: 'Include thread/replies in analysis (default: false)',
        },
      },
    },
    handler: async (params) => {
      const { tweetId, content, includeReplies = false } = params;

      if (!tweetId && !content) {
        return { success: false, error: 'Provide either tweetId or content' };
      }

      if (!judge) {
        return { success: false, error: 'CYNIC Judge not available' };
      }

      try {
        let textToAnalyze = content;
        let tweet = null;

        // Get tweet from local store
        if (tweetId && localXStore) {
          const tweets = localXStore.searchTweets(tweetId, { limit: 1 });
          if (tweets.length > 0) {
            tweet = tweets[0];
            textToAnalyze = tweet.text;

            // Include thread if requested
            if (includeReplies && tweet.conversation_id) {
              const thread = localXStore.getTweetThread(tweet.conversation_id);
              textToAnalyze = thread.map(t => `@${t.username}: ${t.text}`).join('\n\n');
            }
          }
        }

        if (!textToAnalyze) {
          return { success: false, error: 'Tweet not found in local store' };
        }

        // Run CYNIC judgment (FIX J1: Use judgeAsync for engine consultation)
        const judgment = await judge.judgeAsync({
          type: 'social_content',
          content: textToAnalyze,
          source: tweet ? `@${tweet.username}` : 'user_provided',
          meta: tweet ? {
            engagement: (tweet.like_count || 0) + (tweet.retweet_count || 0),
            isThread: includeReplies,
          } : {},
        }, {}, { consultEngines: true, maxEngines: 3 });

        return {
          success: true,
          analysis: {
            qScore: judgment.qScore,
            verdict: judgment.verdict,
            confidence: Math.min(judgment.confidence || 0.5, MAX_CONFIDENCE),
            dimensions: judgment.dimensionScores,
            summary: judgment.summary || generateSummary(judgment),
          },
          tweet: tweet ? formatTweet(tweet) : null,
          source: 'local',
        };

      } catch (err) {
        log.error('X analyze error', { error: err.message });
        return {
          success: false,
          error: err.message,
        };
      }
    },
  };
}

/**
 * Create X trends tool
 * @param {Object} localXStore - LocalXStore instance
 * @param {Object} [xRepository] - XDataRepository instance
 * @returns {Object} Tool definition
 */
export function createXTrendsTool(localXStore, xRepository) {
  return {
    name: 'brain_x_trends',
    description: 'View trending topics from captured X data. LOCAL data by default.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        limit: {
          type: 'number',
          description: 'Maximum trends to return (default: 10)',
        },
        includeCloud: {
          type: 'boolean',
          description: 'Include cloud trends (default: false)',
        },
      },
    },
    handler: async (params) => {
      const { category, limit = 10, includeCloud = false } = params;

      if (!localXStore) {
        return { success: false, error: 'Local X store not available' };
      }

      try {
        let trends = localXStore.getRecentTrends(limit * 2);

        // Filter by category if specified
        if (category) {
          trends = trends.filter(t => t.category === category);
        }

        let source = 'local';

        // Optionally include cloud trends
        if (includeCloud && xRepository) {
          try {
            const cloudTrends = await xRepository.getTrendingTopics(limit);
            const localNames = new Set(trends.map(t => t.name.toLowerCase()));
            const newFromCloud = cloudTrends.filter(t =>
              !localNames.has(t.name.toLowerCase()),
            );
            trends = [...trends, ...newFromCloud];
            source = 'local+cloud';
          } catch (e) {
            log.debug('Cloud trends failed', { error: e.message });
          }
        }

        trends = trends.slice(0, limit);

        return {
          success: true,
          trends: trends.map(t => ({
            name: t.name,
            tweetCount: t.tweet_count,
            category: t.category,
            capturedAt: t.captured_at,
            syncStatus: t.sync_status,
          })),
          count: trends.length,
          source,
          privacy: {
            localOnly: !includeCloud,
          },
        };

      } catch (err) {
        log.error('X trends error', { error: err.message });
        return {
          success: false,
          error: err.message,
        };
      }
    },
  };
}

/**
 * Create X sync tool (privacy control)
 * @param {Object} localXStore - LocalXStore instance
 * @param {Object} xRepository - XDataRepository instance
 * @returns {Object} Tool definition
 */
export function createXSyncTool(localXStore, xRepository) {
  return {
    name: 'brain_x_sync',
    description: `Control what X data syncs to cloud. Privacy-first: only sync what you choose.
Actions: status (view sync status), mark (mark items for sync), sync (execute sync), never (mark as never sync)`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'mark', 'sync', 'never', 'history'],
          description: 'Sync action',
        },
        entityType: {
          type: 'string',
          enum: ['tweet', 'user', 'feed', 'trend'],
          description: 'Type of entity to sync',
        },
        entityIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of entities to sync/mark',
        },
        query: {
          type: 'string',
          description: 'Query to find entities (alternative to entityIds)',
        },
      },
    },
    handler: async (params) => {
      const { action = 'status', entityType, entityIds, query } = params;

      if (!localXStore) {
        return { success: false, error: 'Local X store not available' };
      }

      try {
        switch (action) {
          case 'status': {
            const stats = localXStore.getStats();
            return {
              success: true,
              action: 'status',
              stats: {
                tweets: stats.tweets,
                users: stats.users,
                trends: stats.trends,
                feeds: stats.feeds,
                bySyncStatus: stats.syncStats,
                privateTweets: stats.privateTweets,
              },
              privacy: {
                message: 'Local data stays private unless you explicitly sync it.',
                cloudAvailable: !!xRepository,
              },
            };
          }

          case 'mark': {
            if (!entityType || (!entityIds && !query)) {
              return { success: false, error: 'entityType and (entityIds or query) required' };
            }

            let ids = entityIds;
            if (query && !ids) {
              // Find entities by query
              if (entityType === 'tweet') {
                const tweets = localXStore.searchTweets(query, { limit: 100 });
                ids = tweets.map(t => t.tweet_id);
              }
            }

            if (!ids || ids.length === 0) {
              return { success: false, error: 'No entities found to mark' };
            }

            localXStore.markForSync(entityType, ids, 'pending');
            return {
              success: true,
              action: 'mark',
              marked: ids.length,
              entityType,
              message: `Marked ${ids.length} ${entityType}(s) for sync. Run action:sync to upload.`,
            };
          }

          case 'sync': {
            if (!xRepository) {
              return {
                success: false,
                error: 'Cloud repository not available. Check database connection.',
              };
            }

            const pending = {
              tweets: localXStore.getPendingSync('tweet'),
              users: localXStore.getPendingSync('user'),
              trends: localXStore.getPendingSync('trend'),
            };

            const synced = { tweets: 0, users: 0, trends: 0 };

            // Sync users first
            for (const user of pending.users) {
              try {
                await xRepository.upsertUser(user);
                localXStore.markSynced('user', [user.x_user_id]);
                localXStore.logSync('user', user.x_user_id, 'sync');
                synced.users++;
              } catch (e) {
                log.debug('User sync failed', { error: e.message });
              }
            }

            // Sync tweets
            for (const tweet of pending.tweets) {
              try {
                await xRepository.createTweet(tweet);
                localXStore.markSynced('tweet', [tweet.tweet_id]);
                localXStore.logSync('tweet', tweet.tweet_id, 'sync');
                synced.tweets++;
              } catch (e) {
                log.debug('Tweet sync failed', { error: e.message });
              }
            }

            // Sync trends
            for (const trend of pending.trends) {
              try {
                await xRepository.upsertTrend(trend);
                localXStore.markSynced('trend', [trend.id.toString()]);
                synced.trends++;
              } catch (e) {
                log.debug('Trend sync failed', { error: e.message });
              }
            }

            return {
              success: true,
              action: 'sync',
              synced,
              message: `Synced ${synced.tweets} tweets, ${synced.users} users, ${synced.trends} trends to cloud.`,
            };
          }

          case 'never': {
            if (!entityType || !entityIds) {
              return { success: false, error: 'entityType and entityIds required' };
            }

            localXStore.markNeverSync(entityType, entityIds);
            return {
              success: true,
              action: 'never',
              marked: entityIds.length,
              message: `${entityIds.length} ${entityType}(s) marked as NEVER sync. They will stay local forever.`,
            };
          }

          case 'history': {
            if (!entityType || !entityIds?.[0]) {
              return { success: false, error: 'entityType and entityId required' };
            }
            const history = localXStore.getSyncHistory(entityType, entityIds[0]);
            return {
              success: true,
              action: 'history',
              entityType,
              entityId: entityIds[0],
              history,
            };
          }

          default:
            return { success: false, error: `Unknown action: ${action}` };
        }

      } catch (err) {
        log.error('X sync error', { error: err.message });
        return {
          success: false,
          error: err.message,
        };
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format tweet for response
 * @param {Object} t - Tweet object
 * @returns {Object} Formatted tweet
 */
function formatTweet(t) {
  const media = Array.isArray(t.media) ? t.media : [];
  return {
    id: t.tweet_id,
    text: t.text?.slice(0, 280),
    author: {
      username: t.username,
      displayName: t.display_name,
    },
    engagement: {
      likes: t.like_count || 0,
      retweets: t.retweet_count || 0,
      replies: t.reply_count || 0,
      views: t.view_count || 0,
    },
    createdAt: t.created_at,
    capturedAt: t.captured_at,
    hasMedia: media.length > 0,
    hashtags: t.hashtags || [],
    isPrivate: !!t.is_private,
    isMyTweet: !!t.is_my_tweet,
    syncStatus: t.sync_status || 'local',
  };
}

/**
 * Generate summary from judgment
 * @param {Object} judgment
 * @returns {string}
 */
function generateSummary(judgment) {
  const verdict = judgment.verdict || 'BARK';
  const score = judgment.qScore || 50;

  if (verdict === 'HOWL') {
    return `*tail wag* Excellent content (Q-Score: ${score}/100). High quality signal.`;
  } else if (verdict === 'WAG') {
    return `*ears perk* Good content (Q-Score: ${score}/100). Worth attention.`;
  } else if (verdict === 'GROWL') {
    return `*sniff* Questionable content (Q-Score: ${score}/100). Low signal.`;
  } else {
    return `Content analyzed (Q-Score: ${score}/100).`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Social tools factory
 */
export const socialFactory = {
  name: 'social',
  domain: 'social',
  requires: ['localXStore'], // Changed from xRepository to localXStore

  /**
   * Create all social tools
   * @param {Object} options
   * @returns {Array} Tool definitions
   */
  create(options) {
    const { localXStore, xRepository, judge } = options;

    // Require local store for privacy-first design
    if (!localXStore) {
      log.debug('Social tools skipped: localXStore not available');
      return [];
    }

    return [
      createXFeedTool(localXStore, xRepository),
      createXSearchTool(localXStore, xRepository, judge),
      createXAnalyzeTool(localXStore, judge),
      createXTrendsTool(localXStore, xRepository),
      createXSyncTool(localXStore, xRepository),
    ];
  },
};

export default socialFactory;
