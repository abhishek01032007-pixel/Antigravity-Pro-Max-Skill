/**
 * UpdateDownloadService.js - Secure Download, Staging, & Cryptographic Verification Engine
 *
 * Implements streaming download of Desktop and Runtime ZIPs, simultaneous SHA-256 computation,
 * Zip Slip & archive structural validation, progress reporting, cancellation, and cleanup.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  validateDesktopArchiveStructure,
  validateRuntimeArchiveStructure
} = require('./ZipValidator');

const STAGING_PREFIX = 'NexoraSkillsManager-Update-';
const MAX_DESKTOP_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_RUNTIME_SIZE_BYTES = 500 * 1024 * 1024;      // 500 MB

class UpdateDownloadService {
  constructor(options = {}) {
    this.httpClient = options.httpClient;
    this.stagingBaseDir = options.stagingBaseDir || os.tmpdir();
    this.activeTransaction = null;
  }

  /**
   * Generates a secure, cryptographically random operation ID.
   */
  generateOperationId() {
    return `upd_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validates that a path is strictly inside the staging base directory.
   */
  isSafeStagingPath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return false;
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(this.stagingBaseDir);
    return resolvedTarget.startsWith(resolvedBase) && path.basename(resolvedTarget).startsWith(STAGING_PREFIX);
  }

  /**
   * Starts downloading and verifying artifacts for a trusted manifest snapshot.
   */
  async executeDownload(manifestSnapshot, options = {}) {
    if (this.activeTransaction) {
      const err = new Error('An update download operation is already in progress.');
      err.code = 'UPDATE_OPERATION_IN_PROGRESS';
      throw err;
    }

    if (!manifestSnapshot || !manifestSnapshot.version || !manifestSnapshot.desktop || !manifestSnapshot.runtime) {
      const err = new Error('Invalid manifest snapshot provided for update download.');
      err.code = 'UPDATE_MANIFEST_INVALID';
      throw err;
    }

    const operationId = this.generateOperationId();
    const abortController = new AbortController();
    const stagingDir = path.join(this.stagingBaseDir, `${STAGING_PREFIX}${operationId}`);

    const transaction = {
      operationId,
      manifest: JSON.parse(JSON.stringify(manifestSnapshot)), // Immutable deep clone
      stagingDir,
      abortController,
      state: 'downloading',
      desktopVerifiedPath: null,
      runtimeVerifiedPath: null,
      error: null
    };

    this.activeTransaction = transaction;

    try {
      // 1. Create staging directory hierarchy
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(path.join(stagingDir, 'desktop'), { recursive: true });
      fs.mkdirSync(path.join(stagingDir, 'runtime'), { recursive: true });

      // Save frozen manifest snapshot
      fs.writeFileSync(
        path.join(stagingDir, 'manifest.json'),
        JSON.stringify(transaction.manifest, null, 2),
        'utf8'
      );

      const desktopDesc = transaction.manifest.desktop;
      const runtimeDesc = transaction.manifest.runtime;
      const totalOverallBytes = desktopDesc.size + runtimeDesc.size;
      let overallBytesReceived = 0;

      const notifyProgress = (artifactName, artifactReceived, artifactTotal) => {
        if (options.onProgress && typeof options.onProgress === 'function') {
          const currentOverall = (artifactName === 'desktop')
            ? artifactReceived
            : (desktopDesc.size + artifactReceived);

          const artifactPercent = artifactTotal > 0
            ? Math.min(100, Math.round((artifactReceived / artifactTotal) * 1000) / 10)
            : 0;
          const overallPercent = totalOverallBytes > 0
            ? Math.min(100, Math.round((currentOverall / totalOverallBytes) * 1000) / 10)
            : 0;

          options.onProgress({
            operationId,
            phase: 'downloading',
            artifact: artifactName,
            bytesReceived: artifactReceived,
            totalBytes: artifactTotal,
            artifactPercent,
            overallBytesReceived: currentOverall,
            overallBytes: totalOverallBytes,
            overallPercent
          });
        }
      };

      // 2. Step 1: Download Desktop ZIP to *.part
      const desktopPartPath = path.join(stagingDir, 'desktop', `${desktopDesc.file}.part`);
      const desktopFinalPath = path.join(stagingDir, 'desktop', desktopDesc.file);

      const desktopDownloadRes = await this.httpClient.downloadToFile(
        desktopDesc.url,
        desktopPartPath,
        {
          expectedSizeBytes: desktopDesc.size,
          maxSizeBytes: MAX_DESKTOP_SIZE_BYTES,
          signal: abortController.signal,
          onProgress: (p) => notifyProgress('desktop', p.bytesReceived, desktopDesc.size)
        }
      );

      if (abortController.signal.aborted) {
        const err = new Error('Download cancelled by user');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        throw err;
      }

      // Verify Desktop SHA-256
      if (desktopDownloadRes.sha256.toLowerCase() !== desktopDesc.sha256.toLowerCase()) {
        try { fs.unlinkSync(desktopPartPath); } catch {}
        const err = new Error(`Desktop SHA-256 checksum mismatch. Expected: ${desktopDesc.sha256}, got: ${desktopDownloadRes.sha256}`);
        err.code = 'UPDATE_CHECKSUM_MISMATCH';
        throw err;
      }

      if (abortController.signal.aborted) {
        const err = new Error('Download cancelled by user');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        throw err;
      }

      // Promote to final file and inspect archive
      fs.renameSync(desktopPartPath, desktopFinalPath);
      validateDesktopArchiveStructure(desktopFinalPath);
      transaction.desktopVerifiedPath = desktopFinalPath;
      overallBytesReceived += desktopDesc.size;

      if (abortController.signal.aborted) {
        const err = new Error('Download cancelled by user');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        throw err;
      }

      // 3. Step 2: Download Runtime ZIP to *.part
      const runtimePartPath = path.join(stagingDir, 'runtime', `${runtimeDesc.file}.part`);
      const runtimeFinalPath = path.join(stagingDir, 'runtime', runtimeDesc.file);

      const runtimeDownloadRes = await this.httpClient.downloadToFile(
        runtimeDesc.url,
        runtimePartPath,
        {
          expectedSizeBytes: runtimeDesc.size,
          maxSizeBytes: MAX_RUNTIME_SIZE_BYTES,
          signal: abortController.signal,
          onProgress: (p) => notifyProgress('runtime', p.bytesReceived, runtimeDesc.size)
        }
      );

      if (abortController.signal.aborted) {
        const err = new Error('Download cancelled by user');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        throw err;
      }

      // Verify Runtime SHA-256
      if (runtimeDownloadRes.sha256.toLowerCase() !== runtimeDesc.sha256.toLowerCase()) {
        try { fs.unlinkSync(runtimePartPath); } catch {}
        const err = new Error(`Runtime SHA-256 checksum mismatch. Expected: ${runtimeDesc.sha256}, got: ${runtimeDownloadRes.sha256}`);
        err.code = 'UPDATE_CHECKSUM_MISMATCH';
        throw err;
      }

      if (abortController.signal.aborted) {
        const err = new Error('Download cancelled by user');
        err.code = 'UPDATE_DOWNLOAD_CANCELLED';
        throw err;
      }

      // Promote to final file and inspect archive & version
      fs.renameSync(runtimePartPath, runtimeFinalPath);
      validateRuntimeArchiveStructure(runtimeFinalPath, transaction.manifest.version);
      transaction.runtimeVerifiedPath = runtimeFinalPath;

      // 4. Update transaction state to ready_to_install
      transaction.state = 'ready_to_install';

      // Save state.json
      fs.writeFileSync(
        path.join(stagingDir, 'state.json'),
        JSON.stringify({
          operationId,
          version: transaction.manifest.version,
          channel: transaction.manifest.channel,
          verifiedAt: new Date().toISOString(),
          state: 'ready_to_install',
          desktop: { file: desktopDesc.file, size: desktopDesc.size },
          runtime: { file: runtimeDesc.file, size: runtimeDesc.size }
        }, null, 2),
        'utf8'
      );

      return {
        success: true,
        operationId,
        version: transaction.manifest.version,
        channel: transaction.manifest.channel,
        state: 'ready_to_install',
        desktop: {
          file: desktopDesc.file,
          size: desktopDesc.size
        },
        runtime: {
          file: runtimeDesc.file,
          size: runtimeDesc.size
        }
      };
    } catch (err) {
      transaction.state = 'error';
      transaction.error = err;

      // Clean unverified staging on failure
      this.cleanupStaging(stagingDir);
      throw err;
    } finally {
      if (this.activeTransaction === transaction && transaction.state !== 'ready_to_install') {
        this.activeTransaction = null;
      }
    }
  }

  /**
   * Cancels any active in-flight update download.
   */
  cancelActiveDownload() {
    if (!this.activeTransaction) {
      return { success: true, status: 'nothing_to_cancel' };
    }

    if (this.activeTransaction.state === 'ready_to_install') {
      return { success: true, status: 'nothing_to_cancel', message: 'Download has already completed and verified.' };
    }

    const tx = this.activeTransaction;
    tx.abortController.abort();
    tx.state = 'cancelled';
    this.activeTransaction = null;

    // Clean up partial staging
    this.cleanupStaging(tx.stagingDir);

    return {
      success: true,
      operationId: tx.operationId,
      status: 'cancelled',
      message: 'Update download cancelled by user.'
    };
  }

  /**
   * Cleans a specific update staging directory with safety checks.
   */
  cleanupStaging(stagingDir) {
    if (!this.isSafeStagingPath(stagingDir)) {
      return false;
    }

    try {
      if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Scans for and cleans stale update staging folders.
   */
  cleanStaleStagingFolders(maxAgeMs = 86400000) {
    let cleaned = 0;
    try {
      if (!fs.existsSync(this.stagingBaseDir)) return 0;
      const entries = fs.readdirSync(this.stagingBaseDir);

      for (const entry of entries) {
        if (entry.startsWith(STAGING_PREFIX)) {
          const fullPath = path.join(this.stagingBaseDir, entry);
          try {
            const stat = fs.statSync(fullPath);
            const age = Date.now() - stat.mtimeMs;
            if (age > maxAgeMs) {
              fs.rmSync(fullPath, { recursive: true, force: true });
              cleaned++;
            }
          } catch {}
        }
      }
    } catch {}
    return cleaned;
  }
}

module.exports = {
  UpdateDownloadService,
  STAGING_PREFIX,
  MAX_DESKTOP_SIZE_BYTES,
  MAX_RUNTIME_SIZE_BYTES
};
