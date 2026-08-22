/**
 * operations.js - Authoritative 25-Operation Registry for Nexora Desktop Bridge
 *
 * Shared contract consumed by Electron Preload, Main IPC, and Test Suites.
 * Aligned strictly to the frozen Phase 6.2 bridge contract.
 */

const TIMEOUT_CLASSES = {
  FAST_READ: 5000,
  STANDARD_LOCAL: 10000,
  PROJECT_SCAN: 45000,
  SKILL_MUTATION: 30000,
  DOCTOR_REPAIR: 30000
};

const OPERATIONS = {
  // --- Application & System ---
  'application.initialize': {
    id: 'application.initialize',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Initialize application state, check runtime path and load projects'
  },
  'application.status': {
    id: 'application.status',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Retrieve runtime engine status and system metrics'
  },

  // --- Project Registry & Context ---
  'projects.list': {
    id: 'projects.list',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'List all registered projects'
  },
  'projects.validate': {
    id: 'projects.validate',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Validate directory path suitability for project registration (read-only)'
  },
  'projects.add': {
    id: 'projects.add',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Register a project by directory path'
  },
  'projects.remove': {
    id: 'projects.remove',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Unregister a project from the registry'
  },
  'projects.profile': {
    id: 'projects.profile',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get project profile, classification, active skills, and history'
  },
  'projects.analyze': {
    id: 'projects.analyze',
    timeoutClass: 'PROJECT_SCAN',
    timeoutMs: TIMEOUT_CLASSES.PROJECT_SCAN,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Analyze project codebase and update classification facts'
  },

  // --- Working Context ---
  'context.get': {
    id: 'context.get',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get user working mode and target context for a project'
  },
  'context.set': {
    id: 'context.set',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Set user working mode and target context in project.json'
  },

  // --- Recommendations & Skills ---
  'recommendations.get': {
    id: 'recommendations.get',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get skill recommendations with contextual weighting'
  },
  'skills.catalog': {
    id: 'skills.catalog',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get universal skill library catalog'
  },
  'skills.active': {
    id: 'skills.active',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get active skills deployed in a project'
  },
  'skills.activate': {
    id: 'skills.activate',
    timeoutClass: 'SKILL_MUTATION',
    timeoutMs: TIMEOUT_CLASSES.SKILL_MUTATION,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Activate and deploy skills to project platform directories'
  },
  'skills.deactivate': {
    id: 'skills.deactivate',
    timeoutClass: 'SKILL_MUTATION',
    timeoutMs: TIMEOUT_CLASSES.SKILL_MUTATION,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Deactivate and prune a skill from a project'
  },
  'skills.usage': {
    id: 'skills.usage',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Query usage of a skill across all registered projects'
  },
  'skills.globalRemoval.preview': {
    id: 'skills.globalRemoval.preview',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Generate global removal preview with opaque bridge correlation handle'
  },
  'skills.globalRemoval.execute': {
    id: 'skills.globalRemoval.execute',
    timeoutClass: 'SKILL_MUTATION',
    timeoutMs: TIMEOUT_CLASSES.SKILL_MUTATION,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: true,
    description: 'Execute global removal across all projects using opaque bridge handle'
  },

  // --- Platforms & Preferences ---
  'platforms.list': {
    id: 'platforms.list',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get list of supported AI platforms and compatibility'
  },
  'platforms.preferences.get': {
    id: 'platforms.preferences.get',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get configured AI platform target preferences for project'
  },
  'platforms.preferences.set': {
    id: 'platforms.preferences.set',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Set configured AI platform target preferences in project.json'
  },

  // --- Diagnostics & Health ---
  'doctor.run': {
    id: 'doctor.run',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Run 6-category system health diagnostics (read-only)'
  },
  'doctor.repair': {
    id: 'doctor.repair',
    timeoutClass: 'DOCTOR_REPAIR',
    timeoutMs: TIMEOUT_CLASSES.DOCTOR_REPAIR,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Run system health diagnostics and attempt repair'
  },

  // --- Activity & Updates ---
  'activity.list': {
    id: 'activity.list',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Get global or project-specific aggregated activity logs'
  },
  'updates.status': {
    id: 'updates.status',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Retrieve local installation version and update availability'
  },
  'updates.check': {
    id: 'updates.check',
    timeoutClass: 'STANDARD_LOCAL',
    timeoutMs: TIMEOUT_CLASSES.STANDARD_LOCAL,
    isMutating: false,
    tier: 'remote',
    requiresConfirmation: false,
    description: 'Check remote release endpoint for latest product updates'
  },
  'updates.download': {
    id: 'updates.download',
    timeoutClass: 'BACKGROUND_LIFECYCLE',
    timeoutMs: TIMEOUT_CLASSES.BACKGROUND_LIFECYCLE,
    isMutating: false,
    tier: 'remote',
    requiresConfirmation: false,
    description: 'Download and cryptographically verify available update artifacts'
  },
  'updates.cancelDownload': {
    id: 'updates.cancelDownload',
    timeoutClass: 'FAST_READ',
    timeoutMs: TIMEOUT_CLASSES.FAST_READ,
    isMutating: false,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Cancel any active in-flight update artifact download'
  },
  'updates.install': {
    id: 'updates.install',
    timeoutClass: 'BACKGROUND_LIFECYCLE',
    timeoutMs: TIMEOUT_CLASSES.BACKGROUND_LIFECYCLE,
    isMutating: true,
    tier: 'local',
    requiresConfirmation: false,
    description: 'Prepare handoff and launch detached helper to install verified update'
  }
};

const OPERATION_IDS = Object.keys(OPERATIONS);

function isValidOperation(operationId) {
  return typeof operationId === 'string' && Object.prototype.hasOwnProperty.call(OPERATIONS, operationId);
}

function getOperationMeta(operationId) {
  return OPERATIONS[operationId] || null;
}

module.exports = {
  TIMEOUT_CLASSES,
  OPERATIONS,
  OPERATION_IDS,
  isValidOperation,
  getOperationMeta
};
