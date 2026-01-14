/**
 * Consensus Message Types
 *
 * Defines message formats for φ-BFT consensus protocol
 *
 * Message flow:
 * 1. Leader proposes block (BLOCK_PROPOSAL)
 * 2. Validators vote (VOTE)
 * 3. Votes aggregated (VOTE_AGGREGATE)
 * 4. Finality announced (FINALITY_NOTIFICATION)
 *
 * @module @cynic/protocol/consensus/messages
 */

'use strict';

/**
 * Consensus message types
 */
export const ConsensusMessageType = {
  // Block messages
  BLOCK_PROPOSAL: 'consensus:block_proposal',
  BLOCK_REQUEST: 'consensus:block_request',
  BLOCK_RESPONSE: 'consensus:block_response',

  // Vote messages
  VOTE: 'consensus:vote',
  VOTE_REQUEST: 'consensus:vote_request',
  VOTE_AGGREGATE: 'consensus:vote_aggregate',

  // Finality messages
  FINALITY_NOTIFICATION: 'consensus:finality',
  FINALITY_PROOF: 'consensus:finality_proof',

  // Sync messages
  SLOT_STATUS: 'consensus:slot_status',
  EPOCH_BOUNDARY: 'consensus:epoch_boundary',
  SYNC_REQUEST: 'consensus:sync_request',
  SYNC_RESPONSE: 'consensus:sync_response',

  // Validator messages
  VALIDATOR_JOIN: 'consensus:validator_join',
  VALIDATOR_LEAVE: 'consensus:validator_leave',
  VALIDATOR_UPDATE: 'consensus:validator_update',
};

/**
 * Create a block proposal message
 *
 * @param {Object} params - Proposal parameters
 * @param {string} params.blockHash - Block hash
 * @param {Object} params.block - Full block data
 * @param {number} params.slot - Slot number
 * @param {string} params.proposer - Proposer public key
 * @param {string} params.signature - Proposer signature
 * @returns {Object} Block proposal message
 */
