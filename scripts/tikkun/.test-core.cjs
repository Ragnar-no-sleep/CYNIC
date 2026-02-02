
const core = require('C:/Users/zeyxm/Desktop/asdfasdfa/CYNIC/scripts/lib/cynic-core.cjs');
console.log(JSON.stringify({
  hasPHI: typeof core.PHI === 'number',
  hasPHI_INV: typeof core.PHI_INV === 'number',
  hasDetectUser: typeof core.detectUser === 'function',
  hasOrchestrate: typeof core.orchestrate === 'function',
}));
