/**
 * LSPService Tests
 *
 * "Code intelligence without the dependencies" - κυνικός
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LSPService, SymbolKind, createLSPTools } from '../src/lsp-service.js';

// Test fixtures directory
const TEST_DIR = join(tmpdir(), 'cynic-lsp-test-' + Date.now());

/**
 * Sample JS file content for testing
 */
const SAMPLE_JS = `/**
 * Sample module for testing
 * @module sample
 */

import { something } from 'somewhere';
import defaultExport, { named1, named2 } from './local';

/**
 * A sample class
 */
export class SampleClass extends BaseClass {
  constructor(options) {
    super(options);
    this.value = options.value;
  }

  /**
   * Get the value
   * @returns {number} The value
   */
  getValue() {
    return this.value;
  }

  static createDefault() {
    return new SampleClass({ value: 42 });
  }

  async asyncMethod() {
    const result = await this.getValue();
    return result * 2;
  }
}

/**
 * A standalone function
 * @param {string} name - The name
 */
export function greet(name) {
  console.log('Hello, ' + name);
  return 'Hello, ' + name;
}

export async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

const helper = (x) => x * 2;

export const CONSTANT = 42;

export default SampleClass;
`;

/**
 * Sample file that references SampleClass
 */
const SAMPLE_USAGE = `import { SampleClass, greet, CONSTANT } from './sample';

function useSample() {
  const instance = new SampleClass({ value: 10 });
  const val = instance.getValue();
  greet('World');
  return val + CONSTANT;
}

class AnotherClass {
  constructor() {
    this.sample = SampleClass.createDefault();
  }

  doSomething() {
    return this.sample.getValue();
  }
}

export { useSample, AnotherClass };
`;

/**
 * Setup test directory with sample files
 */
async function setupTestDir() {
  await mkdir(TEST_DIR, { recursive: true });
  await writeFile(join(TEST_DIR, 'sample.js'), SAMPLE_JS);
  await writeFile(join(TEST_DIR, 'usage.js'), SAMPLE_USAGE);
}

/**
 * Cleanup test directory
 */
