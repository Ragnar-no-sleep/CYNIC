/**
 * Memory Module
 *
 * Implements Layers 2-4 of the 6-layer hybrid context architecture.
 *
 * Layer 2: Collective Memory (SharedMemory)
 * Layer 3: Procedural Memory (SharedMemory.procedures)
 * Layer 4: User Lab (UserLab)
 *
 * @module @cynic/node/memory
 */

'use strict';

export { SharedMemory } from './shared-memory.js';
export { UserLab, LabManager } from './user-lab.js';
