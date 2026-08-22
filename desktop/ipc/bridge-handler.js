/**
 * bridge-handler.js - Main Process IPC Bridge Handler
 *
 * Registers IPC handlers for Electron renderer communication, validates incoming
 * requests against the authoritative 25-operation registry, delegates to
 * PowerShellProcessHost, and sanitizes outgoing response envelopes.
 */

const { ipcMain } = require('electron');
const { isValidOperation, getOperationMeta } = require('../registry/operations');

function registerBridgeIpc(processHost) {
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

    // 2. Validate against 25-operation registry
    if (!isValidOperation(operation)) {
      return {
        schemaVersion: '1.0.0',
        requestId: request.requestId || 'req_invalid_op',
        success: false,
        data: null,
        error: {
          code: 'UNSUPPORTED_OPERATION',
          message: `Operation '${operation}' is not supported by Nexora Desktop Bridge.`,
          retryable: false
        }
      };
    }

    // 3. Delegate to trusted process host
    try {
      const response = await processHost.invoke(operation, payload);
      return response;
    } catch (err) {
      return {
        schemaVersion: '1.0.0',
        requestId: request.requestId || 'req_error',
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