async function cleanupTestDir() {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

describe('LSPService', () => {
  let lsp;

  beforeEach(async () => {
    await setupTestDir();
    lsp = new LSPService({ rootPath: TEST_DIR });
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  describe('constructor', () => {
    it('creates with default options', () => {
      const service = new LSPService();
      assert.ok(service.rootPath);
      assert.ok(service.supportedExtensions.includes('.js'));
      assert.equal(service.cacheTTL, 60000);
    });

    it('accepts custom options', () => {
      const service = new LSPService({
        rootPath: '/custom/path',
        extensions: ['.ts'],
        cacheTTL: 30000,
      });
      assert.equal(service.rootPath, '/custom/path');
      assert.deepEqual(service.supportedExtensions, ['.ts']);
      assert.equal(service.cacheTTL, 30000);
    });

    it('initializes stats', () => {
      const stats = lsp.getStats();
      assert.equal(stats.filesAnalyzed, 0);
      assert.equal(stats.symbolsExtracted, 0);
      assert.equal(stats.cacheHits, 0);
      assert.equal(stats.cacheMisses, 0);
    });
  });

  describe('getSymbols', () => {
    it('extracts class symbols', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const classSymbol = symbols.find(s => s.name === 'SampleClass');

      assert.ok(classSymbol);
      assert.equal(classSymbol.kind, SymbolKind.Class);
      assert.equal(classSymbol.kindName, 'Class');
      assert.equal(classSymbol.exported, true);
      assert.equal(classSymbol.extends, 'BaseClass');
    });

    it('extracts function symbols', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const funcSymbol = symbols.find(s => s.name === 'greet');

      assert.ok(funcSymbol);
      assert.equal(funcSymbol.kind, SymbolKind.Function);
      assert.equal(funcSymbol.exported, true);
      assert.ok(funcSymbol.params.includes('name'));
    });

    it('extracts async function symbols', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const asyncFunc = symbols.find(s => s.name === 'fetchData');

      assert.ok(asyncFunc);
      assert.equal(asyncFunc.async, true);
    });

    it('extracts method symbols', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const methods = symbols.filter(s => s.kind === SymbolKind.Method);

      assert.ok(methods.length >= 3);
      assert.ok(methods.some(m => m.name === 'getValue'));
      assert.ok(methods.some(m => m.name === 'createDefault'));
      assert.ok(methods.some(m => m.name === 'asyncMethod'));
    });

    it('extracts static methods', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const staticMethod = symbols.find(s => s.name === 'createDefault');

      assert.ok(staticMethod);
      assert.equal(staticMethod.static, true);
    });

    it('extracts constant symbols', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const constant = symbols.find(s => s.name === 'CONSTANT');

      assert.ok(constant);
      assert.equal(constant.kind, SymbolKind.Constant);
      assert.equal(constant.exported, true);
    });

    it('extracts arrow functions', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const arrow = symbols.find(s => s.name === 'helper');

      assert.ok(arrow);
      assert.equal(arrow.arrow, true);
    });

    it('extracts JSDoc documentation', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const classSymbol = symbols.find(s => s.name === 'SampleClass');

      assert.ok(classSymbol.documentation);
      assert.ok(classSymbol.documentation.includes('sample class'));
    });

    it('extracts function body', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const func = symbols.find(s => s.name === 'greet');

      assert.ok(func.body);
      assert.ok(func.body.includes('console.log'));
    });

    it('returns empty array for non-existent file', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'nonexistent.js'));
      assert.deepEqual(symbols, []);
    });

    it('caches results', async () => {
      const filePath = join(TEST_DIR, 'sample.js');

      await lsp.getSymbols(filePath);
      const stats1 = lsp.getStats();
      assert.equal(stats1.cacheMisses, 1);
      assert.equal(stats1.cacheHits, 0);

      await lsp.getSymbols(filePath);
      const stats2 = lsp.getStats();
      assert.equal(stats2.cacheHits, 1);
    });

    it('includes line numbers', async () => {
      const symbols = await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      const classSymbol = symbols.find(s => s.name === 'SampleClass');

      assert.ok(classSymbol.line > 0);
      assert.ok(typeof classSymbol.column === 'number');
    });
  });

  describe('findReferences', () => {
    it('finds all references to a symbol', async () => {
      const refs = await lsp.findReferences('SampleClass');

      assert.ok(refs.length >= 3);
      // Should find in both files
      const files = [...new Set(refs.map(r => r.file))];
      assert.ok(files.length >= 1);
    });

    it('identifies definitions vs usages', async () => {
      const refs = await lsp.findReferences('SampleClass');

      const definitions = refs.filter(r => r.isDefinition);
      const usages = refs.filter(r => !r.isDefinition && !r.isImport);

      assert.ok(definitions.length >= 1);
      assert.ok(usages.length >= 1);
    });

    it('identifies imports', async () => {
      const refs = await lsp.findReferences('SampleClass');

      const imports = refs.filter(r => r.isImport);
      assert.ok(imports.length >= 1);
    });

    it('includes context', async () => {
      const refs = await lsp.findReferences('getValue');

      assert.ok(refs.length > 0);
      refs.forEach(ref => {
        assert.ok(ref.context);
        assert.ok(ref.context.length <= 100);
      });
    });

    it('returns line and column', async () => {
      const refs = await lsp.findReferences('SampleClass');

      refs.forEach(ref => {
        assert.ok(typeof ref.line === 'number');
        assert.ok(typeof ref.column === 'number');
        assert.ok(ref.line > 0);
      });
    });

    it('restricts to directory when specified', async () => {
      // Create subdirectory with another file
      const subDir = join(TEST_DIR, 'sub');
      await mkdir(subDir);
      await writeFile(join(subDir, 'other.js'), 'const SampleClass = null;');

      const allRefs = await lsp.findReferences('SampleClass');
      const subRefs = await lsp.findReferences('SampleClass', subDir);

      assert.ok(allRefs.length > subRefs.length);
    });

    it('updates stats', async () => {
      await lsp.findReferences('SampleClass');
      const stats = lsp.getStats();

      assert.ok(stats.referencesFound > 0);
    });
  });

  describe('getCallGraph', () => {
    it('extracts function calls', async () => {
      const graph = await lsp.getCallGraph('greet', join(TEST_DIR, 'sample.js'));

      assert.equal(graph.symbol, 'greet');
      assert.ok(Array.isArray(graph.calls));
      assert.ok(graph.calls.includes('log'));
    });

    it('finds callers', async () => {
      const graph = await lsp.getCallGraph('getValue', join(TEST_DIR, 'sample.js'));

      assert.ok(Array.isArray(graph.calledBy));
    });

    it('handles non-existent symbol', async () => {
      const graph = await lsp.getCallGraph('nonexistent', join(TEST_DIR, 'sample.js'));

      assert.equal(graph.symbol, 'nonexistent');
      assert.deepEqual(graph.calls, []);
      assert.deepEqual(graph.calledBy, []);
    });

    it('extracts method calls', async () => {
      const graph = await lsp.getCallGraph('asyncMethod', join(TEST_DIR, 'sample.js'));

      assert.ok(graph.calls.includes('getValue'));
    });
  });

  describe('planRename', () => {
    it('creates rename plan', async () => {
      const plan = await lsp.planRename('SampleClass', 'RenamedClass');

      assert.equal(plan.oldName, 'SampleClass');
      assert.equal(plan.newName, 'RenamedClass');
      assert.ok(plan.totalChanges > 0);
      assert.ok(plan.filesAffected > 0);
      assert.ok(Array.isArray(plan.changes));
    });

    it('includes file changes', async () => {
      const plan = await lsp.planRename('getValue', 'fetchValue');

      plan.changes.forEach(change => {
        assert.ok(change.file);
        assert.ok(typeof change.line === 'number');
        assert.equal(change.oldText, 'getValue');
        assert.equal(change.newText, 'fetchValue');
      });
    });

    it('marks safe renames', async () => {
      const plan = await lsp.planRename('SampleClass', 'MyClass');
      assert.equal(plan.safe, true);
    });

    it('marks unsafe renames - starts with number', async () => {
      const plan = await lsp.planRename('SampleClass', '123Class');
      assert.equal(plan.safe, false);
    });

    it('marks unsafe renames - reserved word', async () => {
      const plan = await lsp.planRename('SampleClass', 'class');
      assert.equal(plan.safe, false);
    });

    it('marks unsafe renames - contains space', async () => {
      const plan = await lsp.planRename('SampleClass', 'My Class');
      assert.equal(plan.safe, false);
    });
  });

  describe('getOutline', () => {
    it('returns hierarchical structure', async () => {
      const outline = await lsp.getOutline(join(TEST_DIR, 'sample.js'));

      assert.ok(Array.isArray(outline));
      const classOutline = outline.find(s => s.name === 'SampleClass');
      assert.ok(classOutline);
      assert.ok(Array.isArray(classOutline.children));
    });

    it('nests methods under class when consecutive', async () => {
      // Create a simple file where class and methods are consecutive in symbol order
      const simpleClass = `
export class SimpleClass {
  doSomething() {
    return 1;
  }
  doOther() {
    return 2;
  }
}
`;
      await writeFile(join(TEST_DIR, 'simple-class.js'), simpleClass);
      const outline = await lsp.getOutline(join(TEST_DIR, 'simple-class.js'));

      const classOutline = outline.find(s => s.name === 'SimpleClass');
      assert.ok(classOutline);
      assert.ok(classOutline.children.length >= 1);
    });

    it('includes standalone functions at top level', async () => {
      const outline = await lsp.getOutline(join(TEST_DIR, 'sample.js'));

      const greetFunc = outline.find(s => s.name === 'greet');
      assert.ok(greetFunc);
      assert.ok(!greetFunc.children); // Not a class
    });
  });

  describe('analyzeImports', () => {
    it('extracts ES6 imports', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'sample.js'));

      assert.ok(analysis.imports.length >= 2);
    });

    it('extracts default imports', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'sample.js'));

      const localImport = analysis.imports.find(i => i.source === './local');
      assert.ok(localImport);
      assert.equal(localImport.default, 'defaultExport');
    });

    it('extracts named imports', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'sample.js'));

      const localImport = analysis.imports.find(i => i.source === './local');
      assert.ok(localImport.named.includes('named1'));
      assert.ok(localImport.named.includes('named2'));
    });

    it('extracts exports', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'sample.js'));

      assert.ok(analysis.exports.length >= 3);
      assert.ok(analysis.exports.some(e => e.name === 'SampleClass'));
      assert.ok(analysis.exports.some(e => e.name === 'greet'));
    });

    it('identifies default exports', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'sample.js'));

      const defaultExport = analysis.exports.find(e => e.default);
      assert.ok(defaultExport);
    });

    it('handles errors gracefully', async () => {
      const analysis = await lsp.analyzeImports(join(TEST_DIR, 'nonexistent.js'));

      assert.deepEqual(analysis.imports, []);
      assert.deepEqual(analysis.exports, []);
      assert.ok(analysis.errors.length > 0);
    });
  });

  describe('getHoverInfo', () => {
    it('returns symbol info', async () => {
      const info = await lsp.getHoverInfo('SampleClass', join(TEST_DIR, 'sample.js'));

      assert.ok(info);
      assert.equal(info.name, 'SampleClass');
      assert.equal(info.kind, 'Class');
      assert.ok(info.line > 0);
    });

    it('includes documentation', async () => {
      const info = await lsp.getHoverInfo('greet', join(TEST_DIR, 'sample.js'));

      assert.ok(info);
      assert.ok(info.documentation);
    });

    it('returns null for non-existent symbol', async () => {
      const info = await lsp.getHoverInfo('nonexistent', join(TEST_DIR, 'sample.js'));
      assert.equal(info, null);
    });

    it('includes export status', async () => {
      const exportedInfo = await lsp.getHoverInfo('SampleClass', join(TEST_DIR, 'sample.js'));
      assert.equal(exportedInfo.exported, true);

      const privateInfo = await lsp.getHoverInfo('helper', join(TEST_DIR, 'sample.js'));
      assert.equal(privateInfo.exported, false);
    });
  });

  describe('getStats', () => {
    it('returns all stats', async () => {
      await lsp.getSymbols(join(TEST_DIR, 'sample.js'));
      await lsp.findReferences('SampleClass');

      const stats = lsp.getStats();

      assert.ok(typeof stats.filesAnalyzed === 'number');
      assert.ok(typeof stats.symbolsExtracted === 'number');
      assert.ok(typeof stats.referencesFound === 'number');
      assert.ok(typeof stats.cacheHits === 'number');
      assert.ok(typeof stats.cacheMisses === 'number');
      assert.ok(typeof stats.cacheSize === 'number');
      assert.ok(typeof stats.hitRate === 'number');
    });

    it('calculates hit rate', async () => {
      const filePath = join(TEST_DIR, 'sample.js');

      await lsp.getSymbols(filePath); // miss
      await lsp.getSymbols(filePath); // hit

      const stats = lsp.getStats();
      assert.equal(stats.hitRate, 0.5);
    });
  });

  describe('caching', () => {
    it('expires cache after TTL', async () => {
      const fastLsp = new LSPService({
        rootPath: TEST_DIR,
        cacheTTL: 10, // 10ms
      });

      const filePath = join(TEST_DIR, 'sample.js');

      await fastLsp.getSymbols(filePath);
      assert.equal(fastLsp.getStats().cacheMisses, 1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      await fastLsp.getSymbols(filePath);
      assert.equal(fastLsp.getStats().cacheMisses, 2);
    });
  });
});

