/**
 * Ecosystem Service Factories
 *
 * Creates Librarian, Discovery, Ecosystem, Integrator, Graph, and Collective.
 *
 * @module @cynic/mcp/server/service-initializer/ecosystem-factories
 */

'use strict';

import { JudgmentGraphIntegration, getCollectivePack, awakenCynic } from '@cynic/node';
import { createLogger } from '@cynic/core';
import { GraphOverlay } from '@cynic/persistence/graph';

import { LibrarianService } from '../../librarian-service.js';
import { DiscoveryService } from '../../discovery-service.js';

const log = createLogger('EcosystemFactories');

/**
 * Create Librarian Service
 */
export async function createLibrarianFactory(services) {
  const librarian = new LibrarianService(services.persistence);
  await librarian.initialize();
  log.debug('Librarian ready');
  return librarian;
}

/**
 * Create Discovery Service
 */
export async function createDiscoveryFactory(services) {
  const discovery = new DiscoveryService(services.persistence, {
    autoHealthCheck: true,
    githubToken: process.env.GITHUB_TOKEN,
  });
  await discovery.init();
  log.debug('Discovery ready');
  return discovery;
}

/**
 * Create Ecosystem Service
 */
export async function createEcosystemFactory(services) {
  const { EcosystemService } = await import('../../ecosystem-service.js');
  const ecosystem = new EcosystemService(services.persistence, {
    autoRefresh: true,
  });
  await ecosystem.init();
  log.debug('Ecosystem ready');
  return ecosystem;
}

/**
 * Create Integrator Service
 */
export async function createIntegratorFactory() {
  const { IntegratorService } = await import('../../integrator-service.js');
  const integrator = new IntegratorService({
    workspaceRoot: '/workspaces',
    autoCheck: false,
  });
  await integrator.init();
  log.debug('Integrator ready');
  return integrator;
}

/**
 * Create Graph Overlay
 */
export async function createGraphFactory(config) {
  const graph = new GraphOverlay({
    basePath: config.dataDir ? `${config.dataDir}/graph` : './data/graph',
  });
  await graph.init();
  log.debug('Graph ready');
  return graph;
}

/**
 * Create Graph Integration
 */
export async function createGraphIntegrationFactory(services) {
  if (!services.graph) return null;

  const graphIntegration = new JudgmentGraphIntegration({
    judge: services.judge,
    graph: services.graph,
    enrichContext: true,
    contextDepth: 2,
  });
  await graphIntegration.init();
  log.debug('GraphIntegration ready');
  return graphIntegration;
}

/**
 * Create Collective Pack (Singleton)
 * "One pack, one truth"
 */
export async function createCollectiveFactory(services, config) {
  const pack = getCollectivePack({
    judge: services.judge,
    profileLevel: 3,
    persistence: services.persistence,
    graphIntegration: services.graphIntegration,
    onDogDecision: config.onDogDecision,
  });

  // Awaken CYNIC for this session
  const awakening = await awakenCynic({
    sessionId: `mcp_${Date.now()}`,
    userId: 'mcp_server',
    project: 'cynic-mcp',
  });

  if (awakening.success) {
    log.info('Collective awakened', { greeting: awakening.greeting });
  } else {
    log.debug('Collective ready (CYNIC dormant)');
  }

  return pack;
}
