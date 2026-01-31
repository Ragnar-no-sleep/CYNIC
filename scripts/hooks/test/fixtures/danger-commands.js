/**
 * Dangerous commands for testing guard hook
 *
 * Categories of dangerous operations that should be blocked or warned.
 *
 * @module scripts/hooks/test/fixtures/danger-commands
 */

'use strict';

/**
 * CRITICAL - Should always be blocked
 */
export const CRITICAL_COMMANDS = [
  { command: 'rm -rf /', description: 'Delete entire filesystem' },
  { command: 'rm -rf /*', description: 'Delete all root directories' },
  { command: 'rm -rf ~', description: 'Delete home directory' },
  { command: 'rm -rf .', description: 'Delete current directory' },
  { command: 'chmod 777 -R /', description: 'Open permissions on entire system' },
  { command: 'dd if=/dev/zero of=/dev/sda', description: 'Wipe disk' },
  { command: ':(){:|:&};:', description: 'Fork bomb' },
  { command: 'mkfs.ext4 /dev/sda', description: 'Format disk' },
];

/**
 * HIGH - Should be warned with explanation
 */
export const HIGH_RISK_COMMANDS = [
  { command: 'git push --force origin main', description: 'Force push to main' },
  { command: 'git push -f origin master', description: 'Force push to master' },
  { command: 'git reset --hard HEAD~10', description: 'Reset 10 commits hard' },
  { command: 'npm publish', description: 'Publish to npm' },
  { command: 'docker system prune -a -f', description: 'Remove all Docker resources' },
  { command: 'DROP DATABASE production', description: 'Drop production database' },
  { command: 'DELETE FROM users', description: 'Delete all users' },
];

/**
 * MEDIUM - Should be warned
 */
export const MEDIUM_RISK_COMMANDS = [
  { command: 'git checkout .', description: 'Discard all local changes' },
  { command: 'git clean -fd', description: 'Remove untracked files' },
  { command: 'rm -rf node_modules', description: 'Delete node_modules' },
  { command: 'npm ci', description: 'Clean install dependencies' },
  { command: 'git stash drop', description: 'Drop stash' },
];

/**
 * SAFE - Should be allowed without warning
 */
export const SAFE_COMMANDS = [
  { command: 'git status', description: 'Check git status' },
  { command: 'ls -la', description: 'List files' },
  { command: 'npm test', description: 'Run tests' },
  { command: 'git log --oneline -10', description: 'View recent commits' },
  { command: 'node --version', description: 'Check node version' },
  { command: 'git add .',  description: 'Stage all changes' },
  { command: 'git commit -m "test"', description: 'Commit changes' },
];

/**
 * Dangerous file operations
 */
export const DANGEROUS_FILE_OPS = {
  Write: [
    { file_path: '/etc/passwd', content: 'hacked' },
    { file_path: '/etc/shadow', content: 'hacked' },
    { file_path: '.env', content: 'API_KEY=leaked' },
    { file_path: 'credentials.json', content: '{}' },
  ],
  Edit: [
    { file_path: '/etc/hosts', old_string: 'x', new_string: 'y' },
    { file_path: '.ssh/authorized_keys', old_string: 'x', new_string: 'y' },
  ],
};

/**
 * Safe file operations
 */
export const SAFE_FILE_OPS = {
  Write: [
    { file_path: 'test.js', content: 'console.log("test")' },
    { file_path: 'src/component.tsx', content: 'export default () => null' },
  ],
  Read: [
    { file_path: 'package.json' },
    { file_path: 'README.md' },
  ],
};

export default {
  CRITICAL_COMMANDS,
  HIGH_RISK_COMMANDS,
  MEDIUM_RISK_COMMANDS,
  SAFE_COMMANDS,
  DANGEROUS_FILE_OPS,
  SAFE_FILE_OPS,
};
