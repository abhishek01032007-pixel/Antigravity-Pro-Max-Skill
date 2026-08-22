/**
 * bridge-handler.js - Main Process IPC Bridge Handler
 *
 * Registers IPC handlers for Electron renderer communication, validates incoming
 * requests against the authoritative 25-operation registry, delegates to
 * PowerShellProcessHost, and sanitizes outgoing response envelopes.
 */

const { ipcMain } = require('electron');
const { isValidOperation, getOperationMeta } = require('../registry/operations');

const { UpdateService } = require('../updates/UpdateService');

function registerBridgeIpc(processHost, customUpdateService = null) {
  const updateService = customUpdateService || new UpdateService();

  ipcMain.handle('nexora:bridge-invoke', async (event, request) => {
    // 1. Structural request validation
    if (!request || typeof request !== 'object') {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_invalid',
        success: false,
        data: null,
        error: {
          code: 'MALFORMED_REQUEST',
          message: 'Request body must be a valid JSON object.',
          retryable: false
        }
      };
    }

    const { operation, payload = {} } = request;
    const reqId = request.requestId || `req_${Date.now()}`;

    // 2. Validate against authoritative registry
    if (!isValidOperation(operation)) {
      return {
        schemaVersion: '1.0.0',
        requestId: reqId,
        success: false,
        data: null,
        error: {
          code: 'UNSUPPORTED_OPERATION',
          message: `Operation '${operation}' is not supported by Nexora Desktop Bridge.`,
          retryable: false
        }
      };
    }

    // 3. Special handling for Node-native remote update checks & downloads
    if (operation === 'updates.check') {
      try {
        const checkRes = await updateService.checkForUpdates(payload);
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: checkRes.success,
          data: checkRes,
          error: checkRes.error || null
        };
      } catch (err) {
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: false,
          data: null,
          error: {
            code: err.code || 'UPDATE_REMOTE_ERROR',
            message: err.message || 'Remote update check failed',
            retryable: true
          }
        };
      }
    }

    if (operation === 'updates.download') {
      try {
        const downloadRes = await updateService.downloadUpdate({
          ...payload,
          onProgress: (p) => {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
              mainWindow.webContents.send('nexora:update-progress', p);
            }
          }
        });
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: downloadRes.success,
          data: downloadRes,
          error: null
        };
      } catch (err) {
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: false,
          data: null,
          error: {
            code: err.code || 'UPDATE_DOWNLOAD_FAILED',
            message: err.message || 'Update download failed',
            retryable: true
          }
        };
      }
    }

    if (operation === 'updates.cancelDownload') {
      try {
        const cancelRes = updateService.cancelDownload();
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: cancelRes.success,
          data: cancelRes,
          error: null
        };
      } catch (err) {
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: false,
          data: null,
          error: {
            code: err.code || 'UPDATE_DOWNLOAD_FAILED',
            message: err.message || 'Failed to cancel update download',
            retryable: false
          }
        };
      }
    }

    if (operation === 'updates.install') {
      try {
        const installRes = await updateService.installUpdate(payload);
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: installRes.success,
          data: installRes,
          error: null
        };
      } catch (err) {
        return {
          schemaVersion: '1.0.0',
          requestId: reqId,
          success: false,
          data: null,
          error: {
            code: err.code || 'UPDATE_INSTALL_FAILED',
            message: err.message || 'Update installation failed',
            retryable: false
          }
        };
      }
    }

    // 4. Delegate to trusted process host
    try {
      const response = await processHost.invoke(operation, payload);
      return response;
    } catch (err) {
      return {
        schemaVersion: '1.0.0',
        requestId: reqId,
        success: false,
        data: null,
        error: {
          code: 'BRIDGE_ERROR',
          message: err.message || 'Internal bridge communication failure',
          retryable: true
        }
      };
    }
  });
}

module.exports = { registerBridgeIpc };
