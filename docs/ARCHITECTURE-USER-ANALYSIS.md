# CYNIC User Analysis - Privacy-First Design

> **Document vivant** - Architecture for commit and behavior analysis
> **Derniere mise a jour**: 2026-01-16
> **Principe**: "Privacy is not the absence of data, but the presence of consent" - κυνικός

---

## Philosophy

CYNIC learns from users to improve its collective consciousness. But:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIVACY FIRST                               │
│                                                                  │
│     "The dog observes, but only when invited"                   │
│                                                                  │
│     • NO data collection without explicit opt-in                │
│     • NO individual data exposure (differential privacy)        │
│     • NO data retention beyond purpose                          │
│     • ALWAYS aggregate, never individual                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Consent Tiers

Three levels of data sharing, each requiring explicit opt-in:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSENT TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIER 0: NONE (Default)                                         │
│  ────────────────────                                           │
│  • No data collection                                           │
│  • Full functionality                                           │
│  • Zero tracking                                                │
│                                                                  │
│  TIER 1: SESSION PATTERNS (Opt-in)                              │
│  ─────────────────────────────────                              │
│  • Tool usage frequencies (hashed)                              │
│  • Judgment feedback (aggregated)                               │
│  • Session duration (bucketed)                                  │
│  • Contributes to: Collective learning                          │
│                                                                  │
│  TIER 2: CODE PATTERNS (Opt-in)                                 │
│  ──────────────────────────────                                 │
│  • Commit patterns (not content!)                               │
│  • File type distributions                                      │
│  • Coding time patterns                                         │
│  • Contributes to: E-Score BUILD dimension                      │
│                                                                  │
│  TIER 3: ECOSYSTEM PARTICIPATION (Opt-in)                       │
│  ─────────────────────────────────────────                      │
│  • Public on-chain activity                                     │
│  • Node operation metrics                                       │
│  • Burns and holdings (already public)                          │
│  • Contributes to: Full E-Score                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## E-Score Dimensions (Reminder)

```javascript
// E-Score = Σ(dimension × φ_weight)
const E_SCORE_DIMENSIONS = {
  HOLD:  { weight: 1.0,       tier: 3, source: 'on-chain' },   // Token holdings
  BURN:  { weight: PHI,       tier: 3, source: 'on-chain' },   // Cumulative burns
  USE:   { weight: 1.0,       tier: 1, source: 'session' },    // API/tool usage
  BUILD: { weight: PHI * PHI, tier: 2, source: 'commits' },    // Code contributions
  RUN:   { weight: PHI * PHI, tier: 3, source: 'node' },       // Node operation
  REFER: { weight: PHI,       tier: 3, source: 'on-chain' },   // Active referrals
  TIME:  { weight: PHI_INV,   tier: 1, source: 'session' },    // Days active
};
```

---

## Architecture

### 1. Consent Manager

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSENT MANAGER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  consent.js                                                      │
│  ├── ConsentManager                                             │
│  │   ├── checkConsent(userId, tier)                            │
│  │   ├── requestConsent(userId, tier, purpose)                 │
│  │   ├── grantConsent(userId, tier, signature?)                │
│  │   ├── revokeConsent(userId, tier)                           │
│  │   └── getConsentStatus(userId)                              │
│  │                                                              │
│  └── Storage                                                    │
│      ├── Local: .cynic/consent.json                            │
│      ├── PostgreSQL: user_consents table                       │
│      └── Blockchain: ConsentRegistry (future)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Pattern Collectors

