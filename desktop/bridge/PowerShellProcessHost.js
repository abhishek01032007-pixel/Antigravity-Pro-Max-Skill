/**
 * PowerShellProcessHost.js - Trusted Persistent PowerShell Worker Host
 *
 * Manages the persistent powershell.exe worker process, STDIN/STDOUT single-line
 * JSON streaming, timeout classification, request correlation, crash recovery,
 * and protected in-memory token mapping for destructive operations.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getOperationMeta, isValidOperation, TIMEOUT_CLASSES } = require('../registry/operations');

class PowerShellProcessHost {
  constructor(options = {}) {
    this.options = options;
    this.child = null;
    this.stdoutBuffer = '';
    this.pendingRequests = new Map(); // requestId -> { resolve, reject, timer, operationId }
    this.confirmationTokenStore = new Map(); // operationId -> { skillId, token, expiresAt, projectFingerprint }
    this.isStarting = false;
    this.isStopping = false;
    this.restartCount = 0;
    this.debug = options.debug || false;

    // Fixed trusted script path
    this.scriptPath = path.resolve(__dirname, 'NexoraDesktopBridgeHost.ps1');
  }

  /**
   * Resolve system powershell.exe executable path
   */
  resolvePowerShellPath() {
    const sysRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    const sys32Ps = path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    if (fs.existsSync(sys32Ps)) {
      return sys32Ps;
    }
    return 'powershell.exe';
  }

  /**
   * Start or verify the persistent worker process
   */
  async start() {
    if (this.child && !this.child.killed) {
      return;
    }

    if (this.isStarting) {
      // Wait for existing start sequence
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.child && !this.child.killed) {
            clearInterval(check);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(check);
          reject(new Error('Timed out waiting for worker startup'));
        }, 5000);
      });
    }

    this.isStarting = true;
    const psExecutable = this.resolvePowerShellPath();

    if (!fs.existsSync(this.scriptPath)) {
      this.isStarting = false;
      throw new Error(`Nexora bridge script not found at ${this.scriptPath}`);
    }

    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.scriptPath
    ];

    try {
      this.child = spawn(psExecutable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        env: {
          ...process.env,
          PSExecutionPolicyPreference: 'Bypass'
        }
      });

      this.child.stdout.setEncoding('utf8');
      this.child.stderr.setEncoding('utf8');

      this.child.stdout.on('data', (chunk) => this.handleStdoutData(chunk));
      this.child.stderr.on('data', (chunk) => this.handleStderrData(chunk));

      this.child.on('error', (err) => this.handleProcessError(err));
      this.child.on('close', (code, signal) => this.handleProcessExit(code, signal));

      this.isStarting = false;
    } catch (err) {
      this.isStarting = false;
      throw err;
    }
  }

  /**
   * Handle incoming stdout stream chunks (line-buffered)
   */
  handleStdoutData(chunk) {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    // Keep last incomplete segment in buffer
    this.stdoutBuffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const envelope = JSON.parse(trimmed);
        if (envelope && envelope.requestId) {
          this.resolvePendingRequest(envelope.requestId, envelope);
        }
      } catch (err) {
        if (this.debug) {
          console.warn('[PowerShellProcessHost] Non-JSON line on stdout:', trimmed);
        }
      }
    }
  }

  /**
   * Handle stderr stream
   */
  handleStderrData(chunk) {
    if (this.debug) {
      console.error('[PowerShellProcessHost:STDERR]', chunk);
    }
  }

  /**
   * Handle child process errors
   */
  handleProcessError(err) {
    console.error('[PowerShellProcessHost] Worker process error:', err);
    this.rejectAllPending('BRIDGE_ERROR', err.message || 'PowerShell process encountered an error');
  }

  /**
   * Handle child process exit
   */
  handleProcessExit(code, signal) {
    if (this.debug) {
      console.warn(`[PowerShellProcessHost] Worker process exited with code ${code}, signal ${signal}`);
    }

    this.child = null;

    // Reject all in-flight requests
    this.rejectAllPending('BRIDGE_CRASHED', 'PowerShell worker process exited unexpectedly');

    // Invalidate in-memory confirmation tokens on worker crash / restart
    this.confirmationTokenStore.clear();

    if (!this.isStopping && this.options.autoRestart !== false) {
      this.restartCount++;
      // Worker will restart lazily on next invoke() or explicit start()
    }
  }

  /**
   * Reject all pending requests with error
   */
  rejectAllPending(code, message) {
    for (const [reqId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.resolve({
        schemaVersion: '1.0.0',
        requestId: reqId,
        success: false,
        data: null,
        error: {
          code,
          message,
          retryable: true
        }
      });
    }
    this.pendingRequests.clear();
  }

  /**
   * Resolve an in-flight request by requestId
   */
  resolvePendingRequest(requestId, envelope) {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(requestId);

    // Defensive unwrapping of PowerShell collection wrapper if present
    if (envelope && envelope.data && envelope.data.value && Array.isArray(envelope.data.value) && Object.keys(envelope.data).length === 2 && 'Count' in envelope.data) {
      envelope.data = envelope.data.value;
    }

    // Intercept Global Removal Preview to sanitize confirmationToken
    if (pending.operation === 'skills.globalRemoval.preview' && envelope.success && envelope.data) {
      const rawData = envelope.data;
      const operationId = 'op_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      // Store protected values in process memory only
      this.confirmationTokenStore.set(operationId, {
        skillId: rawData.skillId,
        confirmationToken: rawData.confirmationToken,
        projectFingerprint: rawData.projectFingerprint,
        expiresAt: rawData.expiresAt ? new Date(rawData.expiresAt).getTime() : (Date.now() + 5 * 60 * 1000)
      });

      // Sanitize data envelope returned to renderer
      envelope.data = {
        operationId,
        skillId: rawData.skillId,
        affectedProjectCount: rawData.affectedCount,
        affectedProjects: rawData.affectedProjects || []
      };
    }

    pending.resolve(envelope);
  }

  /**
   * Primary invocation entrypoint
   */
  async invoke(operation, payload = {}) {
    if (!isValidOperation(operation)) {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_invalid',
        success: false,
        data: null,
        error: {
          code: 'INVALID_OPERATION',
          message: `Operation '${operation}' is not recognized in authoritative registry.`,
          retryable: false
        }
      };
    }

    const opMeta = getOperationMeta(operation);
    const timeoutMs = opMeta.timeoutMs || TIMEOUT_CLASSES.STANDARD_LOCAL;

    // Handle Global Removal Execution: resolve opaque operationId -> backend confirmationToken
    if (operation === 'skills.globalRemoval.execute') {
      const opId = payload.operationId;
      if (!opId || !this.confirmationTokenStore.has(opId)) {
        return {
          schemaVersion: '1.0.0',
          requestId: 'req_opid_invalid',
          success: false,
          data: null,
          error: {
            code: 'INVALID_OPERATION_ID',
            message: 'Confirmation token expired, already consumed, or invalid. Please request a fresh preview.',
            retryable: false
          }
        };
      }

      const storedToken = this.confirmationTokenStore.get(opId);
      // Consume single-use token immediately
      this.confirmationTokenStore.delete(opId);

      // Check TTL
      if (Date.now() > storedToken.expiresAt) {
        return {
          schemaVersion: '1.0.0',
          requestId: 'req_opid_expired',
          success: false,
          data: null,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Confirmation token has expired. Please request a fresh preview.',
            retryable: false
          }
        };
      }

      // Re-map payload to include real token for backend
      payload = {
        skillId: storedToken.skillId,
        confirmationToken: storedToken.confirmationToken,
        platforms: payload.platforms || ['antigravity']
      };
    }

    // Ensure worker is running
    await this.start();

    const requestId = 'req_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    const requestEnvelope = {
      schemaVersion: '1.0.0',
      requestId,
      operation,
      payload
    };

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        const isMutating = opMeta ? opMeta.isMutating : false;
        resolve({
          schemaVersion: '1.0.0',
          requestId,
          success: false,
          data: null,
          error: {
            code: isMutating ? 'BRIDGE_TIMEOUT_UNKNOWN_STATE' : 'BRIDGE_TIMEOUT',
            message: isMutating
              ? `Operation '${operation}' timed out after ${timeoutMs}ms. Backend mutation state is UNKNOWN.`
              : `Operation '${operation}' timed out after ${timeoutMs}ms`,
            retryable: !isMutating
          }
        });
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve,
        timer,
        operation
      });

      // Send single line JSON to STDIN
      const jsonLine = JSON.stringify(requestEnvelope) + '\n';
      try {
        this.child.stdin.write(jsonLine, 'utf8');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        resolve({
          schemaVersion: '1.0.0',
          requestId,
          success: false,
          data: null,
          error: {
            code: 'WRITE_ERROR',
            message: `Failed to write to worker STDIN: ${err.message}`,
            retryable: true
          }
        });
      }
    });
  }

  /**
   * Stop the persistent worker process cleanly
   */
  async stop() {
    this.isStopping = true;
    this.confirmationTokenStore.clear();

    if (this.child && !this.child.killed) {
      return new Promise((resolve) => {
        const killTimer = setTimeout(() => {
          if (this.child && !this.child.killed) {
            try { this.child.kill('SIGKILL'); } catch {}
          }
          this.child = null;
          this.isStopping = false;
          resolve();
        }, 1000);

        this.child.once('close', () => {
          clearTimeout(killTimer);
          this.child = null;
          this.isStopping = false;
          resolve();
        });

        try {
          this.child.stdin.end();
          this.child.kill('SIGTERM');
        } catch {
          this.child = null;
          this.isStopping = false;
          resolve();
        }
      });
    }
    this.isStopping = false;
  }
}

module.exports = { PowerShellProcessHost };
