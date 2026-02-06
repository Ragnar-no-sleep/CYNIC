/**
 * Chain Service Factories
 *
 * Creates PoJ Chain Manager and Solana Anchor Integration.
 * "Onchain is truth" - κυνικός
 *
 * @module @cynic/mcp/server/service-initializer/chain-factories
 */

'use strict';

import { globalEventBus, createLogger } from '@cynic/core';
import { PoJChainManager } from '../../poj-chain-manager.js';

const log = createLogger('ChainFactories');

// Lazy-loaded anchor module
let anchorModule = null;
async function getAnchorModule() {
  if (anchorModule) return anchorModule;
  try {
    anchorModule = await import('@cynic/anchor');
    return anchorModule;
  } catch (e) {
    log.debug('Anchor module not available (optional)', { error: e.message });
    return null;
  }
}

/**
 * Create PoJ Chain Manager
 */
export async function createPoJChainManagerFactory(services, config) {
  // P2P consensus configuration from environment
  const p2pNodeUrl = process.env.CYNIC_P2P_NODE_URL || config.p2pNodeUrl;
  const p2pEnabled = p2pNodeUrl && (process.env.CYNIC_P2P_ENABLED !== 'false');

  const pojChainManager = new PoJChainManager(services.persistence, {
    onBlockCreated: config.onBlockCreated,
    p2pNodeUrl,
    p2pEnabled,
  });
  await pojChainManager.initialize();

  if (p2pEnabled) {
    log.info('PoJ P2P consensus enabled', { nodeUrl: p2pNodeUrl });
  }

  // Verify chain integrity at startup
  if (services.persistence?.pojBlocks) {
    const verification = await pojChainManager.verifyIntegrity();
    if (verification.valid) {
      if (verification.blocksChecked > 0) {
        log.info('PoJ chain verified', { blocksChecked: verification.blocksChecked });
      }
    } else {
      log.error('PoJ chain integrity error', { errorCount: verification.errors.length });
      for (const err of verification.errors.slice(0, 3)) {
        log.error('Invalid block link', { blockNumber: err.blockNumber, expected: err.expected?.slice(0, 16) });
      }
    }
  }

  return pojChainManager;
}

/**
 * Create Anchor Integration - Solana anchoring for PoJ blocks
 *
 * Requires:
 * - CYNIC_SOLANA_CLUSTER: devnet/testnet/mainnet-beta (default: devnet)
 * - CYNIC_WALLET_PATH: Path to Solana wallet JSON
 * - CYNIC_ANCHOR_ENABLED: true/false (default: true if wallet exists)
 */
export async function createAnchorIntegrationFactory(services) {
  const anchor = await getAnchorModule();
  if (!anchor) {
    log.debug('Anchor integration skipped (module not available)');
    return null;
  }

  if (!services.pojChainManager) {
    log.debug('Anchor integration skipped (no pojChainManager)');
    return null;
  }

  // Configuration from environment
  const cluster = process.env.CYNIC_SOLANA_CLUSTER || 'devnet';
  const walletPath = process.env.CYNIC_WALLET_PATH;
  const enabled = process.env.CYNIC_ANCHOR_ENABLED !== 'false';

  if (!enabled) {
    log.debug('Anchor integration disabled via CYNIC_ANCHOR_ENABLED=false');
    return null;
  }

  try {
    // Load wallet if path provided
    let wallet = null;
    if (walletPath) {
      try {
        wallet = anchor.CynicWallet.fromFile(walletPath);
        log.info('Solana wallet loaded', { path: walletPath, publicKey: wallet.publicKey });
      } catch (e) {
        log.warn('Wallet load failed, using simulation mode', { error: e.message });
      }
    }

    // Create standalone anchorer
    const anchorer = anchor.createAnchorer({
      cluster,
      wallet,
      useAnchorProgram: true,
      onAnchor: (record) => {
        log.info('Block anchored to Solana', {
          merkleRoot: record.merkleRoot?.slice(0, 16) + '...',
          signature: record.signature?.slice(0, 20) + '...',
          slot: record.slot,
        });
        globalEventBus.publish('poj:block:anchored', {
          merkleRoot: record.merkleRoot,
          signature: record.signature,
          slot: record.slot,
          timestamp: Date.now(),
        });
      },
      onError: (record, error) => {
        log.error('Anchor failed', {
          merkleRoot: record.merkleRoot?.slice(0, 16) + '...',
          error: error.message,
        });
      },
    });

    // Subscribe to block creation events
    const unsubscribe = globalEventBus.subscribe('poj:block:created', async (event) => {
      const { slot, hash, judgmentCount, judgmentsRoot, judgmentIds } = event.payload || {};
      const merkleRoot = judgmentsRoot;

      if (!merkleRoot) {
        log.debug('Block has no merkle root, skipping anchor', { slot });
        return;
      }

      log.info('Anchoring PoJ block', { slot, judgmentCount, merkleRoot: merkleRoot?.slice(0, 16) + '...' });

      try {
        let itemIds = judgmentIds || [];
        if (itemIds.length === 0 && services.persistence?.pojBlocks) {
          const block = await services.persistence.pojBlocks.findByNumber(slot);
          itemIds = block?.judgment_ids || [];
        }

        anchorer.setBlockHeight(slot);
        await anchorer.anchor(merkleRoot, itemIds);
      } catch (e) {
        log.error('Block anchor failed', { slot, error: e.message });
      }
    });

    // Create wrapper object
    const integration = {
      anchorer,
      cluster,
      hasWallet: !!wallet,
      unsubscribe,
      getStats: () => ({
        ...anchorer.getStats(),
        cluster,
        hasWallet: !!wallet,
        mode: wallet ? 'LIVE' : 'SIMULATION',
      }),
      stop: () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      },
    };

    // Attach to pojChainManager
    services.pojChainManager.getAnchorStatus = () => integration.getStats();
    services.pojChainManager.getPendingAnchors = () => anchorer.getPendingAnchors?.() || [];

    log.info('Anchor integration ready', {
      cluster,
      hasWallet: !!wallet,
      autoAnchor: true,
      mode: wallet ? 'LIVE' : 'SIMULATION',
    });

    return integration;
  } catch (e) {
    log.error('Anchor integration failed', { error: e.message });
    return null;
  }
}