```
┌─────────────────────────────────────────────────────────────────┐
│                   PATTERN COLLECTORS                             │
│             (Only activated with consent)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  collectors/                                                     │
│  ├── session-collector.js (Tier 1)                             │
│  │   ├── collectToolUsage()     # Which tools, how often       │
│  │   ├── collectJudgmentFeedback()  # Correct/incorrect        │
│  │   └── collectSessionTiming() # Duration, frequency          │
│  │                                                              │
│  ├── commit-collector.js (Tier 2)                              │
│  │   ├── collectCommitPatterns()   # Timing, frequency         │
│  │   ├── collectFileDistribution() # File types, not content   │
│  │   ├── collectCodeMetrics()      # LOC added/removed         │
│  │   └── collectCollaborationPatterns()  # Co-authors, PRs     │
│  │                                                              │
│  └── ecosystem-collector.js (Tier 3)                           │
│      ├── collectOnChainActivity()   # Burns, holds, swaps      │
│      ├── collectNodeMetrics()       # Uptime, judgments        │
│      └── collectReferralActivity()  # Active referrals         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Privacy Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVACY PIPELINE                              │
│            Every data point passes through this                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Raw Data                                                       │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────┐                                           │
│   │   HASH/SALT     │  Never store raw identifiers              │
│   │   (SHA-256)     │  Salt per user, rotated monthly           │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │   AGGREGATE     │  Bucket values (never exact)              │
│   │   (φ buckets)   │  Time: 8h buckets, Counts: Fib ranges    │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │ DIFFERENTIAL    │  Add Laplacian noise                      │
│   │ PRIVACY (ε=φ⁻¹) │  ε = 0.618, never fully reveal           │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │   K-ANONYMITY   │  Suppress if < 5 in group                 │
│   │   (k=5)         │  Generalize until k satisfied             │
│   └────────┬────────┘                                           │
│            │                                                    │
│            ▼                                                    │
│   Private Aggregate                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commit Analysis Design

### What We Collect (Tier 2)

```javascript
// COLLECT (hashed/aggregated)
const COMMIT_PATTERNS = {
  // Timing (bucketed to 8-hour windows)
  commitHourBucket: 'morning|afternoon|evening|night',
  commitDayType: 'weekday|weekend',

  // Frequency (Fibonacci buckets)
  commitsPerWeek: '1-2|3-5|5-8|8-13|13-21|21-34|34+',

  // File types (categories only)
  languageDistribution: { js: 0.4, py: 0.3, md: 0.2, other: 0.1 },

  // Metrics (noised)
  avgLinesChanged: 'small(<50)|medium(50-200)|large(200+)',
  avgFilesPerCommit: '1|2-3|4-8|8+',

  // Collaboration (binary)
  usesCoAuthors: true|false,
  createsPRs: true|false,
};

// NEVER COLLECT
const FORBIDDEN = [
  'commit message content',
  'file names',
  'code content',
  'specific timestamps',
  'repository names',
  'branch names',
  'author emails',
];
```

### Git Pattern Analyzer

```javascript
/**
 * Git Pattern Analyzer
 *
 * Extracts patterns from git history WITHOUT storing content.
 *
 * "The dog sees the forest, not the trees" - κυνικός
 */
export class GitPatternAnalyzer {
  constructor(options = {}) {
    this.hasher = new PrivateHasher(options.salt);
    this.dp = new DifferentialPrivacy({ epsilon: PHI_INV });
  }

  /**
   * Analyze commits with privacy preservation
   * @param {string} repoPath - Repository path
   * @param {number} [days=90] - Days to analyze
   * @returns {Promise<Object>} Private aggregate patterns
   */
  async analyzePatterns(repoPath, days = 90) {
    const commits = await this._getCommits(repoPath, days);

    return {
      // Timing patterns (bucketed)
      timingProfile: this._analyzeTimingPatterns(commits),

      // Frequency (noised)
      frequency: this._analyzeFrequency(commits),

      // File types (aggregated, noised)
      languageProfile: this._analyzeLanguages(commits),

      // Size patterns (bucketed, noised)
      sizeProfile: this._analyzeSizes(commits),

      // Collaboration (binary, noised)
      collaboration: this._analyzeCollaboration(commits),
    };
  }

  /**
   * Bucket commit times to 8-hour windows
   * @private
   */
  _analyzeTimingPatterns(commits) {
    const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const dayTypes = { weekday: 0, weekend: 0 };

    for (const commit of commits) {
      const hour = new Date(commit.timestamp).getHours();
      const day = new Date(commit.timestamp).getDay();

      // 8-hour buckets: night(0-6), morning(6-12), afternoon(12-18), evening(18-24)
      if (hour < 6) buckets.night++;
      else if (hour < 12) buckets.morning++;
      else if (hour < 18) buckets.afternoon++;
      else buckets.evening++;

      // Weekend check
      if (day === 0 || day === 6) dayTypes.weekend++;
      else dayTypes.weekday++;
    }

    // Convert to ratios with noise
    const total = commits.length || 1;
    return {
      timeDistribution: {
        morning: this.dp.addNoiseToRatio(buckets.morning / total),
        afternoon: this.dp.addNoiseToRatio(buckets.afternoon / total),
        evening: this.dp.addNoiseToRatio(buckets.evening / total),
        night: this.dp.addNoiseToRatio(buckets.night / total),
      },
      dayDistribution: {
        weekday: this.dp.addNoiseToRatio(dayTypes.weekday / total),
        weekend: this.dp.addNoiseToRatio(dayTypes.weekend / total),
      },
    };
  }