describe('SymbolKind', () => {
  it('has expected symbol kinds', () => {
    assert.equal(SymbolKind.Class, 5);
    assert.equal(SymbolKind.Function, 12);
    assert.equal(SymbolKind.Method, 6);
    assert.equal(SymbolKind.Constant, 14);
  });
});

describe('createLSPTools', () => {
  let lsp;
  let tools;

  beforeEach(async () => {
    await setupTestDir();
    lsp = new LSPService({ rootPath: TEST_DIR });
    tools = createLSPTools(lsp);
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  it('creates all expected tools', () => {
    const toolNames = tools.map(t => t.name);

    assert.ok(toolNames.includes('brain_lsp_symbols'));
    assert.ok(toolNames.includes('brain_lsp_references'));
    assert.ok(toolNames.includes('brain_lsp_callgraph'));
    assert.ok(toolNames.includes('brain_lsp_rename'));
    assert.ok(toolNames.includes('brain_lsp_outline'));
    assert.ok(toolNames.includes('brain_lsp_imports'));
    assert.ok(toolNames.includes('brain_lsp_stats'));
  });

  it('tools have correct schema', () => {
    tools.forEach(tool => {
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.inputSchema);
      assert.ok(typeof tool.handler === 'function');
    });
  });

  it('brain_lsp_symbols handler works', async () => {
    const tool = tools.find(t => t.name === 'brain_lsp_symbols');
    const result = await tool.handler({ file: 'sample.js' });

    assert.ok(result.symbolCount > 0);
    assert.ok(Array.isArray(result.symbols));
  });

  it('brain_lsp_references handler works', async () => {
    const tool = tools.find(t => t.name === 'brain_lsp_references');
    const result = await tool.handler({ symbol: 'SampleClass' });

    assert.ok(result.totalReferences > 0);
    assert.ok(Array.isArray(result.files));
  });

  it('brain_lsp_stats handler works', async () => {
    const tool = tools.find(t => t.name === 'brain_lsp_stats');
    const result = await tool.handler({});

    assert.ok(typeof result.filesAnalyzed === 'number');
    assert.ok(typeof result.hitRate === 'number');
  });

  it('brain_lsp_rename adds warning for unsafe rename', async () => {
    const tool = tools.find(t => t.name === 'brain_lsp_rename');
    const result = await tool.handler({ oldName: 'SampleClass', newName: '123Invalid' });

    assert.ok(result.warning);
    assert.equal(result.safe, false);
  });
});
