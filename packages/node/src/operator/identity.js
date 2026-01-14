/**
 * Operator Identity
 *
 * Node identity management with Ed25519 keypair
 *
 * @module @cynic/node/operator/identity
 */

'use strict';

import { generateKeypair, formatPublicKey, phiSaltedHash } from '@cynic/protocol';

/**
 * Create new operator identity
 * @param {Object} [options] - Identity options
 * @param {string} [options.name] - Operator name (optional)
 * @returns {Object} Operator identity
 */
export function createIdentity(options = {}) {
  const { publicKey, privateKey } = generateKeypair();

  return {
    id: phiSaltedHash(publicKey),
    publicKey,
    privateKey,
    publicKeyFormatted: formatPublicKey(publicKey),
    name: options.name || `node_${publicKey.slice(0, 8)}`,
    createdAt: Date.now(),
  };
}

/**
 * Import operator identity from existing keypair
 * @param {Object} params - Import parameters
 * @param {string} params.publicKey - Public key (hex)
 * @param {string} params.privateKey - Private key (hex)
 * @param {string} [params.name] - Operator name
 * @returns {Object} Operator identity
 */
export function importIdentity({ publicKey, privateKey, name }) {
  return {
    id: phiSaltedHash(publicKey),
    publicKey,
    privateKey,
    publicKeyFormatted: formatPublicKey(publicKey),
    name: name || `node_${publicKey.slice(0, 8)}`,
    createdAt: Date.now(),
  };
}

/**
 * Export identity for storage (excludes private key by default)
 * @param {Object} identity - Operator identity
 * @param {boolean} [includePrivate=false] - Include private key
 * @returns {Object} Exportable identity
 */
export function exportIdentity(identity, includePrivate = false) {
  const exported = {
    id: identity.id,
    publicKey: identity.publicKey,
    name: identity.name,
    createdAt: identity.createdAt,
  };

  if (includePrivate) {
    exported.privateKey = identity.privateKey;
  }

  return exported;
}

/**
 * Get public identity (safe to share)
 * @param {Object} identity - Full identity
 * @returns {Object} Public identity
 */
export function getPublicIdentity(identity) {
  return {
    id: identity.id,
    publicKey: identity.publicKeyFormatted || formatPublicKey(identity.publicKey),
    name: identity.name,
  };
}

export default {
  createIdentity,
  importIdentity,
  exportIdentity,
  getPublicIdentity,
};