  /**
   * Analyze commit frequency using Fibonacci buckets
   * @private
   */
  _analyzeFrequency(commits) {
    const weeks = Math.ceil(commits.length / 7) || 1;
    const perWeek = commits.length / weeks;

    // Fibonacci buckets: 1-2, 3-5, 5-8, 8-13, 13-21, 21-34, 34+
    const FIB_BUCKETS = [2, 5, 8, 13, 21, 34];
    let bucket = '34+';

    for (let i = 0; i < FIB_BUCKETS.length; i++) {
      if (perWeek <= FIB_BUCKETS[i]) {
        bucket = i === 0 ? '1-2' : `${FIB_BUCKETS[i-1]+1}-${FIB_BUCKETS[i]}`;
        break;
      }
    }

    return {
      bucket,
      noisedTotal: this.dp.addNoiseToCount(commits.length),
    };
  }

  /**
   * Analyze language distribution (from file extensions only)
   * @private
   */
  _analyzeLanguages(commits) {
    const extensions = new Map();
    let total = 0;

    for (const commit of commits) {
      for (const file of commit.files || []) {
        // Extract extension only, never the filename
        const ext = this._getExtension(file);
        extensions.set(ext, (extensions.get(ext) || 0) + 1);
        total++;
      }
    }

    // Convert to noised ratios
    const distribution = {};
    for (const [ext, count] of extensions) {
      const ratio = count / (total || 1);
      // Only include if > 5% (k-anonymity style suppression)
      if (ratio > 0.05) {
        distribution[ext] = this.dp.addNoiseToRatio(ratio);
      }
    }

    return distribution;
  }

  /**
   * Get file extension category (not actual extension)
   * @private
   */
  _getExtension(filepath) {
    // Categories, not actual extensions
    const CATEGORIES = {
      js: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'],
      py: ['py', 'pyw', 'pyi'],
      go: ['go'],
      rust: ['rs'],
      java: ['java', 'kt', 'scala'],
      web: ['html', 'css', 'scss', 'less', 'vue', 'svelte'],
      config: ['json', 'yaml', 'yml', 'toml', 'env'],
      docs: ['md', 'mdx', 'txt', 'rst'],
      data: ['csv', 'sql', 'xml'],
    };

    const ext = filepath.split('.').pop()?.toLowerCase() || '';

    for (const [category, exts] of Object.entries(CATEGORIES)) {
      if (exts.includes(ext)) return category;
    }
    return 'other';
  }
}
```

---

## Session Analysis Design

### What We Collect (Tier 1)

```javascript
// COLLECT (hashed/aggregated)
const SESSION_PATTERNS = {
  // Tool usage (categories only)
  toolCategories: {
    judgment: 0.4,      // judge, feedback
    search: 0.3,        // search, patterns
    session: 0.2,       // session_start, session_end
    ecosystem: 0.1,     // docs, integrator
  },

  // Judgment feedback (aggregated)
  feedbackRatio: {
    correct: 0.7,
    incorrect: 0.2,
    partial: 0.1,
  },

  // Session timing (bucketed)
  avgSessionDuration: 'short(<5m)|medium(5-30m)|long(30m-2h)|extended(2h+)',
  sessionsPerWeek: '1-2|3-5|5-8|8+',
};

// NEVER COLLECT
const FORBIDDEN = [
  'judgment content',
  'digested content',
  'specific queries',
  'project names',
  'user identifiers (except hashed)',
];
```

### Session Pattern Analyzer

```javascript
/**
 * Session Pattern Analyzer
 *
 * Learns from user sessions to improve CYNIC.
 *
 * "The dog learns, but never tells tales" - κυνικός
 */
export class SessionPatternAnalyzer {
  constructor(options = {}) {
    this.dp = new DifferentialPrivacy({ epsilon: PHI_INV });
    this.aggregator = new PrivatePatternAggregator();
  }

