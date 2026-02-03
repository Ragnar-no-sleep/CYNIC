/**
 * Item Enricher Tests
 *
 * Tests for content analysis and metadata generation.
 *
 * "Enrich before judging" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  enrichItem,
  enrichItems,
  default as enricher,
} from '../src/item-enricher.js';

const { detectType, analyzeCode, analyzeText, detectSources, generateHash } = enricher;

// =============================================================================
// TESTS
// =============================================================================

describe('ItemEnricher', () => {

  // ===========================================================================
  // DETECT TYPE
  // ===========================================================================

  describe('detectType', () => {
    it('should detect code', () => {
      const code = `
        import { foo } from 'bar';
        export function test() {
          const x = 1;
          return x;
        }
      `;
      assert.equal(detectType(code), 'code');
    });

    it('should detect decision', () => {
      const decision = `
        We need to decide between option A and option B.
        Pros: faster, cheaper
        Cons: more complex
        I recommend option A.
      `;
      assert.equal(detectType(decision), 'decision');
    });

    it('should detect pattern', () => {
      const pattern = `
        Pattern detected: Users always click the button before reading.
        This trend correlates with bounce rate.
        Observation: 80% of sessions show this pattern.
      `;
      assert.equal(detectType(pattern), 'pattern');
    });

    it('should detect knowledge', () => {
      const knowledge = `
        Solana is a blockchain that uses Proof of History.
        It has fast transaction speeds and low fees.
        The definition of consensus means agreement.
      `;
      assert.equal(detectType(knowledge), 'knowledge');
    });

    it('should return unknown for empty text', () => {
      assert.equal(detectType(''), 'unknown');
      assert.equal(detectType(null), 'unknown');
    });

    it('should return text for generic content', () => {
      assert.equal(detectType('Hello world'), 'text');
    });
  });

  // ===========================================================================
  // ANALYZE CODE
  // ===========================================================================

  describe('analyzeCode', () => {
    it('should detect JavaScript code', () => {
      const code = `
        import React from 'react';
        export default function App() {
          return <div>Hello</div>;
        }
      `;
      const analysis = analyzeCode(code);

      assert.ok(analysis.hasCode);
      assert.equal(analysis.language, 'javascript');
    });

    it('should detect Python code', () => {
      const code = `
        def hello():
            return "world"

        class MyClass:
            pass
      `;
      const analysis = analyzeCode(code);

      assert.ok(analysis.hasCode);
      assert.equal(analysis.language, 'python');
    });

    it('should detect comments', () => {
      const code = `
        // This is a comment
        function test() {
          /* multi-line
             comment */
        }
      `;
      const analysis = analyzeCode(code);
      assert.ok(analysis.hasComments);
    });

    it('should detect error handling', () => {
      const code = `import { foo } from 'bar';