export function createBlockProposal({ blockHash, block, slot, proposer, signature }) {
  return {
    type: ConsensusMessageType.BLOCK_PROPOSAL,
    blockHash,
    block,
    slot,
    proposer,
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Create a vote message
 *
 * @param {Object} params - Vote parameters
 * @param {string} params.blockHash - Block being voted on
 * @param {number} params.slot - Slot number
 * @param {string} params.decision - 'approve' or 'reject'
 * @param {string} params.voter - Voter public key
 * @param {number} params.weight - Vote weight
 * @param {string} params.signature - Vote signature
 * @returns {Object} Vote message
 */
export function createVoteMessage({ blockHash, slot, decision, voter, weight, signature }) {
  return {
    type: ConsensusMessageType.VOTE,
    blockHash,
    slot,
    decision,
    voter,
    weight,
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Create a vote aggregate message
 *
 * Aggregates multiple votes for efficient propagation
 *
 * @param {Object} params - Aggregate parameters
 * @param {string} params.blockHash - Block hash
 * @param {number} params.slot - Slot number
 * @param {number} params.approveWeight - Total approve weight
 * @param {number} params.rejectWeight - Total reject weight
 * @param {number} params.totalWeight - Total weight voted
 * @param {number} params.voteCount - Number of votes
 * @param {Array<Object>} params.votes - Individual votes (optional, for verification)
 * @returns {Object} Vote aggregate message
 */
export function createVoteAggregate({
  blockHash,
  slot,
  approveWeight,
  rejectWeight,
  totalWeight,
  voteCount,
  votes = [],
}) {
  return {
    type: ConsensusMessageType.VOTE_AGGREGATE,
    blockHash,
    slot,
    approveWeight,
    rejectWeight,
    totalWeight,
    voteCount,
    approveRatio: totalWeight > 0 ? approveWeight / totalWeight : 0,
    votes,
    timestamp: Date.now(),
  };
}

/**
 * Create a finality notification message
 *
 * @param {Object} params - Finality parameters
 * @param {string} params.blockHash - Finalized block hash
 * @param {number} params.slot - Block slot
 * @param {number} params.height - Block height
 * @param {string} params.status - Finality status
 * @param {number} params.probability - Finality probability
 * @param {number} params.confirmations - Confirmation count
 * @returns {Object} Finality notification message
 */
export function createFinalityNotification({
  blockHash,
  slot,
  height,
  status,
  probability,
  confirmations,
}) {
  return {
    type: ConsensusMessageType.FINALITY_NOTIFICATION,
    blockHash,
    slot,
    height,
    status,
    probability,
    confirmations,
    timestamp: Date.now(),
  };
}

/**
 * Create a slot status message
 *
 * Used for sync and monitoring
 *
 * @param {Object} params - Status parameters
 * @param {number} params.slot - Current slot
 * @param {number} params.epoch - Current epoch
 * @param {string} params.leader - Current leader
 * @param {string} params.latestBlockHash - Latest block hash
 * @param {number} params.latestFinalizedSlot - Latest finalized slot
 * @returns {Object} Slot status message
 */
export function createSlotStatus({
  slot,
  epoch,
  leader,
  latestBlockHash,
  latestFinalizedSlot,
}) {
  return {
    type: ConsensusMessageType.SLOT_STATUS,
    slot,
    epoch,
    leader,
    latestBlockHash,
    latestFinalizedSlot,
    timestamp: Date.now(),
  };
}

/**
 * Create a sync request message
 *
 * @param {Object} params - Sync parameters
 * @param {number} params.fromSlot - Start slot
 * @param {number} params.toSlot - End slot (optional)
 * @param {boolean} params.includeVotes - Include votes
 * @param {string} params.requestId - Unique request ID
 * @returns {Object} Sync request message
 */
export function createSyncRequest({ fromSlot, toSlot, includeVotes = false, requestId }) {
  return {
    type: ConsensusMessageType.SYNC_REQUEST,
    fromSlot,
    toSlot,
    includeVotes,
    requestId,
    timestamp: Date.now(),
  };
}

/**
 * Create a sync response message
 *
 * @param {Object} params - Response parameters
 * @param {string} params.requestId - Request ID being responded to
 * @param {Array<Object>} params.blocks - Block data
 * @param {Array<Object>} params.votes - Vote data (if requested)
 * @param {boolean} params.hasMore - More data available
 * @returns {Object} Sync response message
 */
export function createSyncResponse({ requestId, blocks, votes = [], hasMore = false }) {
  return {
    type: ConsensusMessageType.SYNC_RESPONSE,
    requestId,
    blocks,
    votes,
    hasMore,
    timestamp: Date.now(),
  };
}

/**
 * Create a validator join message
 *
 * @param {Object} params - Validator parameters
 * @param {string} params.publicKey - Validator public key
 * @param {number} params.eScore - E-Score
 * @param {number} params.stake - Stake amount
 * @param {string} params.signature - Join signature
 * @returns {Object} Validator join message
 */
export function createValidatorJoin({ publicKey, eScore, stake, signature }) {
  return {
    type: ConsensusMessageType.VALIDATOR_JOIN,
    publicKey,
    eScore,
    stake,
    weight: eScore * (1 + Math.log1p(stake)), // E-Score × burn multiplier
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Validate message structure
 *
 * @param {Object} message - Message to validate
 * @returns {Object} Validation result {valid, errors}
 */
export function validateMessage(message) {
  const errors = [];

  if (!message) {
    return { valid: false, errors: ['Message is null or undefined'] };
  }

  if (!message.type) {
    errors.push('Missing message type');
  }

  if (!message.timestamp) {
    errors.push('Missing timestamp');
  }

  // Type-specific validation
  switch (message.type) {
    case ConsensusMessageType.BLOCK_PROPOSAL:
      if (!message.blockHash) errors.push('Missing blockHash');
      if (!message.block) errors.push('Missing block');
      if (message.slot === undefined) errors.push('Missing slot');
      if (!message.proposer) errors.push('Missing proposer');
      break;

    case ConsensusMessageType.VOTE:
      if (!message.blockHash) errors.push('Missing blockHash');
      if (message.slot === undefined) errors.push('Missing slot');
      if (!['approve', 'reject'].includes(message.decision)) {
        errors.push('Invalid decision');
      }
      if (!message.voter) errors.push('Missing voter');
      break;

    case ConsensusMessageType.VOTE_AGGREGATE:
      if (!message.blockHash) errors.push('Missing blockHash');
      if (message.approveWeight === undefined) errors.push('Missing approveWeight');
      if (message.rejectWeight === undefined) errors.push('Missing rejectWeight');
      break;

    case ConsensusMessageType.FINALITY_NOTIFICATION:
      if (!message.blockHash) errors.push('Missing blockHash');
      if (!message.status) errors.push('Missing status');
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if message type is a consensus message
 * @param {string} type - Message type
 * @returns {boolean} True if consensus message
 */
export function isConsensusMessage(type) {
  return Boolean(type && type.startsWith('consensus:'));
}

export default {
  ConsensusMessageType,
  createBlockProposal,
  createVoteMessage,
  createVoteAggregate,
  createFinalityNotification,
  createSlotStatus,
  createSyncRequest,
  createSyncResponse,
  createValidatorJoin,
  validateMessage,
  isConsensusMessage,
};