  /**
   * Analyze session patterns (requires consent)
   * @param {Array<Object>} sessions - Session records
   * @returns {Object} Private aggregate patterns
   */
  analyzePatterns(sessions) {
    return {
      // Tool usage distribution
      toolProfile: this._analyzeToolUsage(sessions),

      // Feedback quality
      feedbackProfile: this._analyzeFeedback(sessions),

      // Session timing
      timingProfile: this._analyzeSessionTiming(sessions),

      // Engagement
      engagement: this._analyzeEngagement(sessions),
    };
  }

  /**
   * Analyze tool usage by category
   * @private
   */
  _analyzeToolUsage(sessions) {
    const TOOL_CATEGORIES = {
      judgment: ['cynic_judge', 'cynic_feedback'],
      search: ['search', 'patterns'],
      session: ['session_start', 'session_end'],
      ecosystem: ['docs', 'integrator', 'poj_chain'],
      monitoring: ['health', 'metrics', 'agents_status'],
    };

    const categoryCounts = new Map();
    let total = 0;

    for (const session of sessions) {
      for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
        // Count tools in this category (from session context)
        const count = this._countToolsInCategory(session, tools);
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + count);
        total += count;
      }
    }

    // Convert to noised ratios
    const distribution = {};
    for (const [category, count] of categoryCounts) {
      distribution[category] = this.dp.addNoiseToRatio(count / (total || 1));
    }

    return distribution;
  }

  /**
   * Analyze feedback quality distribution
   * @private
   */
  _analyzeFeedback(sessions) {
    let correct = 0, incorrect = 0, partial = 0;

    for (const session of sessions) {
      correct += session.correctFeedback || 0;
      incorrect += session.incorrectFeedback || 0;
      partial += session.partialFeedback || 0;
    }

    const total = correct + incorrect + partial || 1;

    return {
      correctRatio: this.dp.addNoiseToRatio(correct / total),
      incorrectRatio: this.dp.addNoiseToRatio(incorrect / total),
      partialRatio: this.dp.addNoiseToRatio(partial / total),
    };
  }

  /**
   * Analyze session timing patterns
   * @private
   */
  _analyzeSessionTiming(sessions) {
    // Duration buckets (in minutes)
    const DURATION_BUCKETS = { short: 0, medium: 0, long: 0, extended: 0 };

    for (const session of sessions) {
      const durationMin = (session.duration || 0) / 60000;

      if (durationMin < 5) DURATION_BUCKETS.short++;
      else if (durationMin < 30) DURATION_BUCKETS.medium++;
      else if (durationMin < 120) DURATION_BUCKETS.long++;
      else DURATION_BUCKETS.extended++;
    }

    const total = sessions.length || 1;

    return {
      short: this.dp.addNoiseToRatio(DURATION_BUCKETS.short / total),
      medium: this.dp.addNoiseToRatio(DURATION_BUCKETS.medium / total),
      long: this.dp.addNoiseToRatio(DURATION_BUCKETS.long / total),
      extended: this.dp.addNoiseToRatio(DURATION_BUCKETS.extended / total),
    };
  }
}
```

---

## E-Score Calculation from Patterns

```javascript
/**
 * Calculate E-Score from private aggregates
 *
 * E = Σ(dimension × φ_weight)
 *
 * Each dimension is calculated from private aggregates,
 * never from raw individual data.
 */
export class EScoreCalculator {
  constructor() {
    this.weights = {
      HOLD:  1.0,
      BURN:  PHI,           // 1.618
      USE:   1.0,
      BUILD: PHI * PHI,     // 2.618
      RUN:   PHI * PHI,     // 2.618
      REFER: PHI,           // 1.618
      TIME:  PHI_INV,       // 0.618
    };
  }

