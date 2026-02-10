/**
 * @cynic/core - Ecosystem Monitor Tests
 *
 * Tests ecosystem monitoring system:
 * - Source types and update types
 * - Source base class and rate limiting
 * - GitHubSource commit/release priority inference
 * - EcosystemMonitor registration and caching
 * - E-Score calculation from updates
 *
 * "Le chien qui surveille l'horizon" - Testing the watchdog
 *
 * @module @cynic/core/test/ecosystem
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ECOSYSTEM_CONSTANTS,
  SourceType,
  UpdateType,
  Priority,
  Source,
  GitHubSource,
  WebSearchSource,
  EcosystemMonitor,
  createSolanaMonitor,
  summarizeUpdates,
  calculateEScoreSignals,
  CultureSignals,
} from '../src/ecosystem/index.js';

import { PHI_INV, PHI_INV_2 } from '../src/axioms/constants.js';

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('ECOSYSTEM_CONSTANTS', () => {
  it('should have Fibonacci-aligned max items', () => {
    assert.strictEqual(ECOSYSTEM_CONSTANTS.MAX_ITEMS_PER_FETCH, 21);
  });

  it('should have phi-aligned cache TTL', () => {
    const expectedTTL = Math.round(1.618 * 60 * 60 * 1000);
    assert.strictEqual(ECOSYSTEM_CONSTANTS.CACHE_TTL, expectedTTL);
  });

  it('should have phi-inverse min fetch interval', () => {
    const expectedInterval = Math.round(PHI_INV * 60 * 60 * 1000);
    assert.strictEqual(ECOSYSTEM_CONSTANTS.MIN_FETCH_INTERVAL, expectedInterval);
  });

  it('should have phi-inverse-squared relevance decay', () => {
    assert.strictEqual(ECOSYSTEM_CONSTANTS.RELEVANCE_DECAY, PHI_INV_2);
  });

  it('should have Fibonacci max sources', () => {
    assert.strictEqual(ECOSYSTEM_CONSTANTS.MAX_SOURCES, 21); // F(8) — Solana + $asdfasdfa
  });
});

// =============================================================================
// SOURCE TYPES TESTS
// =============================================================================

describe('SourceType', () => {
  it('should define all source types', () => {
    assert.strictEqual(SourceType.GITHUB, 'GITHUB');
    assert.strictEqual(SourceType.TWITTER, 'TWITTER');
    assert.strictEqual(SourceType.WEB, 'WEB');
    assert.strictEqual(SourceType.RSS, 'RSS');
    assert.strictEqual(SourceType.DISCORD, 'DISCORD');
    assert.strictEqual(SourceType.CUSTOM, 'CUSTOM');
  });
});

describe('UpdateType', () => {
  it('should define all update types', () => {
    assert.strictEqual(UpdateType.COMMIT, 'COMMIT');
    assert.strictEqual(UpdateType.RELEASE, 'RELEASE');
    assert.strictEqual(UpdateType.ISSUE, 'ISSUE');
    assert.strictEqual(UpdateType.PR, 'PR');
    assert.strictEqual(UpdateType.ANNOUNCEMENT, 'ANNOUNCEMENT');
    assert.strictEqual(UpdateType.NEWS, 'NEWS');
    assert.strictEqual(UpdateType.MENTION, 'MENTION');
    assert.strictEqual(UpdateType.ALERT, 'ALERT');
  });
});

describe('Priority', () => {
  it('should define priority levels', () => {
    assert.strictEqual(Priority.CRITICAL, 'CRITICAL');
    assert.strictEqual(Priority.HIGH, 'HIGH');
    assert.strictEqual(Priority.MEDIUM, 'MEDIUM');
    assert.strictEqual(Priority.LOW, 'LOW');
    assert.strictEqual(Priority.INFO, 'INFO');
  });
});

// =============================================================================
// SOURCE BASE CLASS TESTS
// =============================================================================

describe('Source', () => {
  describe('Construction', () => {
    it('should create with default values', () => {
      const source = new Source({ name: 'Test Source' });

      assert.ok(source.id.startsWith('src_'));
      assert.strictEqual(source.name, 'Test Source');
      assert.strictEqual(source.type, SourceType.CUSTOM);
      assert.strictEqual(source.enabled, true);
      assert.strictEqual(source.priority, Priority.MEDIUM);
    });

    it('should create with custom config', () => {
      const source = new Source({
        id: 'custom_id',
        name: 'Custom',
        type: SourceType.GITHUB,
        enabled: false,
        priority: Priority.HIGH,
      });

      assert.strictEqual(source.id, 'custom_id');
      assert.strictEqual(source.type, SourceType.GITHUB);
      assert.strictEqual(source.enabled, false);
      assert.strictEqual(source.priority, Priority.HIGH);
    });

    it('should initialize tracking fields', () => {
      const source = new Source({ name: 'Test' });

      assert.strictEqual(source.lastFetch, null);
      assert.strictEqual(source.fetchCount, 0);
      assert.strictEqual(source.errorCount, 0);
      assert.deepStrictEqual(source.updates, []);
    });
  });

  describe('canFetch', () => {
    it('should return false if disabled', () => {
      const source = new Source({ name: 'Test', enabled: false });
      assert.strictEqual(source.canFetch(), false);
    });

    it('should return true if never fetched', () => {
      const source = new Source({ name: 'Test' });
      assert.strictEqual(source.canFetch(), true);
    });

    it('should respect rate limiting', () => {
      const source = new Source({ name: 'Test', minInterval: 100 });
      source.lastFetch = Date.now();

      assert.strictEqual(source.canFetch(), false);
    });

    it('should allow fetch after interval', async () => {
      const source = new Source({ name: 'Test', minInterval: 10 });
      source.lastFetch = Date.now() - 20;

      assert.strictEqual(source.canFetch(), true);
    });
  });

  describe('markFetched', () => {
    it('should update fetch tracking on success', () => {
      const source = new Source({ name: 'Test' });
      const updates = [{ id: '1' }, { id: '2' }];

      source.markFetched(updates);

      assert.ok(source.lastFetch > 0);
      assert.strictEqual(source.fetchCount, 1);
      assert.strictEqual(source.errorCount, 0);
      assert.deepStrictEqual(source.updates, updates);
    });

    it('should increment error count on error', () => {
      const source = new Source({ name: 'Test' });

      source.markFetched([], new Error('Failed'));

      assert.strictEqual(source.fetchCount, 1);
      assert.strictEqual(source.errorCount, 1);
      assert.deepStrictEqual(source.updates, []);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const source = new Source({ id: 'src_1', name: 'Test' });
      source.markFetched([{ id: '1' }]);

      const json = source.toJSON();

      assert.strictEqual(json.id, 'src_1');
      assert.strictEqual(json.name, 'Test');
      assert.strictEqual(json.type, SourceType.CUSTOM);
      assert.strictEqual(json.enabled, true);
      assert.strictEqual(json.fetchCount, 1);
      assert.strictEqual(json.updatesCount, 1);
    });
  });

  describe('fetch', () => {
    it('should throw when called on base class', async () => {
      const source = new Source({ name: 'Test' });

      await assert.rejects(
        async () => source.fetch(),
        /must be implemented by subclass/
      );
    });
  });
});

// =============================================================================
// GITHUB SOURCE TESTS
// =============================================================================

describe('GitHubSource', () => {
  describe('Construction', () => {
    it('should create with owner and repo', () => {
      const source = new GitHubSource({ owner: 'solana-labs', repo: 'solana' });

      assert.strictEqual(source.owner, 'solana-labs');
      assert.strictEqual(source.repo, 'solana');
      assert.strictEqual(source.type, SourceType.GITHUB);
      assert.strictEqual(source.name, 'GitHub: solana-labs/solana');
    });

    it('should have tracking defaults', () => {
      const source = new GitHubSource({ owner: 'test', repo: 'repo' });

      assert.strictEqual(source.branch, 'main');
      assert.strictEqual(source.trackCommits, true);
      assert.strictEqual(source.trackReleases, true);
      assert.strictEqual(source.trackIssues, false);
      assert.strictEqual(source.trackPRs, false);
    });

    it('should allow custom tracking config', () => {
      const source = new GitHubSource({
        owner: 'test',
        repo: 'repo',
        branch: 'develop',
        trackCommits: false,
        trackIssues: true,
      });

      assert.strictEqual(source.branch, 'develop');
      assert.strictEqual(source.trackCommits, false);
      assert.strictEqual(source.trackIssues, true);
    });
  });

  describe('_inferCommitPriority', () => {
    let source;

    beforeEach(() => {
      source = new GitHubSource({ owner: 'test', repo: 'test' });
    });

    it('should return CRITICAL for breaking changes', () => {
      assert.strictEqual(source._inferCommitPriority('BREAKING: removed old API'), Priority.CRITICAL);
      assert.strictEqual(source._inferCommitPriority('security: fix vulnerability'), Priority.CRITICAL);
    });

    it('should return HIGH for features', () => {
      assert.strictEqual(source._inferCommitPriority('feat: add new button'), Priority.HIGH);
      assert.strictEqual(source._inferCommitPriority('feat(ui): new modal'), Priority.HIGH);
    });

    it('should return MEDIUM for fixes', () => {
      assert.strictEqual(source._inferCommitPriority('fix: resolve crash'), Priority.MEDIUM);
      assert.strictEqual(source._inferCommitPriority('fix(core): memory leak'), Priority.MEDIUM);
    });

    it('should return LOW for docs/chore', () => {
      assert.strictEqual(source._inferCommitPriority('docs: update readme'), Priority.LOW);
      assert.strictEqual(source._inferCommitPriority('chore: bump deps'), Priority.LOW);
    });

    it('should return INFO for others', () => {
      assert.strictEqual(source._inferCommitPriority('refactor: clean up code'), Priority.INFO);
      assert.strictEqual(source._inferCommitPriority('update something'), Priority.INFO);
    });
  });

  describe('_inferIssuePriority', () => {
    let source;

    beforeEach(() => {
      source = new GitHubSource({ owner: 'test', repo: 'test' });
    });

    it('should return CRITICAL for security labels', () => {
      const issue = { labels: [{ name: 'security' }] };
      assert.strictEqual(source._inferIssuePriority(issue), Priority.CRITICAL);
    });

    it('should return HIGH for bug labels', () => {
      const issue = { labels: [{ name: 'bug' }] };
      assert.strictEqual(source._inferIssuePriority(issue), Priority.HIGH);
    });

    it('should return MEDIUM for enhancement labels', () => {
      const issue = { labels: [{ name: 'enhancement' }] };
      assert.strictEqual(source._inferIssuePriority(issue), Priority.MEDIUM);
    });

    it('should return LOW for unlabeled', () => {
      const issue = { labels: [] };
      assert.strictEqual(source._inferIssuePriority(issue), Priority.LOW);
    });
  });

  describe('toJSON', () => {
    it('should include GitHub-specific fields', () => {
      const source = new GitHubSource({
        owner: 'solana-labs',
        repo: 'solana',
        trackIssues: true,
      });

      const json = source.toJSON();

      assert.strictEqual(json.owner, 'solana-labs');
      assert.strictEqual(json.repo, 'solana');
      assert.strictEqual(json.branch, 'main');
      assert.strictEqual(json.trackIssues, true);
    });
  });
});

// =============================================================================
// WEB SEARCH SOURCE TESTS
// =============================================================================

describe('WebSearchSource', () => {
  describe('Construction', () => {
    it('should create with query', () => {
      const source = new WebSearchSource({ query: 'Solana news' });

      assert.strictEqual(source.query, 'Solana news');
      assert.strictEqual(source.type, SourceType.WEB);
      assert.strictEqual(source.name, 'Web: Solana news');
    });

    it('should support domain filtering', () => {
      const source = new WebSearchSource({
        query: 'test',
        domains: ['example.com', 'test.org'],
        excludeDomains: ['spam.com'],
      });

      assert.deepStrictEqual(source.domains, ['example.com', 'test.org']);
      assert.deepStrictEqual(source.excludeDomains, ['spam.com']);
    });
  });

  describe('toJSON', () => {
    it('should include query and domains', () => {
      const source = new WebSearchSource({
        query: 'test query',
        domains: ['example.com'],
      });

      const json = source.toJSON();

      assert.strictEqual(json.query, 'test query');
      assert.deepStrictEqual(json.domains, ['example.com']);
    });
  });
});

// =============================================================================
// ECOSYSTEM MONITOR TESTS
// =============================================================================

describe('EcosystemMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new EcosystemMonitor();
  });

  describe('Construction', () => {
    it('should create with defaults', () => {
      assert.strictEqual(monitor.sources.size, 0);
      assert.deepStrictEqual(monitor.updateCache, []);
      assert.strictEqual(monitor.maxCacheSize, 100);
    });

    it('should accept config options', () => {
      const customMonitor = new EcosystemMonitor({
        maxCacheSize: 50,
        onUpdate: () => {},
      });

      assert.strictEqual(customMonitor.maxCacheSize, 50);
      assert.ok(customMonitor.onUpdate);
    });
  });

  describe('registerSource', () => {
    it('should register a source', () => {
      const source = new Source({ id: 'src_1', name: 'Test' });
      const id = monitor.registerSource(source);

      assert.strictEqual(id, 'src_1');
      assert.strictEqual(monitor.sources.size, 1);
    });

    it('should enforce max sources limit', () => {
      for (let i = 0; i < ECOSYSTEM_CONSTANTS.MAX_SOURCES; i++) {
        monitor.registerSource(new Source({ id: `src_${i}`, name: `Test ${i}` }));
      }

      assert.throws(
        () => monitor.registerSource(new Source({ id: 'overflow', name: 'Overflow' })),
        /Max sources/
      );
    });
  });

  describe('trackGitHubRepo', () => {
    it('should create and register GitHub source', () => {
      const id = monitor.trackGitHubRepo('solana-labs', 'solana');

      assert.ok(id);
      const source = monitor.getSource(id);
      assert.strictEqual(source.owner, 'solana-labs');
      assert.strictEqual(source.repo, 'solana');
    });

    it('should pass options to source', () => {
      const id = monitor.trackGitHubRepo('test', 'repo', {
        trackIssues: true,
        trackCommits: false,
      });

      const source = monitor.getSource(id);
      assert.strictEqual(source.trackIssues, true);
      assert.strictEqual(source.trackCommits, false);
    });
  });

  describe('unregisterSource', () => {
    it('should remove source', () => {
      const id = monitor.trackGitHubRepo('test', 'repo');
      assert.strictEqual(monitor.sources.size, 1);

      const result = monitor.unregisterSource(id);

      assert.strictEqual(result, true);
      assert.strictEqual(monitor.sources.size, 0);
    });

    it('should return false for non-existent source', () => {
      const result = monitor.unregisterSource('nonexistent');
      assert.strictEqual(result, false);
    });
  });

  describe('listSources', () => {
    it('should return serialized sources', () => {
      monitor.trackGitHubRepo('solana-labs', 'solana');
      monitor.trackGitHubRepo('helius-labs', 'helius-sdk');

      const list = monitor.listSources();

      assert.strictEqual(list.length, 2);
      assert.ok(list[0].owner);
      assert.ok(list[1].owner);
    });
  });

  describe('getRecentUpdates', () => {
    beforeEach(() => {
      // Manually add updates to cache
      monitor.updateCache = [
        { type: UpdateType.COMMIT, priority: Priority.HIGH, source: 'src_1', timestamp: Date.now() },
        { type: UpdateType.RELEASE, priority: Priority.CRITICAL, source: 'src_2', timestamp: Date.now() - 1000 },
        { type: UpdateType.COMMIT, priority: Priority.LOW, source: 'src_1', timestamp: Date.now() - 2000 },
      ];
    });

    it('should return all updates without filter', () => {
      const updates = monitor.getRecentUpdates();
      assert.strictEqual(updates.length, 3);
    });

    it('should filter by type', () => {
      const commits = monitor.getRecentUpdates({ type: UpdateType.COMMIT });
      assert.strictEqual(commits.length, 2);
    });

    it('should filter by source', () => {
      const src1Updates = monitor.getRecentUpdates({ sourceId: 'src_1' });
      assert.strictEqual(src1Updates.length, 2);
    });

    it('should filter by priority', () => {
      const highPriority = monitor.getRecentUpdates({ minPriority: Priority.HIGH });
      assert.strictEqual(highPriority.length, 2);
    });

    it('should respect limit', () => {
      const limited = monitor.getRecentUpdates({ limit: 2 });
      assert.strictEqual(limited.length, 2);
    });
  });

  describe('getStatus', () => {
    it('should return monitor status', () => {
      monitor.trackGitHubRepo('test', 'repo');

      const status = monitor.getStatus();

      assert.ok(Array.isArray(status.sources));
      assert.ok(status.stats);
      assert.strictEqual(status.cacheSize, 0);
      assert.strictEqual(status.discoveredSources, 0);
    });
  });
});

// =============================================================================
// SUMMARIZE UPDATES TESTS
// =============================================================================

describe('summarizeUpdates', () => {
  it('should count updates by type', () => {
    const updates = [
      { type: UpdateType.COMMIT, priority: Priority.LOW, source: 'src_1' },
      { type: UpdateType.COMMIT, priority: Priority.MEDIUM, source: 'src_1' },
      { type: UpdateType.RELEASE, priority: Priority.HIGH, source: 'src_2' },
    ];

    const summary = summarizeUpdates(updates);

    assert.strictEqual(summary.total, 3);
    assert.strictEqual(summary.byType[UpdateType.COMMIT], 2);
    assert.strictEqual(summary.byType[UpdateType.RELEASE], 1);
  });

  it('should count updates by priority', () => {
    const updates = [
      { type: UpdateType.COMMIT, priority: Priority.LOW, source: 'src_1' },
      { type: UpdateType.COMMIT, priority: Priority.HIGH, source: 'src_1' },
      { type: UpdateType.RELEASE, priority: Priority.HIGH, source: 'src_2' },
    ];

    const summary = summarizeUpdates(updates);

    assert.strictEqual(summary.byPriority[Priority.LOW], 1);
    assert.strictEqual(summary.byPriority[Priority.HIGH], 2);
  });

  it('should collect highlights', () => {
    const updates = [
      { type: UpdateType.COMMIT, priority: Priority.LOW, source: 'src_1', title: 'Low' },
      { type: UpdateType.RELEASE, priority: Priority.HIGH, source: 'src_2', title: 'High', url: 'http://a' },
      { type: UpdateType.ALERT, priority: Priority.CRITICAL, source: 'src_3', title: 'Critical', url: 'http://b' },
    ];

    const summary = summarizeUpdates(updates);

    assert.strictEqual(summary.highlights.length, 2);
    assert.ok(summary.highlights.some(h => h.title === 'High'));
    assert.ok(summary.highlights.some(h => h.title === 'Critical'));
  });

  it('should handle empty updates', () => {
    const summary = summarizeUpdates([]);

    assert.strictEqual(summary.total, 0);
    assert.deepStrictEqual(summary.highlights, []);
  });
});

// =============================================================================
// E-SCORE CALCULATION TESTS
// =============================================================================

describe('CultureSignals', () => {
  it('should define all signal types', () => {
    assert.strictEqual(CultureSignals.DEVELOPMENT_VELOCITY, 'development_velocity');
    assert.strictEqual(CultureSignals.COMMUNITY_ENGAGEMENT, 'community_engagement');
    assert.strictEqual(CultureSignals.TRANSPARENCY, 'transparency');
    assert.strictEqual(CultureSignals.SECURITY_FOCUS, 'security_focus');
    assert.strictEqual(CultureSignals.INNOVATION, 'innovation');
    assert.strictEqual(CultureSignals.MAINTENANCE, 'maintenance');
  });
});

describe('calculateEScoreSignals', () => {
  const now = Date.now();

  it('should handle empty updates', () => {
    const result = calculateEScoreSignals([]);

    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.message, 'No recent updates to analyze');
  });

  it('should calculate development velocity', () => {
    const updates = [
      { type: UpdateType.COMMIT, timestamp: now },
      { type: UpdateType.COMMIT, timestamp: now - 1000 },
      { type: UpdateType.COMMIT, timestamp: now - 2000 },
      { type: UpdateType.RELEASE, timestamp: now - 3000 },
    ];

    const result = calculateEScoreSignals(updates);

    assert.ok(result.signals[CultureSignals.DEVELOPMENT_VELOCITY] > 0);
    assert.strictEqual(result.breakdown.commits, 3);
    assert.strictEqual(result.breakdown.releases, 1);
  });

  it('should calculate community engagement', () => {
    const updates = [
      { type: UpdateType.ISSUE, timestamp: now },
      { type: UpdateType.ISSUE, timestamp: now - 1000 },
      { type: UpdateType.PR, timestamp: now - 2000 },
    ];

    const result = calculateEScoreSignals(updates);

    assert.ok(result.signals[CultureSignals.COMMUNITY_ENGAGEMENT] > 0);
    assert.strictEqual(result.breakdown.issues, 2);
    assert.strictEqual(result.breakdown.prs, 1);
  });

  it('should calculate transparency from release descriptions', () => {
    const longDesc = 'A'.repeat(100);
    const updates = [
      { type: UpdateType.RELEASE, timestamp: now, description: longDesc },
      { type: UpdateType.RELEASE, timestamp: now - 1000, description: 'short' },
    ];

    const result = calculateEScoreSignals(updates);

    assert.strictEqual(result.signals[CultureSignals.TRANSPARENCY], 0.5); // 1 of 2 with good desc
  });

  it('should detect security focus', () => {
    const updates = [
      { type: UpdateType.COMMIT, timestamp: now, title: 'fix: security vulnerability' },
      { type: UpdateType.COMMIT, timestamp: now - 1000, title: 'feat: add feature' },
    ];

    const result = calculateEScoreSignals(updates);

    assert.strictEqual(result.signals[CultureSignals.SECURITY_FOCUS], 1);
    assert.strictEqual(result.breakdown.securityUpdates, 1);
  });

  it('should calculate innovation vs maintenance ratio', () => {
    const updates = [
      { type: UpdateType.COMMIT, timestamp: now, title: 'feat: new feature' },
      { type: UpdateType.COMMIT, timestamp: now - 1000, title: 'add: another feature' },
      { type: UpdateType.COMMIT, timestamp: now - 2000, title: 'fix: bug' },
    ];

    const result = calculateEScoreSignals(updates);

    assert.strictEqual(result.breakdown.features, 2);
    assert.strictEqual(result.breakdown.fixes, 1);
    assert.ok(result.signals[CultureSignals.INNOVATION] > result.signals[CultureSignals.MAINTENANCE]);
  });

  it('should cap confidence at phi-inverse', () => {
    // Generate many updates to maximize confidence
    const updates = [];
    for (let i = 0; i < 100; i++) {
      updates.push({ type: UpdateType.COMMIT, timestamp: now - i * 1000, title: 'commit' });
    }

    const result = calculateEScoreSignals(updates);

    assert.ok(result.confidence <= PHI_INV);
  });

  it('should calculate composite score', () => {
    const updates = [
      { type: UpdateType.COMMIT, timestamp: now, title: 'feat: feature' },
      { type: UpdateType.RELEASE, timestamp: now - 1000, description: 'A'.repeat(100) },
    ];

    const result = calculateEScoreSignals(updates);

    assert.ok(result.composite >= 0);
    assert.ok(result.composite <= 1);
  });

  it('should respect time window option', () => {
    const updates = [
      { type: UpdateType.COMMIT, timestamp: now },
      { type: UpdateType.COMMIT, timestamp: now - 10 * 24 * 60 * 60 * 1000 }, // 10 days ago
    ];

    const result = calculateEScoreSignals(updates, { timeWindowMs: 7 * 24 * 60 * 60 * 1000 });

    assert.strictEqual(result.sampleSize, 1); // Only 1 update in window
  });
});

// =============================================================================
// ECOSYSTEM MONITOR E-SCORE INTEGRATION
// =============================================================================

describe('EcosystemMonitor E-Score', () => {
  let monitor;

  beforeEach(() => {
    monitor = new EcosystemMonitor();
    // Add updates to cache
    const now = Date.now();
    monitor.updateCache = [
      { type: UpdateType.COMMIT, timestamp: now, title: 'feat: new feature', priority: Priority.HIGH },
      { type: UpdateType.COMMIT, timestamp: now - 1000, title: 'fix: bug', priority: Priority.MEDIUM },
      { type: UpdateType.RELEASE, timestamp: now - 2000, description: 'A'.repeat(100), priority: Priority.HIGH },
    ];
  });

  it('should calculate E-Score from cache', () => {
    const eScore = monitor.calculateEScore();

    assert.ok(eScore.signals);
    assert.ok(eScore.composite >= 0);
    assert.strictEqual(eScore.sampleSize, 3);
  });

  it('should generate health report', () => {
    const report = monitor.getHealthReport();

    assert.ok(report.timestamp);
    assert.ok(report.sources);
    assert.ok(report.updateSummary);
    assert.ok(report.eScore);
    assert.ok(['healthy', 'needs_attention'].includes(report.health));
    assert.ok(['HOWL', 'WAG', 'BARK', 'GROWL'].includes(report.verdict));
  });
});

// =============================================================================
// CREATE SOLANA MONITOR TESTS
// =============================================================================

describe('createSolanaMonitor', () => {
  it('should create pre-configured monitor', () => {
    const monitor = createSolanaMonitor();

    assert.ok(monitor instanceof EcosystemMonitor);
    assert.ok(monitor.sources.size > 0);
  });

  it('should include Solana default sources', () => {
    const monitor = createSolanaMonitor();
    const sources = monitor.listSources();

    const repos = sources.map(s => `${s.owner}/${s.repo}`);
    assert.ok(repos.includes('solana-labs/solana'));
  });

  it('should accept custom options', () => {
    const monitor = createSolanaMonitor({ maxCacheSize: 50 });

    assert.strictEqual(monitor.maxCacheSize, 50);
  });
});
