/**
 * CYNIC 4-Tier Memory Architecture
 *
 * Implements Vector/Episodic/Semantic/Working memory hierarchy.
 * Each tier has different retrieval strategies and retention policies.
 *
 * "La mémoire à quatre niveaux" - Memory in four levels
 *
 * Inspired by SAFLA's 4-tier memory architecture.
 *
 * @module @cynic/node/memory/tiered-memory
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const MEMORY_CONFIG = {
  // Tier capacities
  vector: {
    maxItems: 10000,
    dimensions: 384,              // Default embedding dimensions
    similarityThreshold: 0.7,
  },
  episodic: {
    maxEpisodes: 500,
    maxAgeMs: 7 * 24 * 3600000,   // 7 days
    compressionRatio: 0.3,        // Compress to 30% after threshold
  },
  semantic: {
    maxFacts: 5000,
    minConfidence: 0.5,
    decayRate: 0.99,
  },
  working: {
    maxItems: 7,                  // Miller's Law (7±2)
    maxAgeMs: 30 * 60000,         // 30 minutes
    refreshOnAccess: true,
  },

  // Cross-tier settings
  promotionThreshold: PHI_INV,    // 61.8% - promote if accessed this often
  demotionThreshold: PHI_INV_2,   // 38.2% - demote if below this
};

// =============================================================================
// MEMORY ITEM
// =============================================================================

/**
 * Base memory item class
 */
