#!/usr/bin/env node
/**
 * CYNIC Pattern Detection Example
 *
 * Demonstrates the pattern detection system:
 * - Statistical anomaly detection
 * - Behavioral pattern recognition
 * - Semantic pattern clustering
 * - Anti-pattern identification
 *
 * Run: node examples/pattern-detection.mjs
 *
 * "*sniff* I smell a pattern" - κυνικός
 */

import { PatternDetector, createPatternDetector } from '@cynic/core/patterns';
import { PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔄 CYNIC Pattern Detection Demo');
console.log('  "*sniff* I smell a pattern"');
console.log('═══════════════════════════════════════════════════════════════\n');

// Create pattern detector with φ-aligned thresholds
const detector = createPatternDetector({
  minConfidence: 1 - PHI_INV, // φ⁻² = 38.2%
  maxPatterns: 21, // Fibonacci F8
  decayRate: PHI_INV * 0.01, // Slow decay
});

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN TYPES
// ═══════════════════════════════════════════════════════════════════════════

console.log('── Pattern Types ────────────────────────────────────────────────\n');

const patternTypes = [
  { name: 'BEHAVIORAL', desc: 'User behavior patterns (edit without read, repeated errors)' },
  { name: 'STRUCTURAL', desc: 'Code structure patterns (file organization, naming)' },
  { name: 'TEMPORAL', desc: 'Time-based patterns (work hours, session length)' },
  { name: 'SEMANTIC', desc: 'Meaning-based patterns (similar code, concepts)' },
  { name: 'STATISTICAL', desc: 'Numerical anomalies (outliers, distributions)' },
];

for (const pt of patternTypes) {
  console.log(`  📊 ${pt.name}`);
  console.log(`     ${pt.desc}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

console.log('── Behavioral Pattern Detection ─────────────────────────────────\n');

// Simulate a series of observations
const observations = [
  { type: 'tool_use', tool: 'Edit', file: 'app.js', hasRead: false },
  { type: 'tool_use', tool: 'Edit', file: 'utils.js', hasRead: false },
  { type: 'tool_use', tool: 'Edit', file: 'config.js', hasRead: false },
  { type: 'tool_use', tool: 'Read', file: 'app.js' },
  { type: 'tool_use', tool: 'Edit', file: 'app.js', hasRead: true },
  { type: 'tool_use', tool: 'Edit', file: 'test.js', hasRead: false },
];

console.log('  Observations:');
for (const obs of observations) {
  const icon = obs.tool === 'Edit' ? (obs.hasRead ? '✅' : '⚠️') : '📖';
  console.log(`    ${icon} ${obs.tool} ${obs.file} ${obs.hasRead === false ? '(without read!)' : ''}`);
  detector.observe(obs);
}

// Check for anti-pattern
const antiPatterns = detector.detectAntiPatterns();
console.log('\n  Anti-Patterns Detected:');
if (antiPatterns.length > 0) {
  for (const ap of antiPatterns) {
    console.log(`    ⚠️ ${ap.name}: ${ap.description}`);
    console.log(`       Occurrences: ${ap.count}, Confidence: ${(ap.confidence * 100).toFixed(1)}%`);
  }
} else {
  console.log('    ✅ No anti-patterns detected');
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICAL ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── Statistical Anomaly Detection ────────────────────────────────\n');

// Sample data with outlier
const responseTimesMs = [120, 115, 130, 125, 118, 122, 890, 128, 121, 119];

console.log('  Response times (ms):', responseTimesMs.join(', '));

// Calculate statistics
const mean = responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length;
const variance = responseTimesMs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / responseTimesMs.length;
const stdDev = Math.sqrt(variance);
const threshold = mean + 2 * stdDev; // 2 standard deviations

console.log(`\n  Statistics:`);
console.log(`    Mean: ${mean.toFixed(1)} ms`);
console.log(`    Std Dev: ${stdDev.toFixed(1)} ms`);
console.log(`    Threshold (2σ): ${threshold.toFixed(1)} ms`);

console.log(`\n  Anomalies:`);
for (const rt of responseTimesMs) {
  if (rt > threshold) {
    console.log(`    🔴 ${rt} ms (${((rt - mean) / stdDev).toFixed(1)}σ above mean)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC PATTERN CLUSTERING
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── Semantic Pattern Clustering ──────────────────────────────────\n');

const codePatterns = [
  { id: 1, desc: 'User authentication with JWT' },
  { id: 2, desc: 'OAuth2 login flow' },
  { id: 3, desc: 'Password reset handling' },
  { id: 4, desc: 'Database connection pooling' },
  { id: 5, desc: 'Redis cache implementation' },
  { id: 6, desc: 'Session management with cookies' },
];

console.log('  Code patterns:');
for (const cp of codePatterns) {
  console.log(`    ${cp.id}. ${cp.desc}`);
}

// Simulate clustering (would use embeddings in real implementation)
const clusters = [
  { name: 'Authentication', patterns: [1, 2, 3, 6], confidence: 0.85 },
  { name: 'Caching/Storage', patterns: [4, 5], confidence: 0.72 },
];

console.log('\n  Discovered Clusters:');
for (const cluster of clusters) {
  console.log(`    📁 ${cluster.name} (${(cluster.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`       Contains patterns: ${cluster.patterns.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── Pattern-Based Recommendations ────────────────────────────────\n');

const recommendations = [
  { pattern: 'edit_without_read', suggestion: 'Always read files before editing to understand context' },
  { pattern: 'repeated_errors', suggestion: 'Consider stepping back and reviewing the approach' },
  { pattern: 'long_sessions', suggestion: 'Take breaks to maintain focus and prevent burnout' },
  { pattern: 'auth_patterns', suggestion: 'Consider consolidating authentication logic' },
];

for (const rec of recommendations) {
  console.log(`  🎯 When "${rec.pattern}" is detected:`);
  console.log(`     → ${rec.suggestion}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('  Pattern Detection Capabilities:');
console.log('    - Behavioral: Track sequences, detect anti-patterns');
console.log('    - Statistical: Anomaly detection with z-scores');
console.log('    - Semantic: Cluster similar patterns by meaning');
console.log('    - Temporal: Session timing, work patterns\n');

console.log('  Configuration (φ-aligned):');
console.log(`    Min confidence: ${((1 - PHI_INV) * 100).toFixed(1)}% (φ⁻²)`);
console.log(`    Max patterns: 21 (Fibonacci F8)`);
console.log(`    Decay rate: ${(PHI_INV * 0.01 * 100).toFixed(2)}% per cycle`);

console.log('\n  *sniff* Pattern detection complete.');
console.log('═══════════════════════════════════════════════════════════════\n');
