/**
 * SolanaJudge Config — C2.2 (SOLANA × JUDGE)
 *
 * Domain-specific configuration for the Solana Judge.
 * Template logic lives in create-judge.js.
 *
 * Judges transactions, accounts, programs, and network state
 * using dimension-weighted scoring with φ-capped confidence.
 *
 * @module @cynic/node/cycle/configs/solana-judge.config
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

export const SolanaJudgmentType = {
  TRANSACTION: 'transaction',
  ACCOUNT: 'account',
  PROGRAM: 'program',
  NETWORK: 'network',
  TOKEN: 'token',
};

// Solana-specific dimensions (subset aligned with CYNIC 25D)
const SOLANA_DIMENSIONS = {
  signature_valid:      { weight: 1.0, axiom: 'verify' },
  rent_exempt:          { weight: 0.8, axiom: 'verify' },
  program_verified:     { weight: 0.9, axiom: 'verify' },
  fee_efficiency:       { weight: 0.7, axiom: 'phi' },
  compute_efficiency:   { weight: 0.6, axiom: 'phi' },
  balance_health:       { weight: 0.8, axiom: 'phi' },
  account_age:          { weight: 0.5, axiom: 'culture' },
  transaction_history:  { weight: 0.6, axiom: 'culture' },
  program_popularity:   { weight: 0.4, axiom: 'culture' },
  burn_potential:       { weight: 0.7, axiom: 'burn' },
  stake_amount:         { weight: 0.6, axiom: 'burn' },
  fees_contributed:     { weight: 0.5, axiom: 'burn' },
};

export const solanaJudgeConfig = {
  name: 'SolanaJudge',
  cell: 'C2.2',
  dimension: 'SOLANA',
  eventPrefix: 'solana',
  judgmentTypes: SolanaJudgmentType,
  maxHistory: 89,

  verdictLevels: {
    HOWL: 80,
    WAG: 50,
    GROWL: PHI_INV_2 * 100,
  },

  score(type, data) {
    switch (type) {
      case SolanaJudgmentType.TRANSACTION:
        return scoreTransaction(data);
      case SolanaJudgmentType.ACCOUNT:
        return scoreAccount(data);
      case SolanaJudgmentType.PROGRAM:
        return scoreProgram(data);
      case SolanaJudgmentType.NETWORK:
        return scoreNetwork(data);
      default:
        return { fee_efficiency: 50, compute_efficiency: 50 };
    }
  },

  // Custom weighted-average aggregate using dimension weights + φ dampening
  aggregate(scores) {
    const validEntries = Object.entries(scores)
      .filter(([k, v]) => v !== null && SOLANA_DIMENSIONS[k]);

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [dim, score] of validEntries) {
      const weight = SOLANA_DIMENSIONS[dim]?.weight || 1;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // Apply φ confidence dampening (unique to Solana: finalScore = rawScore × confidence)
    const confidence = Math.min(PHI_INV, rawScore / 100);
    return rawScore * confidence;
  },

  enrichResult(result, type, data, scores) {
    // Add rawScore (pre-dampening) and subject summary
    const validEntries = Object.entries(scores)
      .filter(([k, v]) => v !== null && SOLANA_DIMENSIONS[k]);
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [dim, score] of validEntries) {
      const weight = SOLANA_DIMENSIONS[dim]?.weight || 1;
      weightedSum += score * weight;
      totalWeight += weight;
    }
    result.rawScore = totalWeight > 0 ? weightedSum / totalWeight : 50;
    result.finalScore = result.score;
    result.subject = summarizeSubject(type, data);
  },

  healthCheck(stats) {
    const timeSinceLastJudgment = stats.lastJudgment
      ? Date.now() - stats.lastJudgment
      : null;

    let status = 'healthy';
    let score = PHI_INV;

    if (stats.totalJudgments === 0) {
      status = 'idle';
      score = PHI_INV_2;
    } else if (stats.verdicts.BARK > stats.totalJudgments * 0.5) {
      status = 'alarming';
      score = PHI_INV_3;
    }

    return {
      status,
      score,
      totalJudgments: stats.totalJudgments,
      avgScore: stats.avgScore,
      verdictDistribution: stats.verdicts,
      timeSinceLastJudgment,
    };
  },

  // Convenience methods added to prototype
  prototype: {
    judgeTransaction(tx) {
      return this.judge({ type: SolanaJudgmentType.TRANSACTION, data: tx });
    },
    judgeAccount(account) {
      return this.judge({ type: SolanaJudgmentType.ACCOUNT, data: account });
    },
    judgeProgram(program) {
      return this.judge({ type: SolanaJudgmentType.PROGRAM, data: program });
    },
    judgeNetwork(network) {
      return this.judge({ type: SolanaJudgmentType.NETWORK, data: network });
    },
  },
};

// =============================================================================
// Type-specific scoring functions (extracted from original SolanaJudge)
// =============================================================================

function scoreTransaction(tx) {
  const scores = {};
  scores.signature_valid = tx.signature ? 100 : 0;

  const maxFee = 5000;
  scores.fee_efficiency = tx.fee
    ? Math.min(100, ((maxFee - tx.fee) / maxFee) * 100)
    : 50;

  const maxCU = 200000;
  scores.compute_efficiency = tx.computeUnits
    ? Math.min(100, ((maxCU - tx.computeUnits) / maxCU) * 100)
    : 50;

  scores.transaction_history = tx.success ? 100 : 0;
  return scores;
}

function scoreAccount(account) {
  const scores = {};
  scores.rent_exempt = account.rentEpoch === 0 || account.lamports > 890880 ? 100 : 0;

  const solBalance = account.lamports / 1e9;
  if (solBalance >= 1) scores.balance_health = 100;
  else if (solBalance >= 0.1) scores.balance_health = 80;
  else if (solBalance >= 0.01) scores.balance_health = 50;
  else scores.balance_health = 20;

  scores.account_age = account.age
    ? Math.min(100, account.age / 365 * 100)
    : 50;

  scores.stake_amount = account.stakeAmount
    ? Math.min(100, (account.stakeAmount / 1e9) * 10)
    : null;

  return scores;
}

function scoreProgram(program) {
  const scores = {};
  scores.program_verified = program.verified ? 100 : 20;

  if (program.txCount) {
    if (program.txCount > 1000000) scores.program_popularity = 100;
    else if (program.txCount > 100000) scores.program_popularity = 80;
    else if (program.txCount > 10000) scores.program_popularity = 60;
    else scores.program_popularity = 40;
  } else {
    scores.program_popularity = 50;
  }

  scores.burn_potential = program.feesGenerated
    ? Math.min(100, (program.feesGenerated / 1e9) * 100)
    : 50;

  return scores;
}

function scoreNetwork(network) {
  const scores = {};

  if (network.tps) {
    if (network.tps >= 2000) scores.compute_efficiency = 100;
    else if (network.tps >= 1000) scores.compute_efficiency = 80;
    else if (network.tps >= 500) scores.compute_efficiency = 60;
    else scores.compute_efficiency = 40;
  }

  if (network.slotLag !== undefined) {
    if (network.slotLag <= 1) scores.fee_efficiency = 100;
    else if (network.slotLag <= 5) scores.fee_efficiency = 80;
    else if (network.slotLag <= 20) scores.fee_efficiency = 60;
    else scores.fee_efficiency = 30;
  }

  scores.stake_amount = network.activeValidators
    ? Math.min(100, (network.activeValidators / 2000) * 100)
    : 50;

  return scores;
}

function summarizeSubject(type, subject) {
  switch (type) {
    case SolanaJudgmentType.TRANSACTION:
      return { signature: subject.signature?.slice(0, 12) + '...' };
    case SolanaJudgmentType.ACCOUNT:
      return { pubkey: subject.pubkey?.slice(0, 12) + '...' };
    case SolanaJudgmentType.PROGRAM:
      return { programId: subject.programId?.slice(0, 12) + '...' };
    case SolanaJudgmentType.NETWORK:
      return { cluster: subject.cluster || 'unknown' };
    default:
      return {};
  }
}