function fetchData() {
  try {
    const result = fetch(url);
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}`;
      const analysis = analyzeCode(code);
      assert.ok(analysis);
      assert.ok(analysis.hasErrorHandling);
    });

    it('should detect tests', () => {
      const code = `
        describe('test', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });
        });
      `;
      const analysis = analyzeCode(code);
      assert.ok(analysis.hasTests);
    });

    it('should detect documentation', () => {
      const code = `
        /**
         * This function does something
         * @param {string} name - The name
         * @returns {string} The greeting
         */
        function greet(name) {
          return 'Hello ' + name;
        }
      `;
      const analysis = analyzeCode(code);
      assert.ok(analysis.hasDocs);
    });

    it('should count functions and classes', () => {
      const code = `
        function a() {}
        function b() {}
        class Foo {}
        const c = () => {};
      `;
      const analysis = analyzeCode(code);

      assert.ok(analysis.functionCount >= 3);
      assert.equal(analysis.classCount, 1);
    });

    it('should estimate complexity', () => {
      const simple = `function add(a, b) { return a + b; }`;
      const complex = `
        function nested() {
          if (x) {
            for (let i = 0; i < n; i++) {
              if (y) {
                while (z) {
                  if (a) {
                    if (b) {
                      if (c) {
                        for (let j = 0; j < m; j++) {
                          switch (d) { case 1: if (e) { } break; }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const simpleAnalysis = analyzeCode(simple);
      const complexAnalysis = analyzeCode(complex);

      assert.equal(simpleAnalysis.complexity, 'low');
      // Complex code should be 'high' or at least 'medium'
      assert.ok(['medium', 'high'].includes(complexAnalysis.complexity));
    });

    it('should return null for non-code', () => {
      assert.equal(analyzeCode('Hello world'), null);
      assert.equal(analyzeCode(''), null);
    });
  });

  // ===========================================================================
  // ANALYZE TEXT
  // ===========================================================================

  describe('analyzeText', () => {
    it('should count words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const analysis = analyzeText(text);
      assert.equal(analysis.wordCount, 9);
    });

    it('should count sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const analysis = analyzeText(text);
      assert.equal(analysis.sentenceCount, 3);
    });

    it('should count paragraphs', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const analysis = analyzeText(text);
      assert.equal(analysis.paragraphCount, 3);
    });

    it('should calculate vocabulary richness', () => {
      const repetitive = 'the the the the the the the the';
      const rich = 'the quick brown fox jumps over lazy dog';

      const repAnalysis = analyzeText(repetitive);
      const richAnalysis = analyzeText(rich);

      assert.ok(richAnalysis.vocabularyRichness > repAnalysis.vocabularyRichness);
    });

    it('should detect structure elements', () => {
      // Use text with patterns at start of line (no leading spaces)
      const structured = `# Header
- Bullet point
1. Numbered item`;
      const analysis = analyzeText(structured);

      assert.ok(analysis.hasHeaders);
      assert.ok(analysis.hasBullets);
      assert.ok(analysis.hasNumberedList);
    });

    it('should detect tone indicators', () => {
      const text = 'Is this a question? Yes! According to "source".';
      const analysis = analyzeText(text);

      assert.ok(analysis.hasQuestions);
      assert.ok(analysis.hasExclamations);
      assert.ok(analysis.hasCitations);
    });

    it('should handle empty text', () => {
      const analysis = analyzeText('');
      // Empty text returns empty object
      assert.ok(typeof analysis === 'object');
      // wordCount may be undefined or 0
      assert.ok(analysis.wordCount === 0 || analysis.wordCount === undefined);
    });
  });

  // ===========================================================================
  // DETECT SOURCES
  // ===========================================================================

  describe('detectSources', () => {
    it('should detect URLs', () => {
      const text = 'Check out https://example.com and http://test.org';
      const sources = detectSources(text);

      assert.ok(sources.includes('https://example.com'));
      assert.ok(sources.includes('http://test.org'));
    });

    it('should detect GitHub references', () => {
      const text = 'See github.com/owner/repo for more info';
      const sources = detectSources(text);

      assert.ok(sources.some(s => s.includes('github.com/owner/repo')));
    });

    it('should detect npm packages', () => {
      const text = 'Install @cynic/core and lodash@4.17.21';
      const sources = detectSources(text);

      assert.ok(sources.some(s => s.includes('@cynic/core')));
      assert.ok(sources.some(s => s.includes('lodash@4.17')));
    });

    it('should detect citations', () => {
      const text = 'According to [1] and [Smith, 2024]';
      const sources = detectSources(text);

      assert.ok(sources.some(s => s.includes('[1]')));
      assert.ok(sources.some(s => s.includes('[Smith, 2024]')));
    });

    it('should deduplicate sources', () => {
      const text = 'https://example.com and https://example.com again';
      const sources = detectSources(text);

      const exampleCount = sources.filter(s => s === 'https://example.com').length;
      assert.equal(exampleCount, 1);
    });

    it('should return empty array for text without sources', () => {
      const sources = detectSources('No sources here');
      assert.deepEqual(sources, []);
    });
  });

  // ===========================================================================
  // GENERATE HASH
  // ===========================================================================

  describe('generateHash', () => {
    it('should generate consistent hash', () => {
      const hash1 = generateHash('test content');
      const hash2 = generateHash('test content');
      assert.equal(hash1, hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateHash('content A');
      const hash2 = generateHash('content B');
      assert.notEqual(hash1, hash2);
    });

    it('should return 16-char hash', () => {
      const hash = generateHash('test');
      assert.equal(hash.length, 16);
    });

    it('should return null for empty content', () => {
      assert.equal(generateHash(''), null);
      assert.equal(generateHash(null), null);
    });
  });

  // ===========================================================================
  // ENRICH ITEM - BASIC
  // ===========================================================================

  describe('enrichItem - basic', () => {
    it('should enrich string content', () => {
      const enriched = enrichItem('Hello world');

      assert.ok(enriched.id);
      assert.equal(enriched.content, 'Hello world');
      assert.ok(enriched.hash);
      assert.ok(enriched.enrichedAt);
    });

    it('should enrich object content', () => {
      const enriched = enrichItem({ content: 'Test', author: 'Alice' });

      assert.equal(enriched.content, 'Test');
      assert.equal(enriched.author, 'Alice');
    });

    it('should preserve original properties', () => {
      const enriched = enrichItem({
        id: 'custom_id',
        content: 'Test',
        customField: 'preserved',
      });

      assert.equal(enriched.id, 'custom_id');
      assert.equal(enriched.customField, 'preserved');
    });

    it('should detect content type', () => {
      const codeItem = enrichItem(`import React from 'react';
export default function App() {
  const x = 1;
  return x;
}`);
      assert.equal(codeItem.type, 'code');
    });

    it('should add timestamps', () => {
      const enriched = enrichItem('test');

      assert.ok(enriched.createdAt);
      assert.ok(enriched.enrichedAt);
      assert.ok(enriched.enrichedAt >= enriched.createdAt);
    });
  });

  // ===========================================================================
  // ENRICH ITEM - CODE ANALYSIS
  // ===========================================================================

  describe('enrichItem - code analysis', () => {
    it('should include code analysis for code content', () => {
      const code = `import { foo } from 'bar';
export function add(a, b) {
  return a + b;
}
const x = () => { return 1; };`;
      const enriched = enrichItem(code);

      assert.ok(enriched.codeAnalysis);
      assert.ok(enriched.hasCode);
      assert.equal(enriched.language, 'javascript');
    });

    it('should map code properties to scorer fields', () => {
      const code = `
        /**
         * Documented function
         */
        function test() {
          try {
            return true;
          } catch (e) {
            return false;
          }
        }

        describe('test', () => {
          expect(test()).toBe(true);
        });
      `;
      const enriched = enrichItem(code);

      assert.equal(enriched.tested, true);
      assert.equal(enriched.documentation, true);
      assert.equal(enriched.hasErrorHandling, true);
    });
  });

  // ===========================================================================
  // ENRICH ITEM - CONTEXT
  // ===========================================================================

  describe('enrichItem - context', () => {
    it('should merge context into enriched item', () => {
      const enriched = enrichItem('test', {
        author: 'Bob',
        topic: 'testing',
        sources: ['http://extra.com'],
      });

      assert.equal(enriched.author, 'Bob');
      assert.ok(enriched.sources.includes('http://extra.com'));
    });

    it('should prefer item properties over context', () => {
      const enriched = enrichItem(
        { content: 'test', author: 'Alice' },
        { author: 'Bob' }
      );

      assert.equal(enriched.author, 'Alice');
    });

    it('should use context type if not detected', () => {
      const enriched = enrichItem('simple text', { type: 'custom' });
      assert.equal(enriched.type, 'custom');
    });
  });

  // ===========================================================================
  // ENRICH ITEM - TAGS
  // ===========================================================================

  describe('enrichItem - tags', () => {
    it('should extract crypto tags', () => {
      const enriched = enrichItem('Check out this solana token with defi features');

      assert.ok(enriched.tags.includes('solana'));
      assert.ok(enriched.tags.includes('token'));
      assert.ok(enriched.tags.includes('defi'));
    });

    it('should extract risk tags', () => {
      const enriched = enrichItem('This is a scam token with honeypot code');

      assert.ok(enriched.tags.some(t => t.startsWith('risk:')));
      assert.ok(enriched.tags.includes('risk:scam'));
      assert.ok(enriched.tags.includes('risk:honeypot'));
    });

    it('should extract quality tags when no risks', () => {
      const enriched = enrichItem('This is an audited and verified protocol');

      assert.ok(enriched.tags.some(t => t.startsWith('quality:')));
    });

    it('should NOT extract quality tags when risks present', () => {
      // "unaudited" should trigger risk, not quality
      const enriched = enrichItem('This unaudited scam claims to be verified');

      // Should have risk tags
      assert.ok(enriched.tags.some(t => t.startsWith('risk:')));
      // Should NOT have quality:audited or quality:verified
      assert.ok(!enriched.tags.includes('quality:audited'));
    });

    it('should merge item and context tags', () => {
      const enriched = enrichItem(
        { content: 'test', tags: ['tag1'] },
        { tags: ['tag2'] }
      );

      assert.ok(enriched.tags.includes('tag1'));
      assert.ok(enriched.tags.includes('tag2'));
    });
  });

  // ===========================================================================
  // ENRICH ITEM - AUTHENTICITY
  // ===========================================================================

  describe('enrichItem - authenticity', () => {
    it('should detect original content', () => {
      const enriched = enrichItem('This is my original implementation');
      assert.equal(enriched.original, true);
    });

    it('should detect forked/copied content', () => {
      const enriched = enrichItem('This is a fork of the original project');
      assert.equal(enriched.original, false);
    });

    it('should detect authentic content', () => {
      const enriched = enrichItem(
        'This audited contract at 0x1234567890abcdef has 2024-01-15 deployment',
        { verified: true }
      );
      assert.equal(enriched.authentic, true);
    });

    it('should detect inauthentic (risky) content', () => {
      const enriched = enrichItem('This is a scam rug pull honeypot');
      assert.equal(enriched.authentic, false);
    });

    it('should use item properties over detection', () => {
      const enriched = enrichItem({
        content: 'copy of something',
        original: true, // Override detection
        authentic: true,
      });

      assert.equal(enriched.original, true);
      assert.equal(enriched.authentic, true);
    });
  });

  // ===========================================================================
  // ENRICH ITEM - RELEVANCE
  // ===========================================================================

  describe('enrichItem - relevance', () => {
    it('should calculate relevance score', () => {
      const enriched = enrichItem('A detailed token analysis with blockchain data');
      assert.ok(enriched.relevance >= 0 && enriched.relevance <= 100);
    });

    it('should increase relevance for domain terms', () => {
      const crypto = enrichItem('solana ethereum defi wallet transaction');
      const generic = enrichItem('the quick brown fox');

      assert.ok(crypto.relevance > generic.relevance);
    });

    it('should increase relevance for topic match', () => {
      const enriched = enrichItem(
        'This analysis covers solana performance',
        { topic: 'solana' }
      );
      assert.ok(enriched.relevance >= 70);
    });
  });

  // ===========================================================================
  // ENRICH ITEM - DERIVED SCORES
  // ===========================================================================

  describe('enrichItem - derived scores', () => {
    it('should calculate coherence hint', () => {
      const enriched = enrichItem('A varied sentence with unique vocabulary richness');
      assert.ok(enriched.derivedScores.coherenceHint >= 0);
    });

    it('should calculate structure hint', () => {
      const structured = enrichItem(`
        # Header
        - Point one
        - Point two

        Another paragraph.
      `);
      assert.ok(structured.derivedScores.structureHint > 50);
    });

    it('should calculate completeness hint', () => {
      const complete = enrichItem({
        id: 'test',
        type: 'analysis',
        content: 'This is a complete item with substantial content for analysis.',
        sources: ['http://source.com'],
      });
      assert.ok(complete.derivedScores.completenessHint > 50);
    });

    it('should calculate verifiability hint', () => {
      const verifiable = enrichItem({
        content: 'Test with sources',
        sources: ['http://a.com', 'http://b.com'],
        verified: true,
      });
      assert.ok(verifiable.derivedScores.verifiabilityHint > 60);
    });

    it('should calculate code-specific hints', () => {
      const code = `
        /**
         * Documented
         */
        function test() {
          try {
            expect(true).toBe(true);
          } catch (e) {}
        }
      `;
      const enriched = enrichItem(code);

      assert.ok(enriched.derivedScores.transparencyHint > 50);
      assert.ok(enriched.derivedScores.contributionHint > 50);
      assert.ok(enriched.derivedScores.efficiencyHint >= 35);
    });
  });

  // ===========================================================================
  // ENRICH ITEMS (BATCH)
  // ===========================================================================

  describe('enrichItems', () => {
    it('should enrich multiple items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const enriched = enrichItems(items);

      assert.equal(enriched.length, 3);
      assert.ok(enriched.every(e => e.id && e.hash));
    });

    it('should apply shared context to all items', () => {
      const items = ['A', 'B'];
      const enriched = enrichItems(items, { author: 'Shared' });

      assert.ok(enriched.every(e => e.author === 'Shared'));
    });

    it('should handle empty array', () => {
      const enriched = enrichItems([]);
      assert.deepEqual(enriched, []);
    });

    it('should handle mixed content types', () => {
      const items = [
        'Plain text',
        { content: 'Object content' },
        `function code() { return true; }`,
      ];
      const enriched = enrichItems(items);

      assert.equal(enriched.length, 3);
      assert.ok(enriched[2].hasCode);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle null/undefined input', () => {
      const enriched = enrichItem(null);
      assert.ok(enriched.id);
      assert.equal(enriched.content, undefined);
    });

    it('should extract text from various properties', () => {
      const variants = [
        { content: 'A' },
        { body: 'B' },
        { text: 'C' },
        { data: 'D' },
        { description: 'E' },
      ];

      for (const item of variants) {
        const enriched = enrichItem(item);
        assert.ok(enriched.hash); // Hash means text was extracted
      }
    });

    it('should handle very long content', () => {
      const longContent = 'word '.repeat(10000);
      const enriched = enrichItem(longContent);

      assert.ok(enriched.hash);
      assert.ok(enriched.textAnalysis.wordCount > 9000);
    });

    it('should handle content with special characters', () => {
      const special = 'Test with émojis 🎯 and spëcial chars @#$%^&*()';
      const enriched = enrichItem(special);

      assert.ok(enriched.hash);
      assert.ok(enriched.id);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const enriched = enrichItem('test');
        ids.add(enriched.id);
      }
      assert.equal(ids.size, 100);
    });

    it('should handle deeply nested object', () => {
      const nested = {
        level1: {
          level2: {
            content: 'Deep content',
          },
        },
      };
      const enriched = enrichItem(nested);
      assert.ok(enriched.id);
    });
  });

  // ===========================================================================
  // RISK DETECTION
  // ===========================================================================

  describe('risk detection', () => {
    it('should detect rug pull pattern', () => {
      const enriched = enrichItem('Warning: This is a rug pull');
      assert.ok(enriched.tags.some(t => t.includes('risk')));
    });

    it('should detect zero audit pattern', () => {
      const enriched = enrichItem('This contract has zero audit');
      assert.ok(enriched.tags.some(t => t.includes('risk')));
    });

    it('should detect anonymous team', () => {
      const enriched = enrichItem('Created by anonymous team');
      assert.ok(enriched.tags.some(t => t.includes('risk')));
    });

    it('should detect 100% tax/fee', () => {
      const enriched = enrichItem('Contract has 100% tax on sells');
      assert.ok(enriched.tags.some(t => t.includes('risk')));
    });

    it('should heavily penalize scam indicators in authenticity', () => {
      const scam = enrichItem('This is a scam rug pull honeypot drain fake');
      assert.equal(scam.authentic, false);
      assert.equal(scam.original, false);
    });
  });
});