export class MemoryItem {
  constructor(data = {}) {
    this.id = data.id || `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.content = data.content || '';
    this.type = data.type || 'generic';
    this.tier = data.tier || 'working';
    this.createdAt = data.createdAt || Date.now();
    this.lastAccessed = data.lastAccessed || Date.now();
    this.accessCount = data.accessCount || 0;
    this.confidence = data.confidence ?? 0.5;
    this.metadata = data.metadata || {};
    this.embedding = data.embedding || null;
    this.tags = data.tags || [];
  }

  /**
   * Record an access
   */
  access() {
    this.lastAccessed = Date.now();
    this.accessCount++;
    return this;
  }

  /**
   * Check if item is stale
   */
  isStale(maxAgeMs) {
    return Date.now() - this.lastAccessed > maxAgeMs;
  }

  /**
   * Calculate importance score for retention
   */
  getImportance() {
    const recency = 1 / (1 + (Date.now() - this.lastAccessed) / 3600000); // Hours decay
    const frequency = Math.log(1 + this.accessCount);
    const confidence = this.confidence;

    // φ-weighted importance
    return (recency * PHI_INV) + (frequency * PHI_INV_2) + (confidence * PHI_INV_2);
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      type: this.type,
      tier: this.tier,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      accessCount: this.accessCount,
      confidence: this.confidence,
      metadata: this.metadata,
      embedding: this.embedding,
      tags: this.tags,
    };
  }

  static fromJSON(json) {
    return new MemoryItem(json);
  }
}

// =============================================================================
// VECTOR MEMORY TIER
// =============================================================================

/**
 * Vector Memory - Dense representations with similarity retrieval
 *
 * Uses embeddings for semantic similarity search.
 * Best for: finding related concepts, semantic matching
 */
export class VectorMemory {
  constructor(config = {}) {
    this.config = { ...MEMORY_CONFIG.vector, ...config };
    this.items = new Map();
    this.index = null; // HNSW index if available

    this.stats = {
      stored: 0,
      retrieved: 0,
      evicted: 0,
    };
  }

  /**
   * Store item with embedding
   */
  async store(item, embedding = null) {
    const memItem = item instanceof MemoryItem ? item : new MemoryItem(item);
    memItem.tier = 'vector';
    memItem.embedding = embedding || memItem.embedding;

    // Check capacity
    if (this.items.size >= this.config.maxItems) {
      this._evictLeastImportant();
    }

    this.items.set(memItem.id, memItem);
    this.stats.stored++;

    return memItem;
  }

  /**
   * Search by similarity
   */
  async search(queryEmbedding, options = {}) {
    const { limit = 10, threshold = this.config.similarityThreshold } = options;
    const results = [];

    for (const item of this.items.values()) {
      if (!item.embedding) continue;

      const similarity = this._cosineSimilarity(queryEmbedding, item.embedding);
      if (similarity >= threshold) {
        results.push({ item, similarity });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    this.stats.retrieved += Math.min(results.length, limit);

    return results.slice(0, limit);
  }

  /**
   * Cosine similarity between two vectors
   * @private
   */
  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Evict least important items
   * @private
   */
  _evictLeastImportant() {
    const items = Array.from(this.items.values());
    items.sort((a, b) => a.getImportance() - b.getImportance());

    // Evict bottom 10%
    const toEvict = Math.ceil(items.length * 0.1);
    for (let i = 0; i < toEvict; i++) {
      this.items.delete(items[i].id);
      this.stats.evicted++;
    }
  }

  getStats() {
    return { ...this.stats, size: this.items.size };
  }
}

// =============================================================================
// EPISODIC MEMORY TIER
// =============================================================================

/**
 * Episode - A complete interaction record
 */
export class Episode {
  constructor(data = {}) {
    this.id = data.id || `ep_${Date.now().toString(36)}`;
    this.type = data.type || 'interaction';
    this.events = data.events || [];
    this.summary = data.summary || null;
    this.startTime = data.startTime || Date.now();
    this.endTime = data.endTime || null;
    this.outcome = data.outcome || null;
    this.compressed = data.compressed || false;
    this.metadata = data.metadata || {};
  }

  addEvent(event) {
    this.events.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
  }

  end(outcome = null) {
    this.endTime = Date.now();
    this.outcome = outcome;
    return this;
  }

  /**
   * Compress episode to summary
   */
  compress() {
    if (this.compressed) return this;

    // Keep only key events
    const keyEvents = this.events.filter(e =>
      e.type === 'decision' ||
      e.type === 'error' ||
      e.type === 'success' ||
      e.important
    );

    this.summary = {
      eventCount: this.events.length,
      keyEvents: keyEvents.slice(0, 10),
      duration: this.endTime ? this.endTime - this.startTime : null,
      outcome: this.outcome,
    };

    this.events = keyEvents;
    this.compressed = true;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      events: this.events,
      summary: this.summary,
      startTime: this.startTime,
      endTime: this.endTime,
      outcome: this.outcome,
      compressed: this.compressed,
      metadata: this.metadata,
    };
  }
}

/**
 * Episodic Memory - Complete interaction records
 *
 * Stores full episodes of interaction for pattern learning.
 * Best for: learning from past sessions, finding similar situations
 */
export class EpisodicMemory {
  constructor(config = {}) {
    this.config = { ...MEMORY_CONFIG.episodic, ...config };
    this.episodes = new Map();
    this.currentEpisode = null;

    this.stats = {
      episodesCreated: 0,
      episodesCompressed: 0,
      episodesEvicted: 0,
    };
  }

  /**
   * Start a new episode
   */
  startEpisode(type = 'interaction', metadata = {}) {
    // End current episode if exists
    if (this.currentEpisode) {
      this.endEpisode();
    }

    this.currentEpisode = new Episode({ type, metadata });
    this.stats.episodesCreated++;
    return this.currentEpisode;
  }

  /**
   * Add event to current episode
   */
  addEvent(event) {
    if (!this.currentEpisode) {
      this.startEpisode();
    }
    this.currentEpisode.addEvent(event);
  }

  /**
   * End current episode
   */
  endEpisode(outcome = null) {
    if (!this.currentEpisode) return null;

    const episode = this.currentEpisode.end(outcome);
    this.episodes.set(episode.id, episode);
    this.currentEpisode = null;

    // Check capacity and compress/evict
    this._manageCapacity();

    return episode;
  }

  /**
   * Find similar episodes
   */
  findSimilar(context, options = {}) {
    const { limit = 5 } = options;
    const results = [];

    for (const episode of this.episodes.values()) {
      const similarity = this._calculateSimilarity(context, episode);
      if (similarity > 0.3) {
        results.push({ episode, similarity });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Calculate similarity between context and episode
   * @private
   */
  _calculateSimilarity(context, episode) {
    let score = 0;

    // Type match
    if (context.type === episode.type) score += 0.3;

    // Outcome match
    if (context.outcome && episode.outcome === context.outcome) score += 0.3;

    // Event type overlap
    if (context.eventTypes && episode.events.length > 0) {
      const episodeTypes = new Set(episode.events.map(e => e.type));
      const overlap = context.eventTypes.filter(t => episodeTypes.has(t));
      score += 0.4 * (overlap.length / context.eventTypes.length);
    }

    return score;
  }

  /**
   * Manage capacity - compress and evict
   * @private
   */
  _manageCapacity() {
    if (this.episodes.size <= this.config.maxEpisodes) return;

    const episodes = Array.from(this.episodes.values());
    episodes.sort((a, b) => a.startTime - b.startTime); // Oldest first

    // Compress old episodes
    const now = Date.now();
    for (const ep of episodes) {
      if (!ep.compressed && now - ep.startTime > this.config.maxAgeMs / 2) {
        ep.compress();
        this.stats.episodesCompressed++;
      }
    }

    // Evict if still over capacity
    while (this.episodes.size > this.config.maxEpisodes) {
      const oldest = episodes.shift();
      if (oldest) {
        this.episodes.delete(oldest.id);
        this.stats.episodesEvicted++;
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      size: this.episodes.size,
      currentEpisode: !!this.currentEpisode,
    };
  }
}

// =============================================================================
// SEMANTIC MEMORY TIER
// =============================================================================

/**
 * Semantic Memory - Factual knowledge and learned patterns
 *
 * Stores facts, patterns, and learned associations.
 * Best for: knowledge retrieval, pattern matching, factual queries
 */
export class SemanticMemory {
  constructor(config = {}) {
    this.config = { ...MEMORY_CONFIG.semantic, ...config };
    this.facts = new Map();
    this.patterns = new Map();
    this.associations = new Map(); // fact -> related facts

    this.stats = {
      factsStored: 0,
      patternsStored: 0,
      factsDecayed: 0,
    };
  }

  /**
   * Store a fact
   */
  storeFact(fact) {
    const item = fact instanceof MemoryItem ? fact : new MemoryItem({
      ...fact,
      type: 'fact',
      tier: 'semantic',
    });

    if (item.confidence < this.config.minConfidence) {
      return null; // Don't store low-confidence facts
    }

    this.facts.set(item.id, item);
    this.stats.factsStored++;

    // Update associations
    this._updateAssociations(item);

    // Check capacity
    if (this.facts.size > this.config.maxFacts) {
      this._decayAndEvict();
    }

    return item;
  }

  /**
   * Store a pattern
   */
  storePattern(pattern) {
    const key = pattern.signature || pattern.name || pattern.id;
    const existing = this.patterns.get(key);

    if (existing) {
      // Update existing pattern
      existing.confidence = (existing.confidence + pattern.confidence) / 2;
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.lastSeen = Date.now();
    } else {
      this.patterns.set(key, {
        ...pattern,
        occurrences: 1,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
      this.stats.patternsStored++;
    }
  }

  /**
   * Query facts by type or tags
   */
  queryFacts(query) {
    const results = [];

    for (const fact of this.facts.values()) {
      let match = true;

      if (query.type && fact.type !== query.type) match = false;
      if (query.tags && !query.tags.every(t => fact.tags.includes(t))) match = false;
      if (query.minConfidence && fact.confidence < query.minConfidence) match = false;

      if (match) {
        fact.access();
        results.push(fact);
      }
    }

    return results;
  }

  /**
   * Get related facts via associations
   */
  getRelated(factId, limit = 5) {
    const related = this.associations.get(factId) || [];
    return related.slice(0, limit).map(id => this.facts.get(id)).filter(Boolean);
  }

  /**
   * Update associations for a fact
   * @private
   */
  _updateAssociations(item) {
    // Simple tag-based association
    for (const tag of item.tags) {
      for (const [id, fact] of this.facts) {
        if (id === item.id) continue;
        if (fact.tags.includes(tag)) {
          // Create bidirectional association
          if (!this.associations.has(item.id)) {
            this.associations.set(item.id, []);
          }
          if (!this.associations.has(id)) {
            this.associations.set(id, []);
          }
          this.associations.get(item.id).push(id);
          this.associations.get(id).push(item.id);
        }
      }
    }
  }

  /**
   * Apply decay and evict low-confidence facts
   * @private
   */
  _decayAndEvict() {
    for (const [id, fact] of this.facts) {
      // Apply decay
      fact.confidence *= this.config.decayRate;

      // Evict if below threshold
      if (fact.confidence < this.config.minConfidence * 0.5) {
        this.facts.delete(id);
        this.associations.delete(id);
        this.stats.factsDecayed++;
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      factsSize: this.facts.size,
      patternsSize: this.patterns.size,
      associationsSize: this.associations.size,
    };
  }
}

// =============================================================================
// WORKING MEMORY TIER
// =============================================================================

/**
 * Working Memory - Active task focus
 *
 * Short-term memory for current task context.
 * Limited capacity (Miller's Law: 7±2 items).
 * Best for: current task context, immediate recall
 */
export class WorkingMemory {
  constructor(config = {}) {
    this.config = { ...MEMORY_CONFIG.working, ...config };
    this.items = [];
    this.focus = null; // Current focus item

    this.stats = {
      itemsAdded: 0,
      itemsEvicted: 0,
      focusChanges: 0,
    };
  }

  /**
   * Add item to working memory
   */
  add(item) {
    const memItem = item instanceof MemoryItem ? item : new MemoryItem({
      ...item,
      tier: 'working',
    });

    // Remove stale items
    this._cleanStale();

    // Check capacity
    while (this.items.length >= this.config.maxItems) {
      this._evictLeastRecent();
    }

    this.items.push(memItem);
    this.stats.itemsAdded++;

    return memItem;
  }

  /**
   * Set focus item
   */
  setFocus(item) {
    this.focus = item instanceof MemoryItem ? item : new MemoryItem({
      ...item,
      tier: 'working',
    });
    this.stats.focusChanges++;
    return this.focus;
  }

  /**
   * Get current focus
   */
  getFocus() {
    return this.focus;
  }

  /**
   * Get all items in working memory
   */
  getAll() {
    this._cleanStale();
    return [...this.items];
  }

  /**
   * Get item by type
   */
  getByType(type) {
    return this.items.filter(i => i.type === type);
  }

  /**
   * Access item (refresh timestamp)
   */
  access(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (item && this.config.refreshOnAccess) {
      item.access();
    }
    return item;
  }

  /**
   * Clear working memory
   */
  clear() {
    this.items = [];
    this.focus = null;
  }

  /**
   * Remove stale items
   * @private
   */
  _cleanStale() {
    this.items = this.items.filter(i => !i.isStale(this.config.maxAgeMs));
  }

  /**
   * Evict least recently accessed item
   * @private
   */
  _evictLeastRecent() {
    if (this.items.length === 0) return;

    // Find least recently accessed
    let minIndex = 0;
    let minTime = this.items[0].lastAccessed;

    for (let i = 1; i < this.items.length; i++) {
      if (this.items[i].lastAccessed < minTime) {
        minTime = this.items[i].lastAccessed;
        minIndex = i;
      }
    }

    this.items.splice(minIndex, 1);
    this.stats.itemsEvicted++;
  }

  getStats() {
    return {
      ...this.stats,
      size: this.items.length,
      capacity: this.config.maxItems,
      hasFocus: !!this.focus,
    };
  }
}

// =============================================================================
// TIERED MEMORY MANAGER
// =============================================================================

/**
 * TieredMemory - Unified 4-tier memory manager
 *
 * Coordinates all four memory tiers with automatic promotion/demotion.
 */
export class TieredMemory {
  constructor(options = {}) {
    this.config = { ...MEMORY_CONFIG, ...options.config };

    // Initialize tiers
    this.vector = new VectorMemory(options.vector);
    this.episodic = new EpisodicMemory(options.episodic);
    this.semantic = new SemanticMemory(options.semantic);
    this.working = new WorkingMemory(options.working);

    // Persistence
    this.persistence = options.persistence || null;

    // Stats
    this.stats = {
      promotions: 0,
      demotions: 0,
    };
  }

  // ===========================================================================
  // UNIFIED API
  // ===========================================================================

  /**
   * Store item in appropriate tier
   */
  async store(item, options = {}) {
    const tier = options.tier || this._selectTier(item);

    switch (tier) {
      case 'vector':
        return this.vector.store(item, options.embedding);
      case 'episodic':
        // Episodic stores episodes, not items
        if (this.episodic.currentEpisode) {
          this.episodic.addEvent(item);
        }
        return item;
      case 'semantic':
        if (item.type === 'pattern') {
          this.semantic.storePattern(item);
        } else {
          this.semantic.storeFact(item);
        }
        return item;
      case 'working':
      default:
        return this.working.add(item);
    }
  }

  /**
   * Query across all tiers
   */
  async query(queryParams = {}) {
    const results = {
      working: [],
      semantic: [],
      episodic: [],
      vector: [],
    };

    // Query working memory first (fastest)
    if (queryParams.type) {
      results.working = this.working.getByType(queryParams.type);
    } else {
      results.working = this.working.getAll();
    }

    // Query semantic memory
    results.semantic = this.semantic.queryFacts(queryParams);

    // Query episodic memory
    if (queryParams.episodeContext) {
      results.episodic = this.episodic.findSimilar(queryParams.episodeContext)
        .map(r => r.episode);
    }

    // Query vector memory (if embedding provided)
    if (queryParams.embedding) {
      const vectorResults = await this.vector.search(queryParams.embedding, {
        limit: queryParams.limit || 10,
      });
      results.vector = vectorResults.map(r => r.item);
    }

    return results;
  }

  /**
   * Get item from any tier
   */
  get(itemId) {
    // Check working first
    const working = this.working.access(itemId);
    if (working) return working;

    // Check semantic
    const semantic = this.semantic.facts.get(itemId);
    if (semantic) {
      semantic.access();
      return semantic;
    }

    // Check vector
    const vector = this.vector.items.get(itemId);
    if (vector) {
      vector.access();
      return vector;
    }

    return null;
  }

  // ===========================================================================
  // TIER SELECTION & PROMOTION
  // ===========================================================================

  /**
   * Select appropriate tier for item
   * @private
   */
  _selectTier(item) {
    // Facts go to semantic
    if (item.type === 'fact' || item.type === 'pattern') {
      return 'semantic';
    }

    // Items with embeddings go to vector
    if (item.embedding) {
      return 'vector';
    }

    // Events go to episodic
    if (item.type === 'event' || item.type === 'interaction') {
      return 'episodic';
    }

    // Default to working
    return 'working';
  }

  /**
   * Promote item to higher tier
   */
  promote(item) {
    const tierOrder = ['working', 'semantic', 'vector'];
    const currentIndex = tierOrder.indexOf(item.tier);

    if (currentIndex < tierOrder.length - 1) {
      const newTier = tierOrder[currentIndex + 1];
      item.tier = newTier;
      this.store(item, { tier: newTier });
      this.stats.promotions++;
    }
  }

  /**
   * Demote item to lower tier
   */
  demote(item) {
    const tierOrder = ['working', 'semantic', 'vector'];
    const currentIndex = tierOrder.indexOf(item.tier);

    if (currentIndex > 0) {
      const newTier = tierOrder[currentIndex - 1];
      item.tier = newTier;
      // Remove from current tier
      if (currentIndex === 2) this.vector.items.delete(item.id);
      if (currentIndex === 1) this.semantic.facts.delete(item.id);
      // Add to new tier
      this.store(item, { tier: newTier });
      this.stats.demotions++;
    }
  }

  // ===========================================================================
  // EPISODIC API
  // ===========================================================================

  startEpisode(type, metadata) {
    return this.episodic.startEpisode(type, metadata);
  }

  addEvent(event) {
    return this.episodic.addEvent(event);
  }

  endEpisode(outcome) {
    return this.episodic.endEpisode(outcome);
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  getStats() {
    return {
      ...this.stats,
      tiers: {
        vector: this.vector.getStats(),
        episodic: this.episodic.getStats(),
        semantic: this.semantic.getStats(),
        working: this.working.getStats(),
      },
    };
  }

  /**
   * Get memory summary for context injection
   */
  getSummary() {
    return {
      working: this.working.getAll().map(i => ({
        id: i.id,
        type: i.type,
        content: typeof i.content === 'string' ? i.content.substring(0, 100) : i.content,
      })),
      focus: this.working.getFocus(),
      recentFacts: Array.from(this.semantic.facts.values())
        .slice(0, 5)
        .map(f => ({ type: f.type, content: f.content })),
      activePatterns: Array.from(this.semantic.patterns.values())
        .filter(p => p.occurrences > 2)
        .slice(0, 5),
      currentEpisode: this.episodic.currentEpisode?.id,
    };
  }
}

/**
 * Create a TieredMemory instance
 */
export function createTieredMemory(options = {}) {
  return new TieredMemory(options);
}

export default {
  TieredMemory,
  VectorMemory,
  EpisodicMemory,
  SemanticMemory,
  WorkingMemory,
  MemoryItem,
  Episode,
  MEMORY_CONFIG,
  createTieredMemory,
};
