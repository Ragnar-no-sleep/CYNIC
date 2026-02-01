/**
 * Repository Factory - Dependency Injection for Persistence
 *
 * Creates repository instances with injected database connections.
 * Enables testing with mocks and swapping backends.
 *
 * "The kennel that builds all dogs" - κυνικός
 *
 * @module @cynic/persistence/factory
 */

'use strict';

import { JudgmentRepository } from './postgres/repositories/judgments.js';
import { PatternRepository } from './postgres/repositories/patterns.js';
import { UserRepository } from './postgres/repositories/users.js';
import { SessionRepository } from './postgres/repositories/sessions.js';
import { FeedbackRepository } from './postgres/repositories/feedback.js';
import { KnowledgeRepository } from './postgres/repositories/knowledge.js';
import { PoJBlockRepository } from './postgres/repositories/poj-blocks.js';
import { LibraryCacheRepository } from './postgres/repositories/library-cache.js';
import { EcosystemDocsRepository } from './postgres/repositories/ecosystem-docs.js';
import { EScoreHistoryRepository } from './postgres/repositories/escore-history.js';
import { LearningCyclesRepository } from './postgres/repositories/learning-cycles.js';
import { PatternEvolutionRepository } from './postgres/repositories/pattern-evolution.js';
import { UserLearningProfilesRepository } from './postgres/repositories/user-learning-profiles.js';
import { TriggerRepository } from './postgres/repositories/triggers.js';
import { DiscoveryRepository } from './postgres/repositories/discovery.js';
import { ConsciousnessRepository } from './postgres/repositories/consciousness.js';
import { PsychologyRepository } from './postgres/repositories/psychology.js';
import { SessionPatternsRepository } from './postgres/repositories/session-patterns.js';
import { XDataRepository } from './postgres/repositories/x-data.js';

/**
 * Repository definitions for factory registration
 */
const REPOSITORY_DEFINITIONS = {
  judgments: { Class: JudgmentRepository, tags: ['core', 'searchable'] },
  patterns: { Class: PatternRepository, tags: ['core', 'searchable'] },
  users: { Class: UserRepository, tags: ['core'] },
  sessions: { Class: SessionRepository, tags: ['core'] },
  feedback: { Class: FeedbackRepository, tags: ['learning'] },
  knowledge: { Class: KnowledgeRepository, tags: ['core', 'searchable'] },
  pojBlocks: { Class: PoJBlockRepository, tags: ['blockchain'] },
  libraryCache: { Class: LibraryCacheRepository, tags: ['cache'] },
  ecosystemDocs: { Class: EcosystemDocsRepository, tags: ['ecosystem'] },
  escoreHistory: { Class: EScoreHistoryRepository, tags: ['learning'] },
  learningCycles: { Class: LearningCyclesRepository, tags: ['learning'] },
  patternEvolution: { Class: PatternEvolutionRepository, tags: ['emergence'] },
  userLearningProfiles: { Class: UserLearningProfilesRepository, tags: ['learning'] },
  triggers: { Class: TriggerRepository, tags: ['automation'] },
  discovery: { Class: DiscoveryRepository, tags: ['emergence'] },
  consciousness: { Class: ConsciousnessRepository, tags: ['emergence'] },
  psychology: { Class: PsychologyRepository, tags: ['psychology'] },
  sessionPatterns: { Class: SessionPatternsRepository, tags: ['learning', 'emergence'] },
  xData: { Class: XDataRepository, tags: ['external', 'social', 'searchable'] },
};

/**
 * Repository Factory
 *
 * Creates repository instances with injected database connections.
 * Supports mocking for tests and backend swapping.
 *
 * @example
 * // Production
 * const factory = new RepositoryFactory(postgresPool);
 * const repos = factory.createAll();
 *
 * // Testing
 * const mockDb = { query: async () => ({ rows: [] }) };
 * const factory = new RepositoryFactory(mockDb);
 */
export class RepositoryFactory {
  #db;
  #customFactories = new Map();

  /**
   * @param {Object} db - Database connection pool
   */
  constructor(db) {
    this.#db = db;
  }

  /**
   * Create a single repository by name
   *
   * @param {string} name - Repository name (e.g., 'judgments', 'patterns')
   * @returns {Object} Repository instance
   * @throws {Error} If repository name unknown
   *
   * @example
   * const judgments = factory.create('judgments');
   */
  create(name) {
    // Check for custom factory first
    if (this.#customFactories.has(name)) {
      return this.#customFactories.get(name)(this.#db);
    }

    // Check standard definitions
    const def = REPOSITORY_DEFINITIONS[name];
    if (!def) {
      throw new Error(`Unknown repository: ${name}. Available: ${Object.keys(REPOSITORY_DEFINITIONS).join(', ')}`);
    }

    return new def.Class(this.#db);
  }

  /**
   * Create all standard repositories
   *
   * @returns {Object} Object with all repositories
   *
   * @example
   * const repos = factory.createAll();
   * await repos.judgments.create(judgment);
   */
  createAll() {
    const repos = {};

    for (const name of Object.keys(REPOSITORY_DEFINITIONS)) {
      repos[name] = this.create(name);
    }

    // Add custom repositories
    for (const name of this.#customFactories.keys()) {
      if (!repos[name]) {
        repos[name] = this.create(name);
      }
    }

    return repos;
  }

  /**
   * Create repositories by tag
   *
   * @param {string} tag - Tag to filter by
   * @returns {Object} Object with matching repositories
   *
   * @example
   * const learningRepos = factory.createByTag('learning');
   * // { feedback, escoreHistory, learningCycles, userLearningProfiles }
   */
  createByTag(tag) {
    const repos = {};

    for (const [name, def] of Object.entries(REPOSITORY_DEFINITIONS)) {
      if (def.tags.includes(tag)) {
        repos[name] = this.create(name);
      }
    }

    return repos;
  }

  /**
   * Register a custom repository factory
   *
   * Allows extending with new repository types without modifying this file.
   *
   * @param {string} name - Repository name
   * @param {Function} factory - Factory function (db) => Repository
   *
   * @example
   * factory.registerCustom('myRepo', (db) => new MyRepository(db));
   */
  registerCustom(name, factory) {
    this.#customFactories.set(name, factory);
  }

  /**
   * Get all available repository names
   *
   * @returns {string[]} Array of repository names
   */
  getAvailableNames() {
    return [
      ...Object.keys(REPOSITORY_DEFINITIONS),
      ...this.#customFactories.keys(),
    ];
  }

  /**
   * Get all available tags
   *
   * @returns {string[]} Array of unique tags
   */
  getAvailableTags() {
    const tags = new Set();
    for (const def of Object.values(REPOSITORY_DEFINITIONS)) {
      def.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags);
  }

  /**
   * Get repository definition
   *
   * @param {string} name - Repository name
   * @returns {Object|undefined} Definition or undefined
   */
  getDefinition(name) {
    return REPOSITORY_DEFINITIONS[name];
  }
}

/**
 * Create a factory pre-configured for testing
 *
 * @param {Object} [mockDb] - Optional mock database
 * @returns {RepositoryFactory} Factory with mock db
 *
 * @example
 * const factory = createMockFactory();
 * const repos = factory.createAll();
 */
export function createMockFactory(mockDb = null) {
  const db = mockDb ?? {
    query: async () => ({ rows: [], rowCount: 0 }),
  };
  return new RepositoryFactory(db);
}

export default RepositoryFactory;
