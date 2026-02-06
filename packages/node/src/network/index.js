/**
 * CYNIC Network Module
 *
 * PHASE 2: DECENTRALIZE
 *
 * Multi-node P2P networking infrastructure.
 *
 * "The pack hunts together" - κυνικός
 *
 * @module @cynic/node/network
 */

'use strict';

// Main orchestrator
import { CYNICNetworkNode, NetworkState } from './network-node.js';

// Re-export all
export { CYNICNetworkNode, NetworkState };

// Re-export from related modules for convenience
export { PeerDiscovery, DiscoveryState } from '../transport/discovery.js';
export { TransportComponent } from '../components/transport-component.js';
export { ConsensusComponent, ConsensusState, BlockStatus } from '../components/consensus-component.js';

export default { CYNICNetworkNode, NetworkState };
