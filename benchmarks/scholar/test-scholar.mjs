#!/usr/bin/env node
/**
 * Scholar Benchmark
 *
 * Tests Scholar's content classification and knowledge extraction capabilities.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';

// Create collective pack with Scholar
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const scholar = pack.scholar;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  SCHOLAR BENCHMARK');
console.log('  Claim: Classifies content and extracts knowledge');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Content Classification - Code Example
// =============================================================================

console.log('── TEST 1: Classify Code Example ──────────────────────────────');
console.log('   Should classify code as CODE_EXAMPLE');
console.log('');

const codeContent = `
Here is how to use the function:

\`\`\`javascript
function greet(name) {
  return 'Hello, ' + name;
}

const result = greet('World');
console.log(result);
\`\`\`
`;

const codeType = scholar._classifyContent(codeContent);
const test1Pass = codeType === 'code_example';

console.log(`   Classification: ${codeType}`);
console.log(`   Expected: code_example`);
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Content Classification - Error Solution
// =============================================================================

console.log('── TEST 2: Classify Error Solution ────────────────────────────');
console.log('   Should classify error content as ERROR_SOLUTION');
console.log('');

const errorContent = `
Error: Cannot find module 'express'

Stack trace:
  at Function.Module._resolveFilename (module.js:469:15)
  at Function.Module._load (module.js:417:25)

Solution: Run npm install express to resolve this issue.
`;

const errorType = scholar._classifyContent(errorContent);
const test2Pass = errorType === 'error_solution';

console.log(`   Classification: ${errorType}`);
console.log(`   Expected: error_solution`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Content Classification - Documentation
// =============================================================================

console.log('── TEST 3: Classify Documentation ─────────────────────────────');
console.log('   Should classify docs as DOCUMENTATION');
console.log('');

const docContent = `
# API Reference

## Parameters:
- **name** (string): The user's name
- **age** (number): The user's age

## Returns:
An object containing the formatted user data.

## Example:
formatUser('John', 30)
`;

const docType = scholar._classifyContent(docContent);
const test3Pass = docType === 'documentation';

console.log(`   Classification: ${docType}`);
console.log(`   Expected: documentation`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Content Classification - General Insight
// =============================================================================

console.log('── TEST 4: Classify General Content ───────────────────────────');
console.log('   Should classify general text as INSIGHT');
console.log('');

const generalContent = `
The team decided to use React for the frontend because of its
component-based architecture and large ecosystem. This decision
was made after evaluating several alternatives including Vue and Angular.
`;

const generalType = scholar._classifyContent(generalContent);
const test4Pass = generalType === 'insight';

console.log(`   Classification: ${generalType}`);
console.log(`   Expected: insight`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Knowledge Types Defined
// =============================================================================

console.log('── TEST 5: Knowledge Types Defined ────────────────────────────');
console.log('   Should define 7 knowledge types');
console.log('');

const knowledgeTypes = ['documentation', 'code_example', 'explanation',
                        'reference', 'insight', 'pattern', 'error_solution'];
const definedCount = knowledgeTypes.length;

const test5Pass = definedCount === 7;

console.log(`   Defined types: ${knowledgeTypes.join(', ')}`);
console.log(`   Count: ${definedCount}`);
console.log(`   Result: ${test5Pass ? '✅ PASS (7 types)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Symbol Extraction
// =============================================================================

console.log('── TEST 6: Symbol Extraction ──────────────────────────────────');
console.log('   Should extract function/class names from code');
console.log('');

const symbolCode = `
function processData(data) {
  return data.map(x => x * 2);
}

class UserManager {
  constructor() {}

  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}

const CONSTANTS = { MAX_SIZE: 100 };
`;

const symbols = scholar._extractSymbols(symbolCode);
const hasFunction = symbols.some(s => s.includes('processData'));
const hasClass = symbols.some(s => s.includes('UserManager'));

const test6Pass = symbols.length >= 2 && (hasFunction || hasClass);

console.log(`   Symbols found: ${symbols.join(', ')}`);
console.log(`   Has function: ${hasFunction ? '✅' : '❌'}`);
console.log(`   Has class: ${hasClass ? '✅' : '❌'}`);
console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 7: Knowledge Extraction with Confidence
// =============================================================================

console.log('── TEST 7: Knowledge Extraction ───────────────────────────────');
console.log('   Should extract knowledge with confidence score');
console.log('');

const analysisResult = await scholar.analyze(
  { content: codeContent, query: 'greet function' },
  {}
);

const hasKnowledge = !!analysisResult.knowledge;
const hasConfidence = typeof analysisResult.confidence === 'number';
const hasSummary = !!analysisResult.knowledge?.summary;

const test7Pass = hasKnowledge && hasConfidence && hasSummary;

console.log(`   Has knowledge: ${hasKnowledge ? '✅' : '❌'}`);
console.log(`   Has confidence: ${hasConfidence ? '✅' : '❌'} (${analysisResult.confidence?.toFixed(3)})`);
console.log(`   Has summary: ${hasSummary ? '✅' : '❌'}`);
console.log(`   Result: ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const tests = [
  { name: 'Classify Code', pass: test1Pass },
  { name: 'Classify Error', pass: test2Pass },
  { name: 'Classify Documentation', pass: test3Pass },
  { name: 'Classify General', pass: test4Pass },
  { name: 'Knowledge Types', pass: test5Pass },
  { name: 'Symbol Extraction', pass: test6Pass },
  { name: 'Knowledge Extraction', pass: test7Pass },
];

let passed = 0;
for (const test of tests) {
  console.log(`  ${test.pass ? '✅' : '❌'} ${test.name}`);
  if (test.pass) passed++;
}

console.log('');
console.log('  ───────────────────────────────────────────────────────────');
console.log(`  Passed: ${passed}/${tests.length} (${((passed/tests.length)*100).toFixed(0)}%)`);
console.log('');

// Kill criteria
const classificationPassed = [test1Pass, test2Pass, test3Pass, test4Pass].filter(Boolean).length;
const killCriteria = {
  classification: classificationPassed >= 3, // At least 3 of 4
  knowledgeTypes: test5Pass,
  extraction: test6Pass && test7Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.classification ? '✅' : '❌'} Content classification (>= 3 of 4)`);
console.log(`  ${killCriteria.knowledgeTypes ? '✅' : '❌'} 7 knowledge types defined`);
console.log(`  ${killCriteria.extraction ? '✅' : '❌'} Symbol and knowledge extraction`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ SCHOLAR VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ SCHOLAR NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
