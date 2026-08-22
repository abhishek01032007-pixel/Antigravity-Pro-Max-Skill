/**
 * UpdateService.js - Node.js Main Process Update Orchestrator
 *
 * Implements authoritative remote update check, version evaluation,
 * concurrency locking, in-memory state tracking, and error normalization.
 */

const fs = require('fs');
const path = require('path');
const SemVer = require('./SemVer');
const { UpdateManifestClient } = require('./UpdateManifestClient');
const { UpdateDownloadService } = require('./UpdateDownloadService');
const { UpdateInstallService } = require('./UpdateInstallService');
const { resolveNexoraRuntime } = require('../bridge/runtime-resolver');

class UpdateService {
  constructor(options = {}) {
    this.options = options;
    this.manifestClient = options.manifestClient || new UpdateManifestClient(options);
    this.downloadService = options.downloadService || new UpdateDownloadService({
      httpClient: this.manifestClient.httpClient,
      stagingBaseDir: options.stagingBaseDir
    });
    this.installService = options.installService || new UpdateInstallService({
      onShutdownRequest: options.onShutdownRequest
    });
    this.runtimeDescriptor = options.runtimeDescriptor || null;
    this.runtimePath = options.runtimePath || null;
    this.customCurrentVersion = options.currentVersion || null;
    this.inFlightCheck = null;
    this.trustedManifestSnapshot = null;

    // In-memory update state
    this.state = {
      currentVersion: options.currentVersion || '1.0.0',
      latestVersion: null,
      updateAvailable: null,
      checkedRemotely: false,
      channel: 'stable',
      status: 'Local installation verified',
      message: 'Local v1.0.0 verified. Remote update checks not performed.',
      checkedAt: null,
      state: 'idle',
      reason: null,
      downloadedVersion: null,
      publishedAt: null,
      releaseNotesUrl: null,
      desktopSize: null,
      runtimeSize: null,
      lastUpdateResult: this.installService.getLastUpdateResult(),
      error: null
    };

    this.resolveInstalledVersion();
  }

  /**
   * Resolves installed version using Phase 7 authoritative runtime resolver.
   */
  resolveInstalledVersion() {
    if (this.customCurrentVersion) {
      this.state.currentVersion = this.customCurrentVersion;
      this.state.message = `Local v${this.customCurrentVersion} verified. Remote update checks not performed.`;
      return this.customCurrentVersion;
    }

    let resolvedVersion = '1.0.0';

    try {
      // 1. If explicit runtimeDescriptor or runtimePath passed
      if (this.runtimeDescriptor && this.runtimeDescriptor.versionFile && fs.existsSync(this.runtimeDescriptor.versionFile)) {
        const raw = fs.readFileSync(this.runtimeDescriptor.versionFile, 'utf8');
        const parsed = JSON.parse(raw);
        resolvedVersion = parsed.version || parsed.coreVersion || '1.0.0';
      } else if (this.runtimePath) {
        const vFile = path.join(this.runtimePath, 'nexora-version.json');
        if (fs.existsSync(vFile)) {
          const raw = fs.readFileSync(vFile, 'utf8');
          const parsed = JSON.parse(raw);
          resolvedVersion = parsed.version || parsed.coreVersion || '1.0.0';
        }
      } else {
        // 2. Delegate to Phase 7 authoritative runtime resolver
        const desc = resolveNexoraRuntime({
          env: this.options.env || process.env,
          isPackaged: typeof this.options.isPackaged === 'boolean' ? this.options.isPackaged : undefined,
          repoRoot: this.options.repoRoot
        });

        if (desc && desc.versionFile && fs.existsSync(desc.versionFile)) {
          const raw = fs.readFileSync(desc.versionFile, 'utf8');
          const parsed = JSON.parse(raw);
          resolvedVersion = parsed.version || parsed.coreVersion || '1.0.0';
        } else if (desc && desc.runtimeRoot) {
          const vFile = path.join(desc.runtimeRoot, 'nexora-version.json');
          if (fs.existsSync(vFile)) {
            const raw = fs.readFileSync(vFile, 'utf8');
            const parsed = JSON.parse(raw);
            resolvedVersion = parsed.version || parsed.coreVersion || '1.0.0';
          }
        }
      }
    } catch {}

    this.state.currentVersion = resolvedVersion;
    this.state.message = `Local v${resolvedVersion} verified. Remote update checks not performed.`;
    return resolvedVersion;
  }

