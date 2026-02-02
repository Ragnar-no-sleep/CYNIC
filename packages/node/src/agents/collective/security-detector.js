/**
 * Security Vulnerability Detector
 *
 * Pattern-based detection for common security vulnerabilities.
 * Used by Guardian dog for code analysis.
 *
 * Detects: SQL injection, XSS, path traversal, command injection,
 * hardcoded secrets, weak crypto, SSRF, NoSQL injection, JWT issues,
 * open redirect, prototype pollution, ReDoS, insecure random, XXE
 *
 * "φ guards the gate" - κυνικός
 *
 * @module @cynic/node/agents/collective/security-detector
 */

'use strict';

/**
 * Severity levels mapped to score penalties
 */
export const SEVERITY = Object.freeze({
  CRITICAL: { penalty: 80, score: 10 },   // Score 0-20
  HIGH: { penalty: 50, score: 35 },       // Score 30-50
  MEDIUM: { penalty: 25, score: 65 },     // Score 60-70
  LOW: { penalty: 10, score: 85 },        // Score 80-90
  INFO: { penalty: 5, score: 90 },        // Score 90-95
});

/**
 * Vulnerability patterns with detection rules
 */
export const VULNERABILITY_PATTERNS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SQL INJECTION (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'SQL_INJECTION',
    name: 'SQL Injection',
    severity: 'CRITICAL',
    patterns: [
      // Template literals in SQL queries
      /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|UNION)\s*[^'"`]*\$\{/i,
      // String concatenation in SQL
      /(?:query|execute|sql)\s*\(\s*['"`].*\+\s*(?:req|user|input|param)/i,
      // Direct interpolation patterns
      /['"`]SELECT\s+\*\s+FROM\s+\w+\s+WHERE\s+\w+\s*=\s*['"]\s*\$\{/i,
      // f-strings in Python SQL
      /f["'](?:SELECT|INSERT|UPDATE|DELETE).*\{.*\}/i,
    ],
    description: 'User input directly interpolated in SQL query allows attackers to modify query logic',
    remediation: 'Use parameterized queries or prepared statements',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // XSS - Cross-Site Scripting (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'XSS',
    name: 'Cross-Site Scripting (XSS)',
    severity: 'CRITICAL',
    patterns: [
      // innerHTML with user data
      /\.innerHTML\s*=\s*(?:req|user|input|param|\$\{)/i,
      // dangerouslySetInnerHTML
      /dangerouslySetInnerHTML\s*=\s*\{/,
      // document.write
      /document\.write\s*\([^)]*(?:req|user|input|param|\$\{)/i,
      // Template literals in HTML response with any variable
      /res\.send\s*\(\s*`[\s\S]*<[^>]*>[\s\S]*\$\{/i,
      // outerHTML assignment
      /\.outerHTML\s*=\s*(?:req|user|input|\$\{)/i,
      // Direct variable interpolation in HTML tags
      /<(?:p|div|span|h[1-6]|a|script)[^>]*>\s*\$\{/i,
    ],
    description: 'User input rendered in HTML without sanitization allows script injection',
    remediation: 'Sanitize user input, use textContent instead of innerHTML, escape HTML entities',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH TRAVERSAL (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PATH_TRAVERSAL',
    name: 'Path Traversal',
    severity: 'CRITICAL',
    patterns: [
      // Direct path concatenation
      /(?:readFile|writeFile|readdir|unlink|rmdir|stat)(?:Sync)?\s*\([^)]*(?:req\.params|req\.query|req\.body)/i,
      // Path join with user input without validation
      /path\.(?:join|resolve)\s*\([^)]*(?:req|user|input|filename)[^)]*\)/i,
      // fs operations with string concatenation (catches './uploads/' + req.params.filename)
      /fs\.\w+(?:Sync)?\s*\([^)]*['"`][^'"`)]*['"`]\s*\+/i,
      // Any string + req.params pattern
      /['"`][^'"` ]*['"`]\s*\+\s*req\.(?:params|query|body)\./i,
      // Express static with user path
      /express\.static\s*\([^)]*(?:req|param)/i,
    ],
    description: 'User-controlled file paths allow reading/writing arbitrary files',
    remediation: 'Validate and sanitize paths, use path.basename(), restrict to allowed directories',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND INJECTION (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'COMMAND_INJECTION',
    name: 'Command Injection',
    severity: 'CRITICAL',
    patterns: [
      // exec/spawn with user input
      /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*(?:req|user|input|\$\{)/i,
      // child_process with template literals
      /child_process\.\w+\s*\([^)]*\$\{/i,
      // os.system/popen in Python
      /(?:os\.system|subprocess\.(?:call|run|Popen)|popen)\s*\([^)]*(?:f["']|format\(|\+)/i,
      // Shell=True in subprocess
      /subprocess\.\w+\([^)]*shell\s*=\s*True/i,
    ],
    description: 'User input executed as shell command allows arbitrary code execution',
    remediation: 'Avoid shell commands, use arrays for arguments, validate/escape input',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EVAL INJECTION (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'EVAL_INJECTION',
    name: 'Code Injection via eval()',
    severity: 'CRITICAL',
    patterns: [
      // eval with user input
      /eval\s*\(\s*(?:req|user|input|param|\$\{|expression)/i,
      // Function constructor
      /new\s+Function\s*\([^)]*(?:req|user|input|\$\{)/i,
      // setTimeout/setInterval with string
      /set(?:Timeout|Interval)\s*\(\s*(?:req|user|input|['"`][^'"`)]*\+)/i,
      // vm.runInContext with user input
      /vm\.run\w*\s*\([^)]*(?:req|user|input)/i,
    ],
    description: 'User input executed as code allows arbitrary code execution',
    remediation: 'Never use eval() with user input, use safe alternatives like JSON.parse()',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HARDCODED SECRETS (HIGH)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'HARDCODED_SECRET',
    name: 'Hardcoded Secret',
    severity: 'HIGH',
    patterns: [
      // API keys
      /(?:api_?key|apikey|api_?secret)\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}/i,
      // AWS keys
      /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/,
      // Private keys
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
      // Bearer tokens
      /bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/i,
      // Password in code
      /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"` ]{8,}/i,
      // Stripe/payment keys
      /(?:sk_live_|sk_test_|pk_live_|pk_test_)[A-Za-z0-9]{24,}/,
    ],
    description: 'Credentials exposed in source code can be extracted from version control',
    remediation: 'Use environment variables, secret managers, or config files outside repo',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEAK CRYPTOGRAPHY (HIGH)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'WEAK_CRYPTO',
    name: 'Weak Cryptography',
    severity: 'HIGH',
    patterns: [
      // MD5 for passwords
      /(?:md5|MD5)\s*\(\s*(?:password|passwd|pwd|secret)/i,
      // SHA1 for security
      /(?:sha1|SHA1)\s*\(\s*(?:password|token|secret)/i,
      // DES encryption
      /(?:createCipher|DES|des)\s*\(/i,
      // ECB mode
      /ECB|MODE_ECB/i,
      // Hardcoded IV
      /(?:iv|IV|nonce)\s*[:=]\s*['"`][^'"` ]{8,}['"`]/,
    ],
    description: 'Weak cryptographic algorithms can be broken by attackers',
    remediation: 'Use bcrypt/scrypt for passwords, AES-GCM for encryption, secure random IVs',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SSRF - Server-Side Request Forgery (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'SSRF',
    name: 'Server-Side Request Forgery',
    severity: 'CRITICAL',
    patterns: [
      // fetch/axios with user URL
      /(?:fetch|axios\.get|axios\.post|request)\s*\(\s*(?:req|user|url|\$\{)/i,
      // http.get with user input
      /https?\.(?:get|request)\s*\([^)]*(?:req|user|url)/i,
      // URL from query parameter
      /(?:fetch|request)\s*\(\s*req\.(?:query|body|params)\.(?:url|uri|link)/i,
    ],
    description: 'User-controlled URLs allow accessing internal services and metadata endpoints',
    remediation: 'Whitelist allowed domains, validate URLs, block internal IP ranges',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOSQL INJECTION (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'NOSQL_INJECTION',
    name: 'NoSQL Injection',
    severity: 'CRITICAL',
    patterns: [
      // MongoDB with direct user object
      /\.(?:find|findOne|update|delete)(?:One|Many)?\s*\(\s*(?:req\.body|req\.query|{[^}]*:\s*req)/i,
      // $where with user input
      /\$where\s*:\s*(?:req|user|input)/i,
      // Direct query object from body
      /collection\.\w+\s*\(\s*req\.body\s*\)/i,
      // Shorthand object with variables from req.body (username, password pattern)
      /\.findOne\s*\(\s*\{\s*\w+\s*,\s*password\s*\}/i,
      // Variables destructured from req.body used directly in query
      /const\s*\{[^}]*\}\s*=\s*req\.body[\s\S]{0,100}\.find(?:One)?\s*\(/i,
    ],
    description: 'User input as query object allows MongoDB operator injection',
    remediation: 'Validate input types, sanitize operators, use mongoose schema validation',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JWT VULNERABILITIES (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'JWT_VULNERABILITY',
    name: 'JWT Vulnerability',
    severity: 'CRITICAL',
    patterns: [
      // jwt.decode without verify
      /jwt\.decode\s*\([^)]*\)\s*(?!.*verify)/i,
      // algorithms: ['none'] or alg: 'none'
      /(?:algorithms?\s*:\s*\[\s*['"`]none|alg\s*:\s*['"`]none)/i,
      // Missing algorithm check
      /verify\s*\([^)]*,\s*[^,)]+\s*\)(?!\s*,\s*\{)/,
    ],
    description: 'JWT vulnerabilities allow token forgery and authentication bypass',
    remediation: 'Always use jwt.verify(), specify allowed algorithms, reject "none" algorithm',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN REDIRECT (MEDIUM)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'OPEN_REDIRECT',
    name: 'Open Redirect',
    severity: 'MEDIUM',
    patterns: [
      // res.redirect with user input (direct or via variable)
      /res\.redirect\s*\(\s*(?:req|user|url|\$\{|redirect|return|next|callback)/i,
      // Location header with user input
      /setHeader\s*\(\s*['"`]Location['"`]\s*,\s*(?:req|user)/i,
      // window.location with user input
      /window\.location\s*=\s*(?:req|user|param)/i,
      // redirect_uri parameter (common OAuth pattern)
      /redirect_uri\s*\+/i,
    ],
    description: 'User-controlled redirect URLs enable phishing attacks',
    remediation: 'Whitelist allowed redirect domains, validate URLs against allowlist',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOTYPE POLLUTION (HIGH)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTOTYPE_POLLUTION',
    name: 'Prototype Pollution',
    severity: 'HIGH',
    patterns: [
      // Deep merge without __proto__ check
      /(?:merge|extend|assign)\s*\([^)]*\)\s*{[\s\S]*for\s*\(\s*(?:const|let|var)\s+\w+\s+in/i,
      // Direct __proto__ access
      /__proto__|constructor\.prototype/,
      // Recursive object merge with direct key assignment
      /function\s+\w*[Mm]erge\w*[\s\S]{0,200}\[key\]\s*=\s*\w+\[key\]/i,
      // for...in loop with direct property assignment (common vulnerable pattern)
      /for\s*\(\s*(?:const|let|var)\s+(\w+)\s+in\s+\w+\s*\)[\s\S]{0,100}target\[\1\]\s*=/i,
    ],
    description: 'Object prototype modification affects all objects in the application',
    remediation: 'Filter __proto__ and constructor keys, use Object.create(null), use Map',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REDOS - Regular Expression DoS (MEDIUM)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'REDOS',
    name: 'Regular Expression Denial of Service',
    severity: 'MEDIUM',
    patterns: [
      // Nested quantifiers with +
      /\/[^/]*\([^)]*\+\)[^/]*\+/,
      // Overlapping alternation with quantifiers
      /\/[^/]*\(\?:[^)]*\|[^)]*\)\+/,
      // Multiple consecutive groups with + (email validation pattern)
      /\)\+.*\)\+.*\)\+/,
      // Exponential backtracking pattern (group)+.*\1
      /\([^)]+\)\+[^/]*\([^)]+\)\+/,
    ],
    description: 'Evil regex causes catastrophic backtracking on crafted input',
    remediation: 'Avoid nested quantifiers, use atomic groups, limit input length',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSECURE RANDOMNESS (HIGH)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'INSECURE_RANDOM',
    name: 'Insecure Randomness',
    severity: 'HIGH',
    patterns: [
      // Math.random for security-sensitive purposes
      /Math\.random\s*\(\s*\).*(?:token|password|secret|key|session|auth)/i,
      // Weak random in Python
      /random\.(?:random|randint|choice)\s*\(.*(?:token|password|secret)/i,
      // UUID v1 (time-based, predictable)
      /uuid\.?v1\s*\(\)/i,
      // Function generating tokens using Math.random
      /function\s+\w*(?:Token|Secret|Key|Password|Reset)\w*[\s\S]{0,200}Math\.random/i,
      // Any Math.random in a loop building a string (common token pattern)
      /for\s*\([^)]*\)\s*\{[\s\S]{0,100}Math\.random/i,
    ],
    description: 'Predictable random values allow token/session prediction',
    remediation: 'Use crypto.randomBytes(), uuid.v4(), or secrets module',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // XXE - XML External Entity (HIGH)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'XXE',
    name: 'XML External Entity',
    severity: 'HIGH',
    patterns: [
      // Entity resolution enabled
      /(?:noent|dtdload|resolve_entities)\s*:\s*true/i,
      // libxmljs with unsafe options
      /parseXml\w*\s*\([^)]*\{[^}]*(?:noent|dtdload)\s*:\s*true/i,
      // XML parser without disabled DTD
      /(?:DOMParser|SAXParser|XMLReader)\s*\(/,
    ],
    description: 'XML entity resolution allows file reading and SSRF',
    remediation: 'Disable DTD processing, external entities, and parameter entities',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY CATCH (LOW - Code Quality)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'EMPTY_CATCH',
    name: 'Empty Catch Block',
    severity: 'LOW',
    patterns: [
      /catch\s*\([^)]*\)\s*\{\s*\}/,
      /except\s*:\s*pass/,
    ],
    description: 'Silent error suppression hides bugs and security issues',
    remediation: 'Log errors, rethrow, or handle appropriately',
  },
];

/**
 * Detect vulnerabilities in code
 *
 * @param {string} code - Source code to analyze
 * @param {Object} options - Detection options
 * @param {string[]} options.exclude - Vulnerability IDs to exclude
 * @param {string[]} options.include - Only detect these vulnerability IDs
 * @returns {Object} Detection result
 */
export function detectVulnerabilities(code, options = {}) {
  const { exclude = [], include = [] } = options;

  const issues = [];
  let worstSeverity = null;
  let totalPenalty = 0;

  // Get patterns to check
  let patterns = VULNERABILITY_PATTERNS;
  if (include.length > 0) {
    patterns = patterns.filter(p => include.includes(p.id));
  }
  if (exclude.length > 0) {
    patterns = patterns.filter(p => !exclude.includes(p.id));
  }

  // Normalize line endings
  const normalizedCode = code.replace(/\r\n/g, '\n');
  const lines = normalizedCode.split('\n');

  // Check each pattern
  for (const vuln of patterns) {
    for (const pattern of vuln.patterns) {
      // First, check if pattern matches full code (for multiline patterns)
      const fullMatch = pattern.test(normalizedCode);

      // Check line by line for accurate line numbers
      let foundOnLine = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          foundOnLine = true;
          const severity = SEVERITY[vuln.severity];

          issues.push({
            id: vuln.id,
            name: vuln.name,
            severity: vuln.severity,
            line: i + 1,
            column: line.search(pattern) + 1,
            code: line.trim().substring(0, 100),
            description: vuln.description,
            remediation: vuln.remediation,
          });

          // Track worst severity
          if (!worstSeverity || severity.penalty > SEVERITY[worstSeverity].penalty) {
            worstSeverity = vuln.severity;
          }

          // Accumulate penalty (diminishing returns)
          totalPenalty += severity.penalty * Math.pow(0.8, issues.length - 1);

          // Only report first occurrence of each pattern type per file
          break;
        }
      }

      // If pattern matches full code but not any single line (multiline pattern)
      if (fullMatch && !foundOnLine) {
        const severity = SEVERITY[vuln.severity];

        // Try to find approximate line (first line containing a keyword from pattern)
        let approxLine = 1;
        const patternStr = pattern.toString();
        const keywords = patternStr.match(/[a-zA-Z]{4,}/g) || [];
        for (let i = 0; i < lines.length; i++) {
          if (keywords.some(kw => lines[i].toLowerCase().includes(kw.toLowerCase()))) {
            approxLine = i + 1;
            break;
          }
        }

        issues.push({
          id: vuln.id,
          name: vuln.name,
          severity: vuln.severity,
          line: approxLine,
          column: 1,
          code: lines[approxLine - 1]?.trim().substring(0, 100) || '',
          description: vuln.description,
          remediation: vuln.remediation,
          multiline: true,
        });

        if (!worstSeverity || severity.penalty > SEVERITY[worstSeverity].penalty) {
          worstSeverity = vuln.severity;
        }

        totalPenalty += severity.penalty * Math.pow(0.8, issues.length - 1);
      }
    }
  }

  // Calculate score (100 = perfect, 0 = critical issues)
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  // Determine verdict based on φ thresholds
  let verdict;
  if (score >= 75) {
    verdict = 'HOWL';      // Clean code
  } else if (score >= 50) {
    verdict = 'WAG';       // Minor issues
  } else if (score >= 30) {
    verdict = 'GROWL';     // Significant issues
  } else {
    verdict = 'BARK';      // Critical - reject
  }

  return {
    score: Math.round(score * 10) / 10,
    verdict,
    issueCount: issues.length,
    worstSeverity,
    issues,
    summary: issues.length === 0
      ? 'No security vulnerabilities detected'
      : `Found ${issues.length} issue(s): ${issues.map(i => i.id).join(', ')}`,
  };
}

/**
 * Quick check if code has any critical vulnerabilities
 *
 * @param {string} code - Source code
 * @returns {boolean} True if critical issues found
 */
export function hasCriticalVulnerabilities(code) {
  const result = detectVulnerabilities(code, {
    include: VULNERABILITY_PATTERNS
      .filter(p => p.severity === 'CRITICAL')
      .map(p => p.id),
  });
  return result.issueCount > 0;
}

/**
 * Get vulnerability info by ID
 *
 * @param {string} id - Vulnerability ID
 * @returns {Object|null} Vulnerability info
 */
export function getVulnerabilityInfo(id) {
  return VULNERABILITY_PATTERNS.find(p => p.id === id) || null;
}

export default {
  detectVulnerabilities,
  hasCriticalVulnerabilities,
  getVulnerabilityInfo,
  VULNERABILITY_PATTERNS,
  SEVERITY,
};
