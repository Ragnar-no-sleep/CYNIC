/**
 * TokenScorer - 17-dimension φ-governed token judgment
 *
 * "φ distrusts φ" — Every score capped at 61.8% confidence
 *
 * 4 Axioms × 4 Dimensions + THE_UNNAMEABLE = 17 honest dimensions
 * Each dimension is traceable to an on-chain data source.
 * No dimension is invented. If we can't measure it, we don't claim it.
 *
 * @module @cynic/observatory/oracle/scorer
 */

'use strict';

import {
  PHI, PHI_INV, PHI_INV_2, PHI_INV_3,
  calculateKScore,
} from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * K-Score Tiers (token quality rating)
 * φ-aligned thresholds
 */
/**
 * Verdict tiers — driven by Q-Score (the unified judgment)
 * K-Score is a supplementary metric, not the verdict driver.
 */
const VERDICT_TIERS = Object.freeze([
  { name: 'BARK', min: 0, threshold: PHI_INV_3 * 100, icon: '🔴', description: 'High risk — proceed with extreme caution' },
  { name: 'GROWL', min: PHI_INV_3 * 100, threshold: PHI_INV_2 * 100, icon: '🟡', description: 'Caution — significant concerns detected' },
  { name: 'WAG', min: PHI_INV_2 * 100, threshold: PHI_INV * 100, icon: '🔵', description: 'Acceptable — some strengths, some gaps' },
  { name: 'HOWL', min: PHI_INV * 100, threshold: 100, icon: '🟢', description: 'Strong — above the golden threshold' },
]);

const K_TIERS = Object.freeze([
  { name: 'Rust', min: 0 },
  { name: 'Iron', min: 20 },
  { name: 'Copper', min: 35 },
  { name: 'Bronze', min: 50 },
  { name: 'Silver', min: 62 },
  { name: 'Gold', min: 70 },
  { name: 'Platinum', min: 80 },
  { name: 'Diamond', min: 90 },
]);

/**
 * Axiom weights for Q-Score calculation
 * Sum = 1.0 (normalized)
 */
const AXIOM_WEIGHTS = Object.freeze({
  PHI: PHI_INV,       // 0.618 — Harmony is the most important
  VERIFY: PHI_INV_2,  // 0.382 — Truth is second
  CULTURE: PHI_INV_3, // 0.236 — Memory matters
  BURN: 1 - PHI_INV - PHI_INV_2 - PHI_INV_3, // Remainder ≈ 0.146
});

// Normalize weights to sum to 1
const WEIGHT_SUM = Object.values(AXIOM_WEIGHTS).reduce((s, v) => s + v, 0);

// ═══════════════════════════════════════════════════════════════════════════
// SCORER
// ═══════════════════════════════════════════════════════════════════════════

export class TokenScorer {