  /**
   * Returns current update status (backward-compatible updates.status).
   */
  getStatus() {
    return {
      currentVersion: this.state.currentVersion,
      latestVersion: this.state.latestVersion,
      updateAvailable: this.state.updateAvailable,
      checkedRemotely: this.state.checkedRemotely,
      channel: this.state.channel,
      status: this.state.status,
      message: this.state.message,
      checkedAt: this.state.checkedAt,
      state: this.state.state,
      reason: this.state.reason,
      publishedAt: this.state.publishedAt,
      releaseNotesUrl: this.state.releaseNotesUrl,
      desktopSize: this.state.desktopSize,
      runtimeSize: this.state.runtimeSize,
      error: this.state.error
    };
  }

  /**
   * Executes remote update check with single-concurrency deduplication.
   */
  async checkForUpdates(requestOptions = {}) {
    // 1. Single concurrency: return active in-flight check if one is already running
    if (this.inFlightCheck) {
      if (requestOptions.rejectConcurrent) {
        const err = new Error('An update check is already in progress.');
        err.code = 'UPDATE_OPERATION_IN_PROGRESS';
        throw err;
      }
      return this.inFlightCheck;
    }

    this.inFlightCheck = this._executeCheck(requestOptions);
    try {
      return await this.inFlightCheck;
    } finally {
      this.inFlightCheck = null;
    }
  }

  async _executeCheck(requestOptions = {}) {
    const installed = this.resolveInstalledVersion();
    const checkedAt = new Date().toISOString();

    try {
      // 1. Fetch and validate remote release manifest
      const manifest = await this.manifestClient.fetchLatestManifest(requestOptions);
      const remoteVersion = manifest.version;

      // 2. Minimum Supported Version check
      if (manifest.minimumSupportedVersion && SemVer.isGreaterThan(manifest.minimumSupportedVersion, installed)) {
        this.state = {
          ...this.state,
          checkedRemotely: true,
          latestVersion: remoteVersion,
          updateAvailable: false,
          state: 'error',
          reason: null,
          status: 'Client update required',
          message: `Direct upgrade from v${installed} is not supported. Minimum supported version is v${manifest.minimumSupportedVersion}.`,
          checkedAt,
          error: {
            code: 'UPDATE_CLIENT_TOO_OLD',
            message: `Installed version v${installed} is below minimum supported version v${manifest.minimumSupportedVersion}.`,
            retryable: false
          }
        };

        return {
          success: false,
          currentVersion: installed,
          latestVersion: remoteVersion,
          updateAvailable: false,
          checkedRemotely: true,
          state: 'error',
          reason: null,
          error: this.state.error
        };
      }

      // 3. SemVer Precedence Comparison
      const cmp = SemVer.compare(remoteVersion, installed);
      const updateAvailable = cmp > 0;
      let stateName = 'up_to_date';
      let reason = null;
      let statusText = 'Nexora is up to date';
      let messageText = `You are running the latest version of Nexora Skills Manager (v${installed}).`;

      if (cmp > 0) {
        stateName = 'update_available';
        statusText = `Update v${remoteVersion} available`;
        messageText = `A new version of Nexora Skills Manager (v${remoteVersion}) is available.`;
      } else if (cmp < 0) {
        stateName = 'up_to_date';
        reason = 'remote_older';
        statusText = 'Nexora is up to date';
        messageText = `Local version (v${installed}) is newer than remote release (v${remoteVersion}). Downgrade is not supported.`;
      }

      if (updateAvailable) {
        this.trustedManifestSnapshot = manifest;
      } else {
        this.trustedManifestSnapshot = null;
      }

      // 4. Update in-memory state
      this.state = {
        ...this.state,
        latestVersion: remoteVersion,
        updateAvailable,
        checkedRemotely: true,
        channel: manifest.channel,
        status: statusText,
        message: messageText,
        checkedAt,
        state: stateName,
        reason,
        publishedAt: manifest.publishedAt,
        releaseNotesUrl: manifest.releaseNotesUrl,
        desktopSize: manifest.desktop.size,
        runtimeSize: manifest.runtime.size,
        error: null
      };

      return {
        success: true,
        currentVersion: installed,
        latestVersion: remoteVersion,
        updateAvailable,
        channel: manifest.channel,
        checkedRemotely: true,
        publishedAt: manifest.publishedAt,
        releaseNotesUrl: manifest.releaseNotesUrl,
        desktopSize: manifest.desktop.size,
        runtimeSize: manifest.runtime.size,
        state: stateName,
        reason,
        checkedAt,
        error: null
      };
    } catch (err) {
      const errorCode = err.code || 'UPDATE_REMOTE_ERROR';
      const errorMessage = err.message || 'Remote update check failed';
      const isOffline = errorCode === 'UPDATE_OFFLINE';
      const stateName = isOffline ? 'offline' : 'error';

      this.state = {
        ...this.state,
        checkedRemotely: false,
        state: stateName,
        status: isOffline ? 'Offline' : 'Update check failed',
        message: isOffline ? 'Unable to connect to update server. Working offline.' : errorMessage,
        checkedAt,
        error: {
          code: errorCode,
          message: errorMessage,
          retryable: errorCode !== 'UPDATE_MANIFEST_UNSUPPORTED'
        }
      };

      return {
        success: false,
        currentVersion: installed,
        latestVersion: null,
        updateAvailable: null,
        checkedRemotely: false,
        state: stateName,
        checkedAt,
        error: this.state.error
      };
    }
  }

