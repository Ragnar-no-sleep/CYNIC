/**
 * Dog Pipeline Tests
 *
 * Tests stream chaining between dogs.
 *
 * @module @cynic/node/test/dog-pipeline
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DogPipeline,
  StreamContext,
  PipelineStage,
  PipelineTemplates,
  createDogPipeline,
  DogId,
  DOG_CAPABILITIES,
} from '../src/routing/index.js';

describe('StreamContext', () => {
  let context;

  beforeEach(() => {
    context = new StreamContext({
      pipelineId: 'test_pipe',
      originalInput: 'test input',
      metadata: { test: true },
    });
  });

  describe('initialization', () => {
    it('should initialize with correct values', () => {
      assert.strictEqual(context.pipelineId, 'test_pipe');
      assert.strictEqual(context.originalInput, 'test input');
      assert.strictEqual(context.currentInput, 'test input');
      assert.strictEqual(context.currentStage, 0);
      assert.ok(Array.isArray(context.stages));
      assert.ok(Array.isArray(context.outputs));
    });
  });

  describe('recording stages', () => {
    it('should record successful stage', () => {
      const stage = context.recordStage({
        dogId: DogId.SCOUT,
        output: 'scout output',
        latency: 100,
        success: true,
      });

      assert.strictEqual(stage.index, 0);
      assert.strictEqual(stage.dogId, DogId.SCOUT);
      assert.strictEqual(stage.output, 'scout output');
      assert.strictEqual(stage.latency, 100);
      assert.strictEqual(stage.success, true);
      assert.strictEqual(context.currentStage, 1);
      assert.strictEqual(context.currentInput, 'scout output');
    });

    it('should record failed stage', () => {
      context.recordStage({
        dogId: DogId.SCOUT,
        output: null,
        latency: 50,
        success: false,
        error: 'Something failed',
      });

      assert.strictEqual(context.errors.length, 1);
      assert.strictEqual(context.errors[0].error, 'Something failed');
    });

    it('should chain inputs between stages', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'output1', latency: 100 });
      context.recordStage({ dogId: DogId.ANALYST, output: 'output2', latency: 100 });

      assert.strictEqual(context.stages.length, 2);
      assert.strictEqual(context.stages[1].input, 'output1');
      assert.strictEqual(context.currentInput, 'output2');
    });
  });

  describe('abort', () => {
    it('should abort with reason', () => {
      context.abort('Manual abort');

      assert.strictEqual(context.aborted, true);
      assert.strictEqual(context.abortReason, 'Manual abort');
      assert.ok(context.completedAt);
    });
  });

  describe('metrics', () => {
    it('should calculate total latency', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'a', latency: 100 });
      context.recordStage({ dogId: DogId.ANALYST, output: 'b', latency: 150 });
      context.recordStage({ dogId: DogId.ARCHITECT, output: 'c', latency: 200 });

      assert.strictEqual(context.getTotalLatency(), 450);
    });

    it('should get final output', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'first', latency: 100 });
      context.recordStage({ dogId: DogId.ANALYST, output: 'second', latency: 100 });
      context.recordStage({ dogId: DogId.ARCHITECT, output: 'final', latency: 100 });

      assert.strictEqual(context.getFinalOutput(), 'final');
    });

    it('should check success', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'a', latency: 100, success: true });
      context.complete();

      assert.strictEqual(context.isSuccessful(), true);
    });

    it('should detect failure', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: null, latency: 100, success: false, error: 'fail' });

      assert.strictEqual(context.isSuccessful(), false);
    });
  });

  describe('output retrieval', () => {
    it('should get output from specific dog', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'scout-data', latency: 100 });
      context.recordStage({ dogId: DogId.ANALYST, output: 'analyst-data', latency: 100 });

      assert.strictEqual(context.getOutputFrom(DogId.SCOUT), 'scout-data');
      assert.strictEqual(context.getOutputFrom(DogId.ANALYST), 'analyst-data');
      assert.strictEqual(context.getOutputFrom(DogId.GUARDIAN), null);
    });

    it('should get stage by index', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'a', latency: 100 });

      const stage = context.getStage(0);
      assert.strictEqual(stage.dogId, DogId.SCOUT);
      assert.strictEqual(context.getStage(5), null);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      context.recordStage({ dogId: DogId.SCOUT, output: 'a', latency: 100 });
      context.complete();

      const json = context.toJSON();

      assert.strictEqual(json.pipelineId, 'test_pipe');
      assert.strictEqual(json.stageCount, 1);
      assert.ok(Array.isArray(json.stages));
      assert.strictEqual(json.successful, true);
    });
  });
});

describe('PipelineStage', () => {
  it('should create stage with dogId', () => {
    const stage = new PipelineStage({ dogId: DogId.SCOUT });

    assert.strictEqual(stage.dogId, DogId.SCOUT);
    assert.strictEqual(stage.optional, false);
    assert.strictEqual(stage.timeout, 30000);
  });

  it('should transform input', () => {
    const stage = new PipelineStage({
      dogId: DogId.SCOUT,
      transform: (input) => input.toUpperCase(),
    });

    const context = new StreamContext({
      pipelineId: 'test',
      originalInput: 'hello',
    });

    assert.strictEqual(stage.transformInput(context), 'HELLO');
  });

  it('should validate output', () => {
    const stage = new PipelineStage({
      dogId: DogId.SCOUT,
      validate: (output) => ({
        valid: output.length > 5,
        reason: 'Output too short',
      }),
    });

    const context = new StreamContext({ pipelineId: 'test', originalInput: 'x' });

    assert.strictEqual(stage.validateOutput('ab', context).valid, false);
    assert.strictEqual(stage.validateOutput('abcdef', context).valid, true);
  });
});

describe('PipelineTemplates', () => {
  it('should have predefined templates', () => {
    assert.ok(PipelineTemplates.EXPLORE_ANALYZE_BUILD);
    assert.ok(PipelineTemplates.RESEARCH_DOCUMENT);
    assert.ok(PipelineTemplates.SECURITY_AUDIT);
    assert.ok(PipelineTemplates.CLEANUP_DEPLOY);
    assert.ok(PipelineTemplates.DEEP_ANALYSIS);
    assert.ok(PipelineTemplates.SYNTHESIS);
  });

  it('should have valid dog IDs in templates', () => {
    for (const [name, stages] of Object.entries(PipelineTemplates)) {
      for (const stage of stages) {
        assert.ok(DOG_CAPABILITIES[stage.dogId], `Invalid dogId in ${name}: ${stage.dogId}`);
      }
    }
  });
});

describe('DogPipeline', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = createDogPipeline();
  });

  describe('handler registration', () => {
    it('should register handler', () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => `scouted: ${input}`);

      assert.ok(pipeline.handlers.has(DogId.SCOUT));
    });
  });

  describe('chain creation', () => {
    it('should create chain from dog IDs', () => {
      const stages = pipeline.chain(DogId.SCOUT, DogId.ANALYST, DogId.ARCHITECT);

      assert.strictEqual(stages.length, 3);
      assert.strictEqual(stages[0].dogId, DogId.SCOUT);
      assert.strictEqual(stages[1].dogId, DogId.ANALYST);
      assert.strictEqual(stages[2].dogId, DogId.ARCHITECT);
    });

    it('should create from template', () => {
      const stages = pipeline.fromTemplate('EXPLORE_ANALYZE_BUILD');

      assert.strictEqual(stages.length, 3);
      assert.strictEqual(stages[0].dogId, DogId.SCOUT);
    });

    it('should throw for unknown template', () => {
      assert.throws(() => {
        pipeline.fromTemplate('NONEXISTENT');
      }, /Unknown template/);
    });
  });

  describe('execution', () => {
    it('should execute simple pipeline', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => `scouted: ${input}`);
      pipeline.registerHandler(DogId.ANALYST, async (input) => `analyzed: ${input}`);

      const stages = pipeline.chain(DogId.SCOUT, DogId.ANALYST);
      const context = await pipeline.execute(stages, 'test');

      assert.ok(context.isSuccessful());
      assert.strictEqual(context.stages.length, 2);
      assert.strictEqual(context.getFinalOutput(), 'analyzed: scouted: test');
    });

    it('should pass output between stages', async () => {
      pipeline.registerHandler(DogId.SCOUT, async () => ({ data: 'scout-data' }));
      pipeline.registerHandler(DogId.ANALYST, async (input) => ({
        analysis: `analyzed-${input.data}`,
      }));

      const stages = pipeline.chain(DogId.SCOUT, DogId.ANALYST);
      const context = await pipeline.execute(stages, 'initial');

      assert.deepStrictEqual(context.getFinalOutput(), { analysis: 'analyzed-scout-data' });
    });

    it('should abort on missing handler', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      // No ANALYST handler

      const stages = pipeline.chain(DogId.SCOUT, DogId.ANALYST);
      const context = await pipeline.execute(stages, 'test');

      assert.strictEqual(context.aborted, true);
      assert.ok(context.abortReason.includes('No handler'));
    });

    it('should skip optional stage without handler', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => `scouted: ${input}`);
      pipeline.registerHandler(DogId.ARCHITECT, async (input) => `built: ${input}`);

      const stages = [
        new PipelineStage({ dogId: DogId.SCOUT }),
        new PipelineStage({ dogId: DogId.ANALYST, optional: true }),
        new PipelineStage({ dogId: DogId.ARCHITECT }),
      ];

      const context = await pipeline.execute(stages, 'test');

      assert.ok(context.isSuccessful());
      assert.strictEqual(context.stages.length, 2);
      assert.strictEqual(context.getFinalOutput(), 'built: scouted: test');
    });

    it('should handle stage errors', async () => {
      pipeline.registerHandler(DogId.SCOUT, async () => {
        throw new Error('Scout failed');
      });

      const stages = pipeline.chain(DogId.SCOUT);
      const context = await pipeline.execute(stages, 'test');

      assert.strictEqual(context.aborted, true);
      assert.ok(context.abortReason.includes('Scout failed'));
    });

    it('should continue on error when configured', async () => {
      const continueOnErrorPipeline = createDogPipeline({ continueOnError: true });
      continueOnErrorPipeline.registerHandler(DogId.SCOUT, async () => {
        throw new Error('Scout failed');
      });
      continueOnErrorPipeline.registerHandler(DogId.ANALYST, async (input) => `analyzed: ${input}`);

      const stages = continueOnErrorPipeline.chain(DogId.SCOUT, DogId.ANALYST);
      const context = await continueOnErrorPipeline.execute(stages, 'test');

      assert.strictEqual(context.stages.length, 2);
      assert.strictEqual(context.errors.length, 1);
      assert.strictEqual(context.isSuccessful(), false);
    });
  });

  describe('executeChain', () => {
    it('should execute chain shorthand', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => `[scout:${input}]`);
      pipeline.registerHandler(DogId.ANALYST, async (input) => `[analyst:${input}]`);

      const context = await pipeline.executeChain('start', DogId.SCOUT, DogId.ANALYST);

      assert.ok(context.isSuccessful());
      assert.strictEqual(context.getFinalOutput(), '[analyst:[scout:start]]');
    });
  });

  describe('executeTemplate', () => {
    it('should execute template pipeline', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => `explored: ${input}`);
      pipeline.registerHandler(DogId.ANALYST, async (input) => `analyzed: ${input}`);
      pipeline.registerHandler(DogId.ARCHITECT, async (input) => `designed: ${input}`);

      const context = await pipeline.executeTemplate('EXPLORE_ANALYZE_BUILD', 'task');

      assert.ok(context.isSuccessful());
      assert.strictEqual(context.stages.length, 3);
    });
  });

  describe('abort', () => {
    it('should abort active pipeline', async () => {
      let resolveHandler;
      const waitingHandler = new Promise(r => { resolveHandler = r; });

      pipeline.registerHandler(DogId.SCOUT, async () => {
        await waitingHandler;
        return 'done';
      });

      const stages = pipeline.chain(DogId.SCOUT);
      const executePromise = pipeline.execute(stages, 'test');

      // Get pipeline ID from active pipelines
      await new Promise(r => setTimeout(r, 10));
      const active = pipeline.getActivePipelines();
      assert.strictEqual(active.length, 1);

      pipeline.abort(active[0].pipelineId, 'Test abort');
      resolveHandler();

      const context = await executePromise;
      assert.strictEqual(context.aborted, true);
    });
  });

  describe('statistics', () => {
    it('should track pipeline stats', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      pipeline.registerHandler(DogId.ANALYST, async (input) => input);

      await pipeline.executeChain('test', DogId.SCOUT, DogId.ANALYST);
      await pipeline.executeChain('test', DogId.SCOUT);

      const stats = pipeline.getStats();
      assert.strictEqual(stats.pipelinesRun, 2);
      assert.strictEqual(stats.stagesExecuted, 3);
      assert.strictEqual(stats.successfulPipelines, 2);
    });

    it('should track template usage', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      pipeline.registerHandler(DogId.ANALYST, async (input) => input);
      pipeline.registerHandler(DogId.ARCHITECT, async (input) => input);

      await pipeline.executeTemplate('EXPLORE_ANALYZE_BUILD', 'test');
      await pipeline.executeTemplate('EXPLORE_ANALYZE_BUILD', 'test2');

      const stats = pipeline.getStats();
      assert.strictEqual(stats.byTemplate['EXPLORE_ANALYZE_BUILD'].run, 2);
      assert.strictEqual(stats.byTemplate['EXPLORE_ANALYZE_BUILD'].success, 2);
    });

    it('should reset stats', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      await pipeline.executeChain('test', DogId.SCOUT);

      pipeline.resetStats();

      const stats = pipeline.getStats();
      assert.strictEqual(stats.pipelinesRun, 0);
    });
  });

  describe('events', () => {
    it('should emit pipeline events', async () => {
      const events = [];
      pipeline.on('pipeline:start', (e) => events.push({ type: 'start', ...e }));
      pipeline.on('stage:start', (e) => events.push({ type: 'stage:start', ...e }));
      pipeline.on('stage:complete', (e) => events.push({ type: 'stage:complete', ...e }));
      pipeline.on('pipeline:complete', (e) => events.push({ type: 'complete', ...e }));

      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      await pipeline.executeChain('test', DogId.SCOUT);

      assert.ok(events.some(e => e.type === 'start'));
      assert.ok(events.some(e => e.type === 'stage:start'));
      assert.ok(events.some(e => e.type === 'stage:complete'));
      assert.ok(events.some(e => e.type === 'complete'));
    });
  });

  describe('formatting', () => {
    it('should format pipeline visualization', () => {
      const stages = pipeline.chain(DogId.SCOUT, DogId.ANALYST, DogId.ARCHITECT);
      const formatted = DogPipeline.formatPipeline(stages);

      assert.ok(formatted.includes('Scout'));
      assert.ok(formatted.includes('Analyst'));
      assert.ok(formatted.includes('Architect'));
      assert.ok(formatted.includes('→'));
    });

    it('should format result', async () => {
      pipeline.registerHandler(DogId.SCOUT, async (input) => input);
      const context = await pipeline.executeChain('test', DogId.SCOUT);

      const formatted = DogPipeline.formatResult(context);

      assert.ok(formatted.includes('Pipeline:'));
      assert.ok(formatted.includes('Success'));
      assert.ok(formatted.includes('Scout'));
    });
  });
});
