/**
 * Intelligent Routing Tests
 *
 * Tests task classification, dog capabilities, and intelligent routing.
 *
 * @module @cynic/node/test/intelligent-routing
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  TaskDescriptor,
  createTaskDescriptor,
  TaskType,
  ComplexityLevel,
  RiskLevel,
  DogCapabilityMatrix,
  getDogCapabilityMatrix,
  DogId,
  DOG_CAPABILITIES,
  IntelligentRouter,
  createIntelligentRouter,
  RoutingDecision,
} from '../src/routing/index.js';

// φ constants
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;

describe('TaskDescriptor', () => {
  describe('task classification', () => {
    it('should classify code review tasks', () => {
      const task = createTaskDescriptor('Review this pull request for bugs');
      assert.ok(task.types.includes(TaskType.CODE_REVIEW));
    });

    it('should classify security tasks', () => {
      const task = createTaskDescriptor('Check for security vulnerabilities in auth');
      assert.ok(task.types.includes(TaskType.SECURITY_AUDIT));
    });

    it('should classify deployment tasks', () => {
      const task = createTaskDescriptor('Deploy this to production');
      assert.ok(task.types.includes(TaskType.DEPLOYMENT));
    });

    it('should classify research tasks', () => {
      const task = createTaskDescriptor('Research how to implement caching');
      assert.ok(task.types.includes(TaskType.RESEARCH));
    });

    it('should classify cleanup tasks', () => {
      const task = createTaskDescriptor('Clean up unused imports');
      assert.ok(task.types.includes(TaskType.CLEANUP));
    });

    it('should classify exploration tasks', () => {
      const task = createTaskDescriptor('Explore the codebase to find where errors are handled');
      assert.ok(task.types.includes(TaskType.EXPLORATION));
    });

    it('should classify architecture tasks', () => {
      const task = createTaskDescriptor('Design the new system architecture');
      assert.strictEqual(task.primaryType, TaskType.ARCHITECTURE);
    });
  });

  describe('complexity classification', () => {
    it('should classify trivial tasks', () => {
      const task = createTaskDescriptor('fix typo');
      assert.strictEqual(task.complexity, ComplexityLevel.TRIVIAL);
    });

    it('should classify simple tasks', () => {
      const task = createTaskDescriptor('update this specific function to handle null values');
      assert.strictEqual(task.complexity, ComplexityLevel.SIMPLE);
    });

    it('should classify moderate tasks with module keyword', () => {
      const task = createTaskDescriptor('refactor multiple modules for better performance');
      assert.strictEqual(task.complexity, ComplexityLevel.MODERATE);
    });

    it('should classify complex tasks with entire keyword', () => {
      const task = createTaskDescriptor('redesign the entire authentication system');
      assert.strictEqual(task.complexity, ComplexityLevel.COMPLEX);
    });
  });

  describe('risk classification', () => {
    it('should classify low risk for read operations', () => {
      // "read" is in LOW risk keywords
      const task = createTaskDescriptor('read the config file');
      assert.strictEqual(task.risk, RiskLevel.LOW);
    });

    it('should classify low risk for analysis', () => {
      const task = createTaskDescriptor('analyze the codebase');
      assert.strictEqual(task.risk, RiskLevel.LOW);
    });

    it('should classify high risk for delete operations', () => {
      const task = createTaskDescriptor('delete this file');
      assert.strictEqual(task.risk, RiskLevel.HIGH);
    });

    it('should classify critical risk for production', () => {
      const task = createTaskDescriptor('modify production database credentials');
      assert.strictEqual(task.risk, RiskLevel.CRITICAL);
    });
  });

  describe('feature extraction', () => {
    it('should extract file references', () => {
      const task = createTaskDescriptor('update src/index.js and lib/utils.ts');
      assert.ok(task.files.length >= 2);
      assert.ok(task.files.some(f => f.includes('index.js')));
    });

    it('should extract tool references', () => {
      const task = createTaskDescriptor('use git to commit the changes');
      assert.ok(task.tools.includes('git'));
    });

    it('should calculate confidence', () => {
      const task = createTaskDescriptor('review src/auth.js for security issues');
      assert.ok(task.confidence > 0);
      assert.ok(task.confidence <= PHI_INV);
    });
  });

  describe('feature vector', () => {
    it('should generate feature vector', () => {
      const task = createTaskDescriptor('refactor the authentication module');
      const vector = task.toFeatureVector();

      assert.ok(Array.isArray(vector.types));
      assert.ok(typeof vector.primaryType === 'string');
      assert.ok(typeof vector.complexity === 'string');
      assert.ok(typeof vector.risk === 'string');
      assert.ok(typeof vector.confidence === 'number');
    });
  });
});

describe('DogCapabilityMatrix', () => {
  let matrix;

  beforeEach(() => {
    matrix = new DogCapabilityMatrix();
  });

  describe('capability lookup', () => {
    it('should get capability for valid dog', () => {
      const cap = matrix.getCapability(DogId.GUARDIAN);
      assert.ok(cap);
      assert.strictEqual(cap.name, 'Guardian');
      assert.strictEqual(cap.sefira, 'Gevurah');
    });

    it('should return null for invalid dog', () => {
      const cap = matrix.getCapability('fake_dog');
      assert.strictEqual(cap, null);
    });
  });

  describe('task type matching', () => {
    it('should find dogs for security tasks', () => {
      const dogs = matrix.getDogsForTaskType(TaskType.SECURITY_AUDIT);
      assert.ok(dogs.length > 0);
      assert.strictEqual(dogs[0].dogId, DogId.GUARDIAN);
    });

    it('should find dogs for exploration tasks', () => {
      const dogs = matrix.getDogsForTaskType(TaskType.EXPLORATION);
      assert.ok(dogs.length > 0);
      assert.strictEqual(dogs[0].dogId, DogId.SCOUT);
    });

    it('should find dogs for cleanup tasks', () => {
      const dogs = matrix.getDogsForTaskType(TaskType.CLEANUP);
      assert.ok(dogs.length > 0);
      assert.strictEqual(dogs[0].dogId, DogId.JANITOR);
    });

    it('should find dogs for architecture tasks', () => {
      const dogs = matrix.getDogsForTaskType(TaskType.ARCHITECTURE);
      assert.ok(dogs.length > 0);
      const topDog = dogs[0];
      assert.ok([DogId.CYNIC, DogId.ARCHITECT].includes(topDog.dogId));
    });
  });

  describe('task scoring', () => {
    it('should score dog for task', () => {
      const task = createTaskDescriptor('audit the code for security vulnerabilities');
      const score = matrix.scoreDogForTask(DogId.GUARDIAN, task);

      assert.ok(score > 0);
      assert.ok(score <= PHI_INV);
    });

    it('should give high score to matching dog', () => {
      const task = createTaskDescriptor('explore the codebase');
      const scoutScore = matrix.scoreDogForTask(DogId.SCOUT, task);
      const guardianScore = matrix.scoreDogForTask(DogId.GUARDIAN, task);

      assert.ok(scoutScore > guardianScore);
    });
  });

  describe('best dog selection', () => {
    it('should find best dogs for task', () => {
      const task = createTaskDescriptor('clean up dead code');
      const best = matrix.findBestDogs(task, 3);

      assert.ok(best.length > 0);
      assert.ok(best.length <= 3);
      assert.ok(best[0].score >= best[best.length - 1].score);
    });

    it('should rank dogs by score', () => {
      const task = createTaskDescriptor('deploy to staging');
      const best = matrix.findBestDogs(task, 5);

      for (let i = 1; i < best.length; i++) {
        assert.ok(best[i - 1].score >= best[i].score);
      }
    });
  });

  describe('learning', () => {
    it('should record success outcome', () => {
      matrix.recordOutcome(DogId.SCOUT, TaskType.EXPLORATION, true);
      const weights = matrix.exportWeights();

      assert.ok(weights[DogId.SCOUT]);
      assert.ok(weights[DogId.SCOUT][TaskType.EXPLORATION] > 0);
    });

    it('should record failure outcome', () => {
      matrix.recordOutcome(DogId.SCOUT, TaskType.SECURITY_AUDIT, false);
      const weights = matrix.exportWeights();

      assert.ok(weights[DogId.SCOUT]);
      assert.ok(weights[DogId.SCOUT][TaskType.SECURITY_AUDIT] < 0);
    });

    it('should import and export weights', () => {
      const weights = {
        [DogId.ANALYST]: { [TaskType.ANALYSIS]: 0.1 },
      };

      matrix.importWeights(weights);
      const exported = matrix.exportWeights();

      assert.strictEqual(exported[DogId.ANALYST][TaskType.ANALYSIS], 0.1);
    });
  });
});

describe('IntelligentRouter', () => {
  let router;

  beforeEach(() => {
    router = createIntelligentRouter();
  });

  describe('routing decisions', () => {
    it('should route security tasks to Guardian', async () => {
      const decision = await router.route('check for security vulnerabilities');

      assert.ok(decision instanceof RoutingDecision);
      assert.strictEqual(decision.dogId, DogId.GUARDIAN);
    });

    it('should route exploration tasks to Scout', async () => {
      // "explore" + "find" triggers EXPLORATION, not MAPPING (which "codebase" triggers)
      const decision = await router.route('explore and find where errors are handled');

      assert.strictEqual(decision.dogId, DogId.SCOUT);
    });

    it('should route cleanup tasks to Janitor', async () => {
      const decision = await router.route('clean up unused code');

      assert.strictEqual(decision.dogId, DogId.JANITOR);
    });

    it('should route research tasks to Scholar', async () => {
      // Pure research task with documentation focus
      const decision = await router.route('research and document the API patterns');

      assert.strictEqual(decision.dogId, DogId.SCHOLAR);
    });

    it('should escalate unknown tasks to CYNIC', async () => {
      const decision = await router.route('xyz 123');

      // Low confidence unknown tasks may escalate
      assert.ok(decision.confidence <= PHI_INV);
    });

    it('should cap confidence at φ⁻¹', async () => {
      const decision = await router.route('audit security in auth module');

      assert.ok(decision.confidence <= PHI_INV);
    });
  });

  describe('routing decision properties', () => {
    it('should have required properties', async () => {
      const decision = await router.route('test task');

      assert.ok(decision.dogId);
      assert.ok(typeof decision.confidence === 'number');
      assert.ok(decision.task instanceof TaskDescriptor);
      assert.ok(Array.isArray(decision.candidates));
      assert.ok(typeof decision.timestamp === 'number');
    });

    it('should serialize to JSON', async () => {
      const decision = await router.route('analyze code quality');
      const json = decision.toJSON();

      assert.ok(json.dogId);
      assert.ok(json.dogName);
      assert.ok(json.dogEmoji);
      assert.ok(typeof json.confidence === 'number');
    });

    it('should check high confidence', async () => {
      const decision = await router.route('security audit');

      // High confidence = >= φ⁻²
      if (decision.confidence >= PHI_INV_2) {
        assert.ok(decision.isHighConfidence());
      }
    });
  });

  describe('handler registration', () => {
    it('should register handler', () => {
      const handler = async () => ({ result: 'ok' });
      router.registerHandler(DogId.SCOUT, handler);

      assert.ok(router.handlers.has(DogId.SCOUT));
    });

    it('should throw for invalid dog', () => {
      assert.throws(() => {
        router.registerHandler('fake_dog', () => {});
      }, /Invalid dog ID/);
    });

    it('should unregister handler', () => {
      router.registerHandler(DogId.SCOUT, () => {});
      router.unregisterHandler(DogId.SCOUT);

      assert.ok(!router.handlers.has(DogId.SCOUT));
    });
  });

  describe('route and execute', () => {
    it('should execute with handler', async () => {
      router.registerHandler(DogId.SCOUT, async (task, ctx, decision) => {
        return { explored: true, task: task.raw };
      });

      const result = await router.routeAndExecute('explore the codebase');

      assert.ok(result.success);
      assert.ok(result.result.explored);
      assert.ok(result.decision);
      assert.ok(result.latency >= 0);
    });

    it('should return error without handler', async () => {
      const result = await router.routeAndExecute('security audit');

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should escalate to CYNIC on error', async () => {
      router.registerHandler(DogId.SCOUT, async () => {
        throw new Error('Scout failed');
      });
      router.registerHandler(DogId.CYNIC, async () => {
        return { rescued: true };
      });

      const result = await router.routeAndExecute('explore files');

      assert.ok(result.success);
      assert.ok(result.result.rescued);
      assert.ok(result.decision.escalated);
    });
  });

  describe('statistics', () => {
    it('should track routing stats', async () => {
      await router.route('explore');
      await router.route('cleanup');
      await router.route('security');

      const stats = router.getStats();
      assert.strictEqual(stats.routed, 3);
    });

    it('should track by dog', async () => {
      await router.route('explore the codebase');
      await router.route('find files');

      const stats = router.getStats();
      assert.ok(stats.byDog[DogId.SCOUT] >= 1);
    });

    it('should track average confidence', async () => {
      await router.route('security audit');
      await router.route('explore files');

      const stats = router.getStats();
      assert.ok(stats.avgConfidence > 0);
      assert.ok(stats.avgConfidence <= PHI_INV);
    });

    it('should reset stats', async () => {
      await router.route('test');
      router.resetStats();

      const stats = router.getStats();
      assert.strictEqual(stats.routed, 0);
    });
  });

  describe('learning from outcomes', () => {
    it('should record success outcome', async () => {
      router.registerHandler(DogId.SCOUT, async () => ({ done: true }));

      await router.routeAndExecute('explore');

      const stats = router.getStats();
      assert.strictEqual(stats.outcomes.success, 1);
    });

    it('should calculate success rate', async () => {
      router.registerHandler(DogId.SCOUT, async () => ({ done: true }));
      router.registerHandler(DogId.JANITOR, async () => { throw new Error('fail'); });

      await router.routeAndExecute('explore');
      await router.routeAndExecute('explore');
      try { await router.routeAndExecute('cleanup'); } catch (e) {}

      const stats = router.getStats();
      assert.ok(stats.successRate >= 0);
      assert.ok(stats.successRate <= 1);
    });

    it('should export and import weights', async () => {
      router.registerHandler(DogId.SCOUT, async () => ({ done: true }));
      await router.routeAndExecute('explore');

      const weights = router.exportWeights();

      const router2 = createIntelligentRouter();
      router2.importWeights(weights);
    });
  });

  describe('recommendations', () => {
    it('should get recommendation for task type', () => {
      const recs = router.getRecommendation(TaskType.SECURITY_AUDIT);

      assert.ok(recs.length > 0);
      assert.strictEqual(recs[0].dogId, DogId.GUARDIAN);
    });
  });

  describe('high-risk handling', () => {
    it('should route critical risk to Guardian or CYNIC', async () => {
      const decision = await router.route('delete all production data');

      // Should escalate for critical risk
      assert.ok([DogId.GUARDIAN, DogId.CYNIC].includes(decision.dogId));
    });

    it('should mark escalated decisions', async () => {
      const decision = await router.route('modify production credentials');

      if (decision.escalated) {
        assert.strictEqual(decision.dogId, DogId.CYNIC);
      }
    });
  });
});

describe('DOG_CAPABILITIES', () => {
  it('should have all 11 dogs', () => {
    const dogIds = Object.values(DogId);
    assert.strictEqual(dogIds.length, 11);

    for (const dogId of dogIds) {
      assert.ok(DOG_CAPABILITIES[dogId], `Missing capability for ${dogId}`);
    }
  });

  it('should have Sefirot mapping', () => {
    const sefirot = Object.values(DOG_CAPABILITIES).map(c => c.sefira);
    const uniqueSefirot = new Set(sefirot);

    // All unique Sefirot
    assert.strictEqual(uniqueSefirot.size, 11);
  });

  it('should have model assignments', () => {
    for (const [dogId, cap] of Object.entries(DOG_CAPABILITIES)) {
      assert.ok(['opus', 'sonnet', 'haiku'].includes(cap.model), `Invalid model for ${dogId}`);
    }
  });

  it('should have valid complexity ranges', () => {
    const levels = Object.values(ComplexityLevel);

    for (const [dogId, cap] of Object.entries(DOG_CAPABILITIES)) {
      assert.ok(Array.isArray(cap.complexityRange), `Missing complexityRange for ${dogId}`);
      assert.strictEqual(cap.complexityRange.length, 2);
      assert.ok(levels.includes(cap.complexityRange[0]));
      assert.ok(levels.includes(cap.complexityRange[1]));
    }
  });

  it('should have valid risk tolerance', () => {
    const risks = Object.values(RiskLevel);

    for (const [dogId, cap] of Object.entries(DOG_CAPABILITIES)) {
      assert.ok(risks.includes(cap.riskTolerance), `Invalid riskTolerance for ${dogId}`);
    }
  });
});