  /**
   * Executes downloading of verified update artifacts.
   */
  async downloadUpdate(requestOptions = {}) {
    if (this.inFlightCheck) {
      const err = new Error('An update check is currently in progress.');
      err.code = 'UPDATE_OPERATION_IN_PROGRESS';
      throw err;
    }

    if (!this.trustedManifestSnapshot || !this.state.updateAvailable) {
      const err = new Error('No update is currently available to download. Please check for updates first.');
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    this.state.state = 'downloading';
    this.state.status = 'Downloading update...';

    const onProgressCallback = (progressEvent) => {
      if (this.options.onProgress && typeof this.options.onProgress === 'function') {
        this.options.onProgress(progressEvent);
      }
      if (requestOptions.onProgress && typeof requestOptions.onProgress === 'function') {
        requestOptions.onProgress(progressEvent);
      }
    };

    try {
      const result = await this.downloadService.executeDownload(this.trustedManifestSnapshot, {
        onProgress: onProgressCallback
      });

      this.state = {
        ...this.state,
        state: 'ready_to_install',
        downloadedVersion: result.version,
        status: `Update v${result.version} ready to install`,
        message: `Version ${result.version} has been downloaded and verified.`,
        error: null
      };

      return {
        success: true,
        operationId: result.operationId,
        version: result.version,
        channel: result.channel,
        state: 'ready_to_install',
        desktop: result.desktop,
        runtime: result.runtime
      };
    } catch (err) {
      if (err.code === 'UPDATE_DOWNLOAD_CANCELLED') {
        this.state.state = this.state.updateAvailable ? 'update_available' : 'idle';
        this.state.status = this.state.updateAvailable ? `Update v${this.state.latestVersion} available` : 'Idle';
      } else {
        this.state.state = 'error';
        this.state.error = {
          code: err.code || 'UPDATE_DOWNLOAD_FAILED',
          message: err.message || 'Update download failed',
          retryable: true
        };
      }
      throw err;
    }
  }

  /**
   * Cancels any active in-flight update download.
   */
  cancelDownload() {
    const cancelRes = this.downloadService.cancelActiveDownload();
    if (cancelRes.status === 'cancelled') {
      if (this.state.updateAvailable) {
        this.state.state = 'update_available';
        this.state.status = `Update v${this.state.latestVersion} available`;
      } else {
        this.state.state = 'idle';
      }
    }
    return cancelRes;
  }

  /**
   * Prepares handoff and launches detached helper to install verified update.
   */
  async installUpdate(requestOptions = {}) {
    if (this.inFlightCheck) {
      const err = new Error('An update check is currently in progress.');
      err.code = 'UPDATE_OPERATION_IN_PROGRESS';
      throw err;
    }

    if (!this.downloadService.activeTransaction || this.downloadService.activeTransaction.state !== 'ready_to_install') {
      const err = new Error('No verified update is ready to install. Please download the update first.');
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    this.state.state = 'installing';
    this.state.status = 'Installing update...';

    try {
      const result = await this.installService.executeInstallHandoff(
        this.downloadService.activeTransaction,
        {
          currentVersion: this.state.currentVersion,
          installedRuntimeRoot: this.runtimePath,
          env: this.options.env,
          ...requestOptions
        }
      );

      return {
        success: true,
        operationId: result.operationId,
        status: result.status,
        state: 'installing',
        message: result.message
      };
    } catch (err) {
      this.state.state = 'error';
      this.state.error = {
        code: err.code || 'UPDATE_INSTALL_FAILED',
        message: err.message || 'Update installation failed',
        retryable: false
      };
      throw err;
    }
  }
}

module.exports = {
  UpdateService
};
