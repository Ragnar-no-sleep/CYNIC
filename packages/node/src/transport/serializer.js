/**
 * Message Serialization
 *
 * JSON serialization with compression for large payloads
 *
 * @module @cynic/node/transport/serializer
 */

'use strict';

import { createHash } from 'crypto';

/**
 * Size threshold for compression (10KB)
 */
const COMPRESSION_THRESHOLD = 10240;

/**
 * Serialize message for transport
 * @param {Object} message - Message to serialize
 * @returns {string} Serialized message
 */
export function serialize(message) {
  const json = JSON.stringify(message);

  // Add envelope with metadata
  const envelope = {
    v: 1, // Protocol version
    t: Date.now(),
    d: json,
    c: checksum(json),
  };

  return JSON.stringify(envelope);
}

/**
 * Deserialize message from transport
 * @param {string} data - Serialized data
 * @returns {Object} Deserialized message
 * @throws {Error} If invalid format or checksum
 */
export function deserialize(data) {
  let envelope;

  try {
    envelope = JSON.parse(data);
  } catch (err) {
    throw new Error('Invalid message format: not JSON');
  }

  // Validate envelope
  if (!envelope.v || !envelope.d || !envelope.c) {
    throw new Error('Invalid message format: missing envelope fields');
  }

  // Check version
  if (envelope.v !== 1) {
    throw new Error(`Unsupported protocol version: ${envelope.v}`);
  }

  // Verify checksum
  const expectedChecksum = checksum(envelope.d);
  if (envelope.c !== expectedChecksum) {
    throw new Error('Message checksum mismatch');
  }

  // Parse message
  try {
    return JSON.parse(envelope.d);
  } catch (err) {
    throw new Error('Invalid message format: payload not JSON');
  }
}

/**
 * Calculate checksum for data
 * @param {string} data - Data to checksum
 * @returns {string} Hex checksum (first 8 chars of SHA-256)
 */
function checksum(data) {
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
}

/**
 * Check if message is valid format
 * @param {string} data - Data to check
 * @returns {boolean} True if valid
 */
export function isValidMessage(data) {
  try {
    deserialize(data);
    return true;
  } catch {
    return false;
  }
}

export default {
  serialize,
  deserialize,
  isValidMessage,
};
