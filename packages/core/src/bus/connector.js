/**
 * CYNIC Bus Connector
 *
 * Connects local EventEmitters to the global CYNICEventBus.
 * Allows gradual migration without breaking existing code.
 *
 * "All dogs speak to the pack" - κυνικός
 *
 * @module @cynic/core/bus/connector
 */

'use strict';

import { EventEmitter } from 'node:events';
import { globalEventBus, CYNICEvent, EventType } from './event-bus.js';

/**
 * Event namespace mapping for different components
 */
export const EVENT_NAMESPACES = {
  // Persistence layer
  'GraphOverlay': 'graph',
  'GraphStore': 'graph',
  'PoJChain': 'poj',
  'MerkleDAG': 'dag',

  // MCP layer
  'MetricsService': 'metrics',
  'AlertManager': 'alert',
  'DiscoveryService': 'discovery',
  'EcosystemService': 'ecosystem',
  'IntegratorService': 'integrator',
  'OperatorRegistry': 'operator',

  // Judge layer
  'LearningService': 'learning',
  'LearningManager': 'learning',
  'JudgmentGraphIntegration': 'judgment',
  'SelfSkeptic': 'skeptic',

  // Protocol layer
  'ConsensusEngine': 'consensus',
  'ConsensusGossip': 'gossip',

  // Transport layer
  'WebSocketTransport': 'transport',
  'PeerDiscovery': 'peer',

  // Agent layer
  'AgentEventBus': 'agent',
};

/**
 * Connect an EventEmitter to the global bus
 *
 * @param {EventEmitter} emitter - Local EventEmitter to connect
 * @param {Object} [options] - Connection options
 * @param {string} [options.namespace] - Event namespace (auto-detected from class name)
 * @param {string[]} [options.events] - Specific events to forward (default: all)
 * @param {string[]} [options.exclude] - Events to exclude from forwarding
 * @param {CYNICEventBus} [options.bus] - Bus to connect to (default: globalEventBus)
 * @returns {Function} Disconnect function
 *
 * @example
 * const disconnect = connectToBus(graphOverlay, {
 *   namespace: 'graph',
 *   events: ['node:added', 'edge:added'],
 * });
 *
 * // Later: disconnect()
 */
export function connectToBus(emitter, options = {}) {
  const {
    namespace = detectNamespace(emitter),
    events = null,
    exclude = [],
    bus = globalEventBus,
  } = options;

  const originalEmit = emitter.emit.bind(emitter);
  const forwarded = new Set();

  // Override emit to forward to global bus
  emitter.emit = function (eventName, ...args) {
    // Always emit locally first
    const result = originalEmit(eventName, ...args);

    // Check if we should forward
    if (shouldForward(eventName, events, exclude)) {
      const globalEventType = `${namespace}:${eventName}`;
      const payload = args.length === 1 ? args[0] : { args };

      bus.publish(globalEventType, payload, {
        source: emitter.constructor?.name || namespace,
        metadata: { local: true },
      });

      forwarded.add(eventName);
    }

    return result;
  };

  // Return disconnect function
  return () => {
    emitter.emit = originalEmit;
    return { forwarded: Array.from(forwarded) };
  };
}

/**
 * Detect namespace from emitter class name
 * @private
 */
function detectNamespace(emitter) {
  const className = emitter.constructor?.name;
  return EVENT_NAMESPACES[className] || className?.toLowerCase() || 'unknown';
}

/**
 * Check if event should be forwarded
 * @private
 */
function shouldForward(eventName, allowList, denyList) {
  // Skip Node.js internal events
  if (['newListener', 'removeListener', 'error'].includes(eventName)) {
    return false;
  }

  // Check deny list
  if (denyList.includes(eventName)) {
    return false;
  }

  // Check allow list (if specified)
  if (allowList && !allowList.includes(eventName)) {
    return false;
  }

  return true;
}

/**
 * Mixin to add bus connectivity to a class
 *
 * @param {Function} BaseClass - Class extending EventEmitter
 * @param {Object} [options] - Connection options
 * @returns {Function} Enhanced class
 *
 * @example
 * class MyService extends withBusConnectivity(EventEmitter, { namespace: 'myservice' }) {
 *   doSomething() {
 *     this.emit('something:done', { result: 42 });
 *     // Automatically forwarded to global bus as 'myservice:something:done'
 *   }
 * }
 */
export function withBusConnectivity(BaseClass, options = {}) {
  return class extends BaseClass {
    #busDisconnect = null;

    constructor(...args) {
      super(...args);
      this.#busDisconnect = connectToBus(this, {
        ...options,
        namespace: options.namespace || detectNamespace(this),
      });
    }

    /**
     * Disconnect from global bus
     */
    disconnectFromBus() {
      if (this.#busDisconnect) {
        this.#busDisconnect();
        this.#busDisconnect = null;
      }
    }
  };
}

/**
 * Create a bus-connected EventEmitter
 *
 * @param {string} namespace - Event namespace
 * @param {Object} [options] - Options
 * @returns {EventEmitter} Bus-connected emitter
 */
export function createBusEmitter(namespace, options = {}) {
  const emitter = new EventEmitter();
  connectToBus(emitter, { ...options, namespace });
  return emitter;
}

/**
 * Subscribe to events from a specific component
 *
 * @param {string} namespace - Component namespace
 * @param {string} eventName - Event name (without namespace)
 * @param {Function} handler - Event handler
 * @param {CYNICEventBus} [bus] - Bus to subscribe to
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsub = subscribeToComponent('graph', 'node:added', (event) => {
 *   console.log('Node added:', event.payload);
 * });
 */
export function subscribeToComponent(namespace, eventName, handler, bus = globalEventBus) {
  const fullEventType = `${namespace}:${eventName}`;
  return bus.subscribe(fullEventType, handler);
}

/**
 * Subscribe to all events from a component
 *
 * @param {string} namespace - Component namespace
 * @param {Function} handler - Event handler
 * @param {CYNICEventBus} [bus] - Bus to subscribe to
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAllFromComponent(namespace, handler, bus = globalEventBus) {
  return bus.subscribe(`${namespace}:*`, handler);
}
