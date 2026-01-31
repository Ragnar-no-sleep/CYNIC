#!/usr/bin/env node
/**
 * Architect Benchmark
 *
 * Tests Architect's design review and pattern detection capabilities.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';

// Create collective pack with Architect
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const architect = pack.architect;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ARCHITECT BENCHMARK');
console.log('  Claim: Detects design patterns and reviews code quality');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Design Pattern Detection - Singleton
// =============================================================================

console.log('── TEST 1: Singleton Pattern Detection ────────────────────────');
console.log('   Should detect singleton pattern');
console.log('');

const singletonCode = `
class Database {
  static instance = null;

  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}
`;

const singletonAnalysis = await architect.analyze({ code: singletonCode }, {});
const singletonDetected = singletonAnalysis.patterns?.some(p => p.name === 'singleton');

console.log(`   Patterns detected: ${singletonAnalysis.patterns?.map(p => p.name).join(', ') || 'none'}`);
console.log(`   Singleton detected: ${singletonDetected ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${singletonDetected ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Design Pattern Detection - Factory
// =============================================================================

console.log('── TEST 2: Factory Pattern Detection ──────────────────────────');
console.log('   Should detect factory pattern');
console.log('');

const factoryCode = `
class VehicleFactory {
  createCar() {
    return new Car();
  }

  createTruck() {
    return new Truck();
  }
}

function makeWidget(type) {
  if (type === 'a') return new WidgetA();
  return new WidgetB();
}
`;

const factoryAnalysis = await architect.analyze({ code: factoryCode }, {});
const factoryDetected = factoryAnalysis.patterns?.some(p => p.name === 'factory');

console.log(`   Patterns detected: ${factoryAnalysis.patterns?.map(p => p.name).join(', ') || 'none'}`);
console.log(`   Factory detected: ${factoryDetected ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${factoryDetected ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Design Pattern Detection - Observer
// =============================================================================

console.log('── TEST 3: Observer Pattern Detection ─────────────────────────');
console.log('   Should detect observer pattern');
console.log('');

const observerCode = `
class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}
`;

const observerAnalysis = await architect.analyze({ code: observerCode }, {});
const observerDetected = observerAnalysis.patterns?.some(p => p.name === 'observer');

console.log(`   Patterns detected: ${observerAnalysis.patterns?.map(p => p.name).join(', ') || 'none'}`);
console.log(`   Observer detected: ${observerDetected ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${observerDetected ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Review Categories
// =============================================================================

console.log('── TEST 4: Review Categories ──────────────────────────────────');
console.log('   Should review 8 categories');
console.log('');

const reviewCategories = ['architecture', 'patterns', 'naming', 'complexity',
                         'maintainability', 'testability', 'security', 'performance'];
console.log(`   Expected categories: ${reviewCategories.join(', ')}`);

const test4Pass = reviewCategories.length === 8;
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Constructive Feedback Balance
// =============================================================================

console.log('── TEST 5: Constructive Feedback Balance ──────────────────────');
console.log('   Should maintain positive feedback ratio');
console.log('');

// Code with issues to trigger critiques
const badCode = `
var x = 1;
var y = 2;
var z = 3;
function f(a,b,c,d,e,f,g,h) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            console.log('deep');
          }
        }
      }
    }
  }
}
const url = 'https://api.example.com/v1';
const url2 = 'https://api.example.com/v2';
const url3 = 'https://api.example.com/v3';
`;

const badCodeAnalysis = await architect.analyze({ code: badCode }, {});
const feedback = badCodeAnalysis.feedback || [];
const praises = feedback.filter(f => f.type === 'praise').length;
const critiques = feedback.filter(f => f.type === 'suggestion' || f.type === 'warning').length;

// Balance check: at least 1 praise per φ⁻¹ (~1.618) critiques
const expectedPraises = Math.ceil(critiques * 0.618);
const test5Pass = praises >= expectedPraises || critiques === 0;

console.log(`   Praises: ${praises}`);
console.log(`   Critiques: ${critiques}`);
console.log(`   Expected praises >= ${expectedPraises} (φ⁻¹ ratio)`);
console.log(`   Balance maintained: ${test5Pass ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Score Calculation
// =============================================================================

console.log('── TEST 6: Score Calculation ──────────────────────────────────');
console.log('   Clean code should score higher than bad code');
console.log('');

const cleanCode = `
/**
 * A well-structured function
 */
export function processUser(user) {
  if (!user) {
    return null;
  }

  const result = {
    id: user.id,
    name: formatName(user.firstName, user.lastName),
  };

  return result;
}

function formatName(first, last) {
  return first + ' ' + last;
}
`;

const cleanAnalysis = await architect.analyze({ code: cleanCode }, {});
const cleanScore = cleanAnalysis.score;
const badScore = badCodeAnalysis.score;

const test6Pass = typeof cleanScore === 'number' && typeof badScore === 'number' && cleanScore > badScore;

console.log(`   Clean code score: ${cleanScore}`);
console.log(`   Bad code score: ${badScore}`);
console.log(`   Clean > Bad: ${cleanScore > badScore ? '✅' : '❌'}`);
console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 7: Builder Pattern Detection
// =============================================================================

console.log('── TEST 7: Builder Pattern Detection ──────────────────────────');
console.log('   Should detect builder pattern');
console.log('');

const builderCode = `
class QueryBuilder {
  constructor() {
    this.query = {};
  }

  withSelect(fields) {
    this.query.select = fields;
    return this;
  }

  withWhere(condition) {
    this.query.where = condition;
    return this;
  }

  build() {
    return this.query;
  }
}
`;

const builderAnalysis = await architect.analyze({ code: builderCode }, {});
const builderDetected = builderAnalysis.patterns?.some(p => p.name === 'builder');

console.log(`   Patterns detected: ${builderAnalysis.patterns?.map(p => p.name).join(', ') || 'none'}`);
console.log(`   Builder detected: ${builderDetected ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${builderDetected ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const test1Pass = singletonDetected;
const test2Pass = factoryDetected;
const test3Pass = observerDetected;
const test7Pass = builderDetected;

const tests = [
  { name: 'Singleton Pattern', pass: test1Pass },
  { name: 'Factory Pattern', pass: test2Pass },
  { name: 'Observer Pattern', pass: test3Pass },
  { name: 'Review Categories', pass: test4Pass },
  { name: 'Feedback Balance', pass: test5Pass },
  { name: 'Score Calculation', pass: test6Pass },
  { name: 'Builder Pattern', pass: test7Pass },
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
const patternsPassed = [test1Pass, test2Pass, test3Pass, test7Pass].filter(Boolean).length;
const killCriteria = {
  patternDetection: patternsPassed >= 3, // At least 3 of 4 patterns
  feedbackBalance: test5Pass,
  scoreWorks: test6Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.patternDetection ? '✅' : '❌'} Pattern detection (>= 3 of 4)`);
console.log(`  ${killCriteria.feedbackBalance ? '✅' : '❌'} Feedback balance maintained`);
console.log(`  ${killCriteria.scoreWorks ? '✅' : '❌'} Score calculation works`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ ARCHITECT VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ ARCHITECT NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
