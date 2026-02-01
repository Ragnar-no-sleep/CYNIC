/**
 * Workers Module (O4.2)
 *
 * Background worker pool for long-running tasks.
 *
 * @module @cynic/node/workers
 */

'use strict';

export {
  WorkerPool,
  WorkerTask,
  TaskStatus,
  WORKER_CONFIG,
  createWorkerPool,
  getWorkerPool,
  resetWorkerPool,
} from './worker-pool.js';

export {
  registerBuiltinHandlers,
  BUILTIN_TASK_TYPES,
} from './builtin-handlers.js';

// Re-export for convenience
import { WorkerPool, createWorkerPool, getWorkerPool } from './worker-pool.js';
import { registerBuiltinHandlers } from './builtin-handlers.js';

export default {
  WorkerPool,
  createWorkerPool,
  getWorkerPool,
  registerBuiltinHandlers,
};