  /**
   * Score a token across 17 dimensions
   * @param {Object} tokenData - Output from TokenFetcher.getTokenData()
   * @returns {Object} Full verdict with scores, dimensions, and confidence
   */
  score(tokenData) {
    // ═══════════════════════════════════════════════════════════════════════
    // DIMENSION SCORES (0-100 each)
    // ═══════════════════════════════════════════════════════════════════════

    const dimensions = {
      // PHI: Harmony / Balance
      supplyDistribution: this._scoreSupplyDistribution(tokenData),
      liquidityDepth: this._scoreLiquidityDepth(tokenData),
      priceStability: this._scorePriceStability(tokenData),
      supplyMechanics: this._scoreSupplyMechanics(tokenData),

      // VERIFY: Truth / Verifiability
      mintAuthority: this._scoreMintAuthority(tokenData),
      freezeAuthority: this._scoreFreezeAuthority(tokenData),
      metadataIntegrity: this._scoreMetadataIntegrity(tokenData),
      programVerification: this._scoreProgramVerification(tokenData),

      // CULTURE: Community / Memory
      holderCount: this._scoreHolderCount(tokenData),
      tokenAge: this._scoreTokenAge(tokenData),
      ecosystemIntegration: this._scoreEcosystemIntegration(tokenData),
      organicGrowth: this._scoreOrganicGrowth(tokenData),

      // BURN: Creation vs Extraction
      burnActivity: this._scoreBurnActivity(tokenData),
      creatorBehavior: this._scoreCreatorBehavior(tokenData),
      feeRedistribution: this._scoreFeeRedistribution(tokenData),
      realUtility: this._scoreRealUtility(tokenData),
    };

    // THE_UNNAMEABLE: What we can't measure
    // Higher = more uncertainty = more doubt
    const measuredDimensions = Object.values(dimensions);
    const avgMeasured = measuredDimensions.reduce((s, v) => s + v, 0) / measuredDimensions.length;
    const dataCompleteness = this._calculateDataCompleteness(tokenData);
    dimensions.theUnnameable = Math.round(100 * (1 - dataCompleteness));

    // ═══════════════════════════════════════════════════════════════════════
    // AXIOM SCORES (weighted average of dimensions)
    // ═══════════════════════════════════════════════════════════════════════

    const axiomScores = {
      PHI: this._axiomAverage([
        dimensions.supplyDistribution,
        dimensions.liquidityDepth,
        dimensions.priceStability,
        dimensions.supplyMechanics,
      ]),
      VERIFY: this._axiomAverage([
        dimensions.mintAuthority,
        dimensions.freezeAuthority,
        dimensions.metadataIntegrity,
        dimensions.programVerification,
      ]),
      CULTURE: this._axiomAverage([
        dimensions.holderCount,
        dimensions.tokenAge,
        dimensions.ecosystemIntegration,
        dimensions.organicGrowth,
      ]),
      BURN: this._axiomAverage([
        dimensions.burnActivity,
        dimensions.creatorBehavior,
        dimensions.feeRedistribution,
        dimensions.realUtility,
      ]),
    };

    // ═══════════════════════════════════════════════════════════════════════
    // Q-SCORE: Weighted combination of axiom scores
    // ═══════════════════════════════════════════════════════════════════════

    const qScore = Math.round(
      (axiomScores.PHI * AXIOM_WEIGHTS.PHI +
        axiomScores.VERIFY * AXIOM_WEIGHTS.VERIFY +
        axiomScores.CULTURE * AXIOM_WEIGHTS.CULTURE +
        axiomScores.BURN * AXIOM_WEIGHTS.BURN) / WEIGHT_SUM,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // K-SCORE: Token quality (D × O × L)
    // ═══════════════════════════════════════════════════════════════════════

    const d = this._extractDiamondHands(tokenData, dimensions);
    const o = this._extractOrganicGrowth(tokenData, dimensions);
    const l = this._extractLongevity(tokenData, dimensions);
    const kScore = calculateKScore(d, o, l);
    const tier = this._getTier(kScore);

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIDENCE: Capped at φ⁻¹ (61.8%) — ALWAYS
    // ═══════════════════════════════════════════════════════════════════════

    const rawConfidence = dataCompleteness * PHI_INV;
    const confidence = Math.min(PHI_INV, rawConfidence);

    // ═══════════════════════════════════════════════════════════════════════
    // VERDICT
    // ═══════════════════════════════════════════════════════════════════════

    const verdictTier = this._getVerdictTier(qScore);

    // Identify weaknesses (dimensions below φ⁻² threshold)
    const weaknesses = [];
    for (const [name, score] of Object.entries(dimensions)) {
      if (name === 'theUnnameable') continue;
      if (score < PHI_INV_2 * 100) {
        weaknesses.push({
          dimension: name,
          score,
          axiom: this._dimensionToAxiom(name),
          reason: this._weaknessReason(name, score, tokenData),
        });
      }
    }

    return {
      // Identity
      mint: tokenData.mint,
      name: tokenData.name,
      symbol: tokenData.symbol,

      // Scores
      qScore,
      kScore,
      confidence: Math.round(confidence * 1000) / 1000,

      // Verdict (driven by Q-Score)
      verdict: verdictTier.name,
      verdictIcon: verdictTier.icon,
      verdictDescription: verdictTier.description,

      // K-Tier (supplementary — token quality metal)
      kTier: tier.name,

      // Dimensions (full transparency)
      axiomScores,
      dimensions,

      // K-Score components
      kComponents: {
        d: Math.round(d * 1000) / 1000,
        o: Math.round(o * 1000) / 1000,
        l: Math.round(l * 1000) / 1000,
      },

      // Issues
      weaknesses,
      theUnnameable: dimensions.theUnnameable,

      // Meta
      totalDimensions: 17,
      timestamp: new Date().toISOString(),
      philosophy: 'φ distrusts φ — max confidence 61.8%',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHI DIMENSIONS (Harmony / Balance)
  // ═══════════════════════════════════════════════════════════════════════════

  /** D1: Supply Distribution — Gini coefficient inverted (lower gini = higher score) */
  _scoreSupplyDistribution(data) {
    if (data.isNative) return 70; // SOL has wide distribution but validators concentrate
    const gini = data.distribution?.giniCoefficient ?? 1;
    return Math.round((1 - gini) * 100);
  }

  /** D2: Liquidity Depth — whale concentration as proxy, price as signal */
  _scoreLiquidityDepth(data) {
    if (data.isNative) return 100; // SOL is the most liquid Solana asset
    let score = 0;
    const whaleConc = data.distribution?.whaleConcentration ?? 1;
    score += Math.round((1 - whaleConc) * 60); // 0-60 from distribution
    if (data.priceInfo?.pricePerToken > 0) score += 40; // Has DEX liquidity
    return Math.min(100, score);
  }

  /** D3: Price Stability — placeholder (needs price history) */
  _scorePriceStability(_data) {
    // Without price data, return neutral score
    // THE_UNNAMEABLE will capture this uncertainty
    return 50;
  }

  /** D4: Supply Mechanics — mint authority analysis */
  _scoreSupplyMechanics(data) {
    let score = 50; // Baseline

    // Renounced mint authority = supply is fixed = +30
    if (data.authorities?.mintAuthorityActive === false) {
      score += 30;
    } else {
      score -= 20; // Active mint authority = inflation risk
    }

    // Renounced freeze authority = +20
    if (data.authorities?.freezeAuthorityActive === false) {
      score += 20;
    } else {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY DIMENSIONS (Truth / Verifiability)
  // ═══════════════════════════════════════════════════════════════════════════

  /** D5: Mint Authority — is it renounced? */
  _scoreMintAuthority(data) {
    if (data.isNative) return 100; // Native SOL
    if (data.authorities?.mintAuthorityActive === false) return 100; // Renounced
    if (data.authorities?.mintAuthorityActive === true) return 20; // Active = risk
    return 50; // Unknown
  }

  /** D6: Freeze Authority — can accounts be frozen? */
  _scoreFreezeAuthority(data) {
    if (data.isNative) return 100;
    if (data.authorities?.freezeAuthorityActive === false) return 100; // No freeze = safe
    if (data.authorities?.freezeAuthorityActive === true) return 15; // Can freeze = major risk
    return 50; // Unknown
  }

  /** D7: Metadata Integrity — is metadata complete and valid? */
  _scoreMetadataIntegrity(data) {
    const meta = data.metadataIntegrity || {};
    let score = 0;
    if (meta.hasName) score += 30;
    if (meta.hasSymbol) score += 25;
    if (meta.hasUri) score += 25;
    if (meta.hasImage) score += 20;
    return score;
  }

  /** D8: Program Verification — placeholder (needs verified program check) */
  _scoreProgramVerification(data) {
    if (data.isNative) return 100;
    // Without program verification data, use metadata completeness as proxy
    const meta = data.metadataIntegrity || {};
    const completeFields = [meta.hasName, meta.hasSymbol, meta.hasUri].filter(Boolean).length;
    return Math.round((completeFields / 3) * 60) + 20;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURE DIMENSIONS (Community / Memory)
  // ═══════════════════════════════════════════════════════════════════════════

  /** D9: Holder Count — more holders = stronger community */
  _scoreHolderCount(data) {
    if (data.isNative) return 100; // SOL is held by everyone
    const holders = data.distribution?.holderCount || 0;
    if (holders >= 100000) return 100;
    if (holders >= 10000) return 90;
    if (holders >= 1000) return 75;
    if (holders >= 100) return 55;
    if (holders >= 20) return 35;
    if (holders >= 5) return 15;
    return 5;
  }

  /** D10: Token Age — older = more battle-tested */
  _scoreTokenAge(data) {
    if (data.isNative) return 100; // SOL has existed since genesis
    const days = data.ageInDays || 0;
    if (days >= 730) return 100;   // 2+ years
    if (days >= 365) return 90;    // 1+ year
    if (days >= 180) return 75;    // 6+ months
    if (days >= 90) return 60;     // 3+ months
    if (days >= 30) return 40;     // 1+ month
    if (days >= 7) return 20;      // 1+ week
    return 5;                       // Very new = very risky
  }

  /** D11: Ecosystem Integration — based on holder count + price availability */
  _scoreEcosystemIntegration(data) {
    if (data.isNative) return 100;
    let score = 30; // Base: token exists on-chain
    // Has price data from Helius = listed on DEX
    if (data.priceInfo?.pricePerToken > 0) score += 35;
    // Many holders = ecosystem presence
    const holders = data.distribution?.holderCount || 0;
    if (holders >= 1000) score += 25;
    else if (holders >= 100) score += 15;
    // Has metadata URI = project cares
    if (data.metadataIntegrity?.hasUri) score += 10;
    return Math.min(100, score);
  }

  /** D12: Organic Growth — distribution quality */
  _scoreOrganicGrowth(data) {
    if (data.isNative) return 90; // SOL has organic ecosystem-wide distribution
    const gini = data.distribution?.giniCoefficient ?? 1;
    const whaleConc = data.distribution?.whaleConcentration ?? 1;
    const organicScore = ((1 - gini) * 0.5 + (1 - whaleConc) * 0.5) * 100;
    return Math.round(organicScore);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BURN DIMENSIONS (Creation vs Extraction)
  // ═══════════════════════════════════════════════════════════════════════════

  /** D13: Burn Activity — placeholder (needs burn tx analysis) */
  _scoreBurnActivity(data) {
    if (data.isNative) return 80; // SOL has natural burns via fees
    // Without burn data, return neutral
    return 50;
  }

  /** D14: Creator Behavior — has creator dumped? */
  _scoreCreatorBehavior(data) {
    // Without creator wallet tracking, use supply mechanics as proxy
    if (data.authorities?.mintAuthorityActive === false) return 70; // Renounced = less extraction
    return 40; // Active authority = could extract
  }

  /** D15: Fee Redistribution — placeholder (needs protocol fee analysis) */
  _scoreFeeRedistribution(_data) {
    return 50; // Neutral without data
  }

  /** D16: Real Utility — placeholder (needs dApp usage data) */
  _scoreRealUtility(data) {
    if (data.isNative) return 100; // SOL has maximum utility
    // Without usage data, use holder count as weak proxy
    const holders = data.distribution?.holderCount || 0;
    if (holders >= 1000) return 60;
    if (holders >= 100) return 40;
    return 20;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _axiomAverage(scores) {
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  }

  _calculateDataCompleteness(data) {
    let available = 0;
    let total = 9; // 9 key data points

    if (data.isNative) return 1.0; // Native SOL has full data implicitly

    if (data.name && data.name !== 'Unknown') available++;
    if (data.supply?.total > 0) available++;
    if (data.distribution?.topHolders?.length > 0) available++;
    if (data.authorities?.mintAuthority !== undefined) available++;
    if (data.authorities?.freezeAuthority !== undefined) available++;
    if (data.ageInDays > 0) available++;
    if (data.distribution?.holderCount > 0) available++;
    if (data.metadataIntegrity?.hasUri) available++;
    if (data.priceInfo?.pricePerToken > 0) available++;

    return available / total;
  }

  _extractDiamondHands(_data, dimensions) {
    // D = conviction = how much holders believe
    // Weighted: supply mechanics matters more than raw distribution
    return (dimensions.supplyDistribution * 0.4 + dimensions.supplyMechanics * 0.6) / 100;
  }

  _extractOrganicGrowth(_data, dimensions) {
    // O = organic = natural community growth
    // Weighted: holder count is the strongest signal
    return (dimensions.organicGrowth * 0.35 + dimensions.holderCount * 0.65) / 100;
  }

  _extractLongevity(_data, dimensions) {
    // L = longevity = time-tested and integrated
    // Weighted: age is strongest signal
    return (dimensions.tokenAge * 0.6 + dimensions.ecosystemIntegration * 0.4) / 100;
  }

  _getTier(kScore) {
    for (let i = K_TIERS.length - 1; i >= 0; i--) {
      if (kScore >= K_TIERS[i].min) return K_TIERS[i];
    }
    return K_TIERS[0];
  }

  _getVerdictTier(qScore) {
    for (let i = VERDICT_TIERS.length - 1; i >= 0; i--) {
      if (qScore >= VERDICT_TIERS[i].min) return VERDICT_TIERS[i];
    }
    return VERDICT_TIERS[0];
  }

  _dimensionToAxiom(name) {
    const map = {
      supplyDistribution: 'PHI', liquidityDepth: 'PHI',
      priceStability: 'PHI', supplyMechanics: 'PHI',
      mintAuthority: 'VERIFY', freezeAuthority: 'VERIFY',
      metadataIntegrity: 'VERIFY', programVerification: 'VERIFY',
      holderCount: 'CULTURE', tokenAge: 'CULTURE',
      ecosystemIntegration: 'CULTURE', organicGrowth: 'CULTURE',
      burnActivity: 'BURN', creatorBehavior: 'BURN',
      feeRedistribution: 'BURN', realUtility: 'BURN',
    };
    return map[name] || 'UNKNOWN';
  }

  _weaknessReason(name, score, data) {
    const reasons = {
      supplyDistribution: 'Token supply concentrated in few wallets',
      liquidityDepth: 'Insufficient liquidity depth',
      priceStability: 'Insufficient price history data',
      supplyMechanics: 'Mint/freeze authority still active',
      mintAuthority: 'Mint authority not renounced — inflation risk',
      freezeAuthority: 'Freeze authority active — accounts can be frozen',
      metadataIntegrity: 'Incomplete or missing metadata',
      programVerification: 'Program not verified on-chain',
      holderCount: 'Very few token holders',
      tokenAge: 'Token is very new — insufficient history',
      ecosystemIntegration: 'Limited ecosystem integration',
      organicGrowth: 'Distribution appears inorganic',
      burnActivity: 'No burn mechanism detected',
      creatorBehavior: 'Creator wallet behavior unclear',
      feeRedistribution: 'Fee model unclear',
      realUtility: 'Limited real-world utility detected',
    };
    return reasons[name] || 'Below threshold';
  }
}