  /**
   * Calculate E-Score from available dimensions
   * @param {Object} dimensions - Dimension values (0-100 each)
   * @returns {number} E-Score (0-100)
   */
  calculate(dimensions) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dim, value] of Object.entries(dimensions)) {
      if (this.weights[dim] && typeof value === 'number') {
        weightedSum += value * this.weights[dim];
        totalWeight += this.weights[dim] * 100; // Max per dimension
      }
    }

    // Normalize to 0-100
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }

  /**
   * Calculate BUILD dimension from commit patterns
   * @param {Object} commitPatterns - From GitPatternAnalyzer
   * @returns {number} BUILD score (0-100)
   */
  calculateBuild(commitPatterns) {
    // Factors contributing to BUILD score
    const factors = {
      // Consistency (regular commits)
      consistency: this._scoreConsistency(commitPatterns.timingProfile),

      // Volume (commit frequency)
      volume: this._scoreVolume(commitPatterns.frequency),

      // Diversity (language spread)
      diversity: this._scoreDiversity(commitPatterns.languageProfile),

      // Collaboration
      collaboration: commitPatterns.collaboration?.score || 0,
    };

    // φ-weighted combination
    return (
      factors.consistency * PHI +
      factors.volume * 1.0 +
      factors.diversity * PHI_INV +
      factors.collaboration * PHI_INV_2
    ) / (PHI + 1.0 + PHI_INV + PHI_INV_2) * 100;
  }

  /**
   * Calculate USE dimension from session patterns
   * @param {Object} sessionPatterns - From SessionPatternAnalyzer
   * @returns {number} USE score (0-100)
   */
  calculateUse(sessionPatterns) {
    const factors = {
      // Engagement (tool diversity)
      engagement: this._scoreToolDiversity(sessionPatterns.toolProfile),

      // Quality (feedback ratio)
      quality: (sessionPatterns.feedbackProfile?.correctRatio || 0) * 100,

      // Duration
      duration: this._scoreDuration(sessionPatterns.timingProfile),
    };

    return (
      factors.engagement * PHI +
      factors.quality * 1.0 +
      factors.duration * PHI_INV
    ) / (PHI + 1.0 + PHI_INV) * 100;
  }
}
```

---

## Consent UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSENT PROMPT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  *sniff* CYNIC learns better with your help.                    │
│                                                                  │
│  Would you like to contribute to collective learning?           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [ ] Tier 1: Session patterns                            │   │
│  │     Tool usage, timing, feedback quality                │   │
│  │     Helps CYNIC improve judgment accuracy               │   │
│  │                                                         │   │
│  │ [ ] Tier 2: Code patterns (no content)                  │   │
│  │     Commit timing, file types, collaboration            │   │
│  │     Contributes to your E-Score BUILD dimension         │   │
│  │                                                         │   │
│  │ [ ] Tier 3: Ecosystem participation                     │   │
│  │     On-chain activity (already public)                  │   │
│  │     Full E-Score calculation                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Your data is:                                                   │
│  • Always hashed (never stored raw)                             │
│  • Always aggregated (never individual)                         │
│  • Always noised (differential privacy ε=0.618)                 │
│  • Revocable at any time                                        │
│                                                                  │
│  [Accept Selected] [Decline All] [Learn More]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Tool: brain_consent

```javascript
/**
 * MCP Tool: brain_consent
 *
 * Manage user consent for data collection.
 */
const brain_consent = {
  name: 'brain_consent',
  description: 'Manage consent for CYNIC data collection. ' +
    'View, grant, or revoke consent for different data tiers.',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'grant', 'revoke', 'explain'],
        description: 'Action: status (view current), grant (opt-in), revoke (opt-out), explain (details)',
      },
      tier: {
        type: 'number',
        enum: [1, 2, 3],
        description: 'Consent tier (1=session, 2=code, 3=ecosystem)',
      },
    },
    required: ['action'],
  },

  async handler({ action, tier }, context) {
    const { userId } = context.session;

    switch (action) {
      case 'status':
        return getConsentStatus(userId);

      case 'grant':
        if (!tier) return { error: 'Tier required for grant action' };
        return grantConsent(userId, tier);

      case 'revoke':
        if (!tier) return { error: 'Tier required for revoke action' };
        return revokeConsent(userId, tier);

      case 'explain':
        return explainConsent(tier);

      default:
        return { error: `Unknown action: ${action}` };
    }
  },
};
```

---

## Database Schema

```sql
-- User consent preferences
CREATE TABLE user_consents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  signature TEXT,  -- Optional wallet signature for proof
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, tier)
);

-- Private aggregates (never individual data)
CREATE TABLE private_aggregates (
  id SERIAL PRIMARY KEY,
  aggregate_type VARCHAR(50) NOT NULL,  -- 'commit_patterns', 'session_patterns'
  bucket_key VARCHAR(255) NOT NULL,     -- Hashed bucket identifier
  value JSONB NOT NULL,                 -- Noised aggregate values
  contributor_count INTEGER NOT NULL,   -- K-anonymity check (must be >= 5)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(aggregate_type, bucket_key)
);

