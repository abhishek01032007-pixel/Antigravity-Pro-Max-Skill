/**
 * preload.js - Secure Context-Isolated Bridge Preload Script
 *
 * Exposes strictly 'window.nexoraBridge' to the renderer with a single invoke method.
 * Enforces zero exposure of Node.js globals (fs, child_process, shell, process).
 */

const { contextBridge, ipcRenderer } = require('electron');

const VALID_OPERATIONS = new Set([
  'application.initialize',
  'application.status',
  'projects.list',
  'projects.validate',
  'projects.add',
  'projects.remove',
  'projects.profile',
  'projects.analyze',
  'context.get',
  'context.set',
  'recommendations.get',
  'skills.catalog',
  'skills.active',
  'skills.activate',
  'skills.deactivate',
  'skills.usage',
  'skills.globalRemoval.preview',
  'skills.globalRemoval.execute',
  'platforms.list',
  'platforms.preferences.get',
  'platforms.preferences.set',
  'doctor.run',
  'doctor.repair',
  'activity.list',
  'updates.status',
  'updates.check',
  'updates.download',
  'updates.cancelDownload',
  'updates.install'
]);

function isValidOperation(op) {
  return typeof op === 'string' && VALID_OPERATIONS.has(op);
}

contextBridge.exposeInMainWorld('nexoraBridge', {
  /**
   * Primary bridge invocation method
   * @param {string} operation Operation identifier (e.g. 'projects.list')
   * @param {object} payload Operation parameters
   * @returns {Promise<{schemaVersion: string, requestId: string, success: boolean, data: any, error: any}>}
   */
  invoke: async (operation, payload = {}) => {
    // Client-side validation against authoritative registry
    if (!isValidOperation(operation)) {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_client_invalid',
        success: false,
        data: null,
        error: {
          code: 'CLIENT_INVALID_OPERATION',
          message: `Operation '${operation}' is rejected by preload security policy.`,
          retryable: false
        }
      };
    }

    try {
      return await ipcRenderer.invoke('nexora:bridge-invoke', { operation, payload });
    } catch (err) {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_ipc_failure',
        success: false,
        data: null,
        error: {
          code: 'IPC_DISCONNECTED',
          message: 'Failed to communicate with Nexora Main Process bridge.',
          retryable: true
        }
      };
    }
  },

  /**
   * Controlled update progress subscription.
   * Returns an unsubscribe function.
   * @param {Function} callback Callback receiving sanitized progress events
   * @returns {Function} Unsubscribe function
   */
  onUpdateProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => {
      try {
        callback(data);
      } catch {}
    };
    ipcRenderer.on('nexora:update-progress', listener);
    return () => {
      try {
        ipcRenderer.removeListener('nexora:update-progress', listener);
      } catch {}
    };
  },

  /**
   * Trusted folder picker desktop capability
   * Returns { canceled: boolean, path: string | null }
   */
  selectProjectFolder: async () => {
    try {
      return await ipcRenderer.invoke('nexora:select-project-folder');
    } catch (err) {
      return { canceled: true, path: null };
    }
  }
});
