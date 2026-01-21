#!/usr/bin/env node
/**
 * CYNIC Awaken Hook - SessionStart
 *
 * "Le chien s'éveille" - CYNIC awakens with the session
 *
 * This hook runs at the start of every Claude session.
 * It establishes CYNIC's presence from the very first moment.
 *
 * @event SessionStart
 * @behavior non-blocking (injects message)
 */

'use strict';

const path = require('path');

// Load core library
const libPath = path.join(__dirname, '..', 'lib', 'cynic-core.cjs');
const cynic = require(libPath);

/**
 * Main handler for SessionStart
 */
async function main() {
  try {
    // Detect user identity
    const user = cynic.detectUser();

    // Load local profile first
    let localProfile = cynic.loadUserProfile(user.userId);

    // ═══════════════════════════════════════════════════════════════════════════
    // CROSS-SESSION MEMORY: Load profile from PostgreSQL
    // ═══════════════════════════════════════════════════════════════════════════
    let remoteProfile = null;
    let learningsImport = null;

    try {
      remoteProfile = await cynic.loadProfileFromDB(user.userId);
      if (remoteProfile) {
        // Merge remote (accumulated) with local (current session)
        localProfile = cynic.mergeProfiles(remoteProfile, localProfile);
        learningsImport = {
          success: true,
          imported: remoteProfile.meta?.sessionCount || 0,
          stats: {
            accuracy: remoteProfile.learning?.feedbackAccuracy
              ? Math.round(remoteProfile.learning.feedbackAccuracy * 100)
              : null
          }
        };
      }
    } catch (e) {
      // Silently fail - local profile is fallback
    }

    // Update profile with current identity info and increment session
    let profile = cynic.updateUserProfile(localProfile, {
      identity: {
        name: user.name,
        email: user.email
      },
      stats: {
        sessions: (localProfile.stats?.sessions || 0) + 1
      }
    });

    // Detect ecosystem (all projects in workspace)
    const ecosystem = cynic.detectEcosystem();

    // Update profile with current project
    if (ecosystem.currentProject) {
      const recentProjects = profile.memory?.recentProjects || [];
      const projectName = ecosystem.currentProject.name;

      // Add to recent if not already first
      if (recentProjects[0] !== projectName) {
        profile = cynic.updateUserProfile(profile, {
          memory: {
            recentProjects: [projectName, ...recentProjects.filter(p => p !== projectName)].slice(0, 10)
          }
        });
      }
    }

    // Format the awakening message (with learnings import info if available)
    const message = cynic.formatEcosystemStatus(ecosystem, profile, learningsImport);

    // Start brain session first (async but we don't wait)
    cynic.startBrainSession(user.userId, {
      project: ecosystem.currentProject?.name,
      metadata: {
        userName: user.name,
        sessionCount: profile.stats?.sessions || 1,
        ecosystem: ecosystem.projects?.map(p => p.name) || [],
      }
    }).then(result => {
      if (result.sessionId) {
        // Store session ID in environment for other hooks
        process.env.CYNIC_SESSION_ID = result.sessionId;
      }
    }).catch(() => {
      // Silently ignore - local mode still works
    });

    // Also send to MCP collective for event distribution
    cynic.sendHookToCollectiveSync('SessionStart', {
      userId: user.userId,
      userName: user.name,
      sessionCount: profile.stats?.sessions || 1,
      project: ecosystem.currentProject?.name,
      ecosystem: ecosystem.projects?.map(p => p.name) || [],
      timestamp: Date.now(),
    });

    // Output directly to stdout (like asdf-brain) for banner display
    console.log(message);

  } catch (error) {
    // Minimal output on error
    console.log('🧠 CYNIC awakening... *yawn*');
  }
}

main();