-- E-Score dimensions (per user, from consented data)
CREATE TABLE e_score_dimensions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  dimension VARCHAR(20) NOT NULL,  -- 'HOLD', 'BURN', 'USE', 'BUILD', etc.
  score NUMERIC(5,2) NOT NULL,     -- 0-100
  tier_required INTEGER NOT NULL,  -- Which tier needed for this dimension
  calculated_at TIMESTAMP NOT NULL,

  UNIQUE(user_id, dimension)
);

-- Indexes
CREATE INDEX idx_consents_user ON user_consents(user_id);
CREATE INDEX idx_aggregates_type ON private_aggregates(aggregate_type);
CREATE INDEX idx_escore_user ON e_score_dimensions(user_id);
```

---

## Privacy Guarantees

### Mathematical Guarantees

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRIVACY GUARANTEES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DIFFERENTIAL PRIVACY (ε = φ⁻¹ = 0.618)                      │
│     ─────────────────────────────────────                       │
│     Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S]                         │
│                                                                  │
│     For any two datasets D, D' differing by one user,           │
│     the probability ratio of any output is bounded by e^0.618    │
│                                                                  │
│     Meaning: Removing YOUR data changes output by < 1.86x        │
│                                                                  │
│  2. K-ANONYMITY (k = 5)                                         │
│     ─────────────────                                           │
│     No aggregate published with fewer than 5 contributors       │
│                                                                  │
│     Meaning: You can't be uniquely identified in any group      │
│                                                                  │
│  3. DATA MINIMIZATION                                           │
│     ───────────────────                                         │
│     • Only categories, never content                            │
│     • Only buckets, never exact values                          │
│     • Only aggregates, never individuals                        │
│                                                                  │
│  4. PURPOSE LIMITATION                                          │
│     ─────────────────                                           │
│     Data used ONLY for:                                         │
│     • Improving CYNIC judgment accuracy                         │
│     • Calculating user E-Score (for user's benefit)             │
│     • Collective learning (aggregated)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

```
Phase 1: Foundation (Week 1-2)
├── [ ] ConsentManager class
├── [ ] user_consents table + migration
├── [ ] brain_consent MCP tool
└── [ ] Consent UI in hooks

Phase 2: Tier 1 - Sessions (Week 3-4)
├── [ ] SessionPatternAnalyzer
├── [ ] Integration with SessionManager
├── [ ] USE dimension calculator
└── [ ] TIME dimension calculator

Phase 3: Tier 2 - Code (Week 5-6)
├── [ ] GitPatternAnalyzer
├── [ ] BUILD dimension calculator
├── [ ] Consent check integration
└── [ ] Private aggregate storage

Phase 4: Tier 3 - Ecosystem (Week 7-8)
├── [ ] On-chain activity collector
├── [ ] HOLD, BURN, REFER dimensions
├── [ ] RUN dimension (node metrics)
└── [ ] Full E-Score calculator

Phase 5: Polish (Week 9-10)
├── [ ] Consent management UI
├── [ ] Privacy dashboard
├── [ ] Audit logging
└── [ ] Documentation
```

---

## Archivist Integration

The **Archivist** (Daat) dog handles the collective learning memory:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHIVIST (Daat)                              │
│                  "The keeper of patterns"                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Responsibilities:                                               │
│  • Stores private aggregates (never raw data)                   │
│  • Maintains knowledge graph from collective learning           │
│  • Provides insights to other dogs                              │
│  • Ensures data retention policies                              │
│                                                                  │
│  Events Consumed:                                                │
│  • consent:granted -> Start collecting for that tier            │
│  • consent:revoked -> Stop collecting, purge user data          │
│  • session:ended -> Update session aggregates                   │
│  • commit:analyzed -> Update code aggregates                    │
│                                                                  │
│  Events Emitted:                                                 │
│  • aggregate:updated -> New patterns learned                    │
│  • insight:discovered -> Cross-pattern correlation              │
│  • retention:expired -> Data purged                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*"The dog observes, but only when invited. The dog learns, but never tells tales."* - κυνικός
