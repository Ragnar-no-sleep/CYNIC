#!/usr/bin/env node
/**
 * Janitor Benchmark
 *
 * Tests Janitor's code quality detection capabilities.
 * Synthetic code samples with known issues.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';

// Create collective pack with Janitor
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const janitor = pack.janitor;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  JANITOR BENCHMARK');
console.log('  Claim: Detects code quality issues and technical debt');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Long Function Detection
// =============================================================================

console.log('── TEST 1: Long Function Detection ─────────────────────────────');
console.log('   Function > 55 lines should be flagged');
console.log('');

// Create a function with 60 lines
const longFunctionCode = `
function processData(data) {
  const result = [];
  ${Array(58).fill('  result.push(data);').join('\n')}
  return result;
}
`;

const analysis1 = janitor._analyzeContent(longFunctionCode, 'test.js', {
  strictnessMultiplier: 1.0,
});

const longFuncIssue = analysis1.issues.find(i => i.type === 'long_function');
const test1Pass = !!longFuncIssue;

console.log(`   Long function issue found: ${longFuncIssue ? '✅ YES' : '❌ NO'}`);
if (longFuncIssue) {
  console.log(`   Message: ${longFuncIssue.message}`);
}
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Deep Nesting Detection
// =============================================================================

console.log('── TEST 2: Deep Nesting Detection ──────────────────────────────');
console.log('   Nesting > 5 levels should be flagged');
console.log('');

// Create deeply nested code (7 levels)
const deepNestingCode = `
function deeplyNested() {
  if (true) {
    if (true) {
      if (true) {
        if (true) {
          if (true) {
            if (true) {
              if (true) {
                console.log("deep");
              }
            }
          }
        }
      }
    }
  }
}
`;

const analysis2 = janitor._analyzeContent(deepNestingCode, 'nested.js', {
  strictnessMultiplier: 1.0,
});

const deepNestIssue = analysis2.issues.find(i => i.type === 'deep_nesting');
const test2Pass = !!deepNestIssue;

console.log(`   Deep nesting issue found: ${deepNestIssue ? '✅ YES' : '❌ NO'}`);
if (deepNestIssue) {
  console.log(`   Message: ${deepNestIssue.message}`);
}
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: TODO Comment Detection
// =============================================================================

console.log('── TEST 3: TODO Comment Detection ──────────────────────────────');
console.log('   TODO comments should be flagged');
console.log('');

const todoCode = `
function doSomething() {
  // TODO: implement this properly
  // Another TODO: refactor
  console.log("placeholder");
}
`;

const analysis3 = janitor._analyzeContent(todoCode, 'todo.js', {
  strictnessMultiplier: 1.0,
});

const todoIssues = analysis3.issues.filter(i => i.type === 'todo_comment');
const test3Pass = todoIssues.length >= 2;

console.log(`   TODO issues found: ${todoIssues.length}`);
console.log(`   Result: ${test3Pass ? '✅ PASS (>= 2)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: FIXME Comment Detection
// =============================================================================

console.log('── TEST 4: FIXME Comment Detection ─────────────────────────────');
console.log('   FIXME comments should be flagged');
console.log('');

const fixmeCode = `
function brokenFunction() {
  // FIXME: this causes a memory leak
  // FIXME: security vulnerability here
  // FIXME: race condition
  return null;
}
`;

const analysis4 = janitor._analyzeContent(fixmeCode, 'fixme.js', {
  strictnessMultiplier: 1.0,
});

const fixmeIssues = analysis4.issues.filter(i => i.type === 'fixme_comment');
const test4Pass = fixmeIssues.length >= 3;

console.log(`   FIXME issues found: ${fixmeIssues.length}`);
console.log(`   Result: ${test4Pass ? '✅ PASS (>= 3)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: console.log Detection (Dead Code)
// =============================================================================

console.log('── TEST 5: console.log Detection (Dead Code) ──────────────────');
console.log('   Debug statements should be flagged');
console.log('');

const debugCode = `
function debugFunction() {
  console.log("debug 1");
  console.debug("debug 2");
  console.info("info");
  const result = doSomething();
  console.log("result:", result);
  return result;
}
`;

const analysis5 = janitor._analyzeContent(debugCode, 'debug.js', {
  strictnessMultiplier: 1.0,
});

const debugIssues = analysis5.deadCode.filter(d => d.type === 'debug_statement');
const test5Pass = debugIssues.length >= 3;

console.log(`   Debug statements found: ${debugIssues.length}`);
console.log(`   Result: ${test5Pass ? '✅ PASS (>= 3)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Clean Code (No False Positives)
// =============================================================================

console.log('── TEST 6: Clean Code (No False Positives) ─────────────────────');
console.log('   Clean code should have minimal issues');
console.log('');

const cleanCode = `
/**
 * A well-structured function
 */
function processItem(item) {
  if (!item) {
    return null;
  }

  const result = {
    id: item.id,
    name: item.name,
  };

  return result;
}

function anotherCleanFunction(data) {
  return data.map(x => x * 2);
}
`;

const analysis6 = janitor._analyzeContent(cleanCode, 'clean.js', {
  strictnessMultiplier: 1.0,
});

const cleanIssueCount = analysis6.issues.length + analysis6.deadCode.length;
const test6Pass = cleanIssueCount === 0;

console.log(`   Issues found in clean code: ${cleanIssueCount}`);
console.log(`   Result: ${test6Pass ? '✅ PASS (0 issues)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 7: Quality Score Calculation
// =============================================================================

console.log('── TEST 7: Quality Score Calculation ───────────────────────────');
console.log('   Score should decrease with more issues');
console.log('');

// Clean code = 100
const cleanScore = janitor._calculateQualityScore([]);

// Code with issues = lower score
const badScore = janitor._calculateQualityScore([
  { severity: { weight: 1.618 } },  // HIGH
  { severity: { weight: 1.0 } },    // MEDIUM
  { severity: { weight: 1.0 } },    // MEDIUM
]);

const test7Pass = cleanScore === 100 && badScore < cleanScore;

console.log(`   Clean code score: ${cleanScore}`);
console.log(`   Bad code score: ${badScore}`);
console.log(`   Clean > Bad: ${cleanScore > badScore ? '✅ YES' : '❌ NO'}`);
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
  { name: 'Long Function Detection', pass: test1Pass },
  { name: 'Deep Nesting Detection', pass: test2Pass },
  { name: 'TODO Comment Detection', pass: test3Pass },
  { name: 'FIXME Comment Detection', pass: test4Pass },
  { name: 'console.log Detection', pass: test5Pass },
  { name: 'Clean Code (No FP)', pass: test6Pass },
  { name: 'Quality Score Calculation', pass: test7Pass },
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
const killCriteria = {
  structureDetection: test1Pass && test2Pass,           // Detects structural issues
  commentDetection: test3Pass && test4Pass,             // Detects maintenance comments
  deadCodeDetection: test5Pass,                         // Detects debug code
  noFalsePositives: test6Pass,                          // Clean code passes
  scoreWorks: test7Pass,                                // Quality scoring works
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.structureDetection ? '✅' : '❌'} Structure detection (long functions, deep nesting)`);
console.log(`  ${killCriteria.commentDetection ? '✅' : '❌'} Comment detection (TODO, FIXME)`);
console.log(`  ${killCriteria.deadCodeDetection ? '✅' : '❌'} Dead code detection (console.log)`);
console.log(`  ${killCriteria.noFalsePositives ? '✅' : '❌'} No false positives on clean code`);
console.log(`  ${killCriteria.scoreWorks ? '✅' : '❌'} Quality score calculation works`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ JANITOR VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ JANITOR NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
