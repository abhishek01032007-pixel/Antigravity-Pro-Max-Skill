/**
 * UpdateInstallService.js - Update Handoff, Helper Staging & Parent Exit Orchestrator
 *
 * Prepares trusted handoff records, stages helper scripts for self-update safety,
 * spawns detached helper processes, and coordinates parent application shutdown.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

class UpdateInstallService {
  constructor(options = {}) {
    this.runtimeResolver = options.runtimeResolver || null;
    this.stagingBaseDir = options.stagingBaseDir || null;
    this.onShutdownRequest = options.onShutdownRequest || (() => {});
  }

  /**
   * Reads persistent update result from %LOCALAPPDATA%\NexoraSkillsManager\update-state\last-result.json
   */
  getLastUpdateResult(stateRoot = null) {
    try {
      const targetStateRoot = stateRoot || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'NexoraSkillsManager') : null);
      if (!targetStateRoot) return null;

      const resultFile = path.join(targetStateRoot, 'update-state', 'last-result.json');
      if (fs.existsSync(resultFile)) {
        const raw = fs.readFileSync(resultFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  /**
   * Prepares handoff and stages helper files for execution.
   */
  prepareHandoff(activeTransaction, options = {}) {
    if (!activeTransaction || activeTransaction.state !== 'ready_to_install') {
      const err = new Error('Cannot prepare install handoff: No verified update is ready to install.');
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    const stagingDir = activeTransaction.stagingDir;
    if (!stagingDir || !fs.existsSync(stagingDir)) {
      const err = new Error(`Update staging directory missing: ${stagingDir}`);
      err.code = 'UPDATE_ARTIFACT_INVALID';
      throw err;
    }

    // 1. Resolve live paths
    const localAppData = options.env?.LOCALAPPDATA || process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    const installedRuntimeRoot = options.installedRuntimeRoot || path.join(localAppData, 'NexoraSkillsManager', 'runtime');
    const installedStateRoot = options.installedStateRoot || path.join(localAppData, 'NexoraSkillsManager');
    const installedDesktopRoot = options.installedDesktopRoot || path.join(localAppData, 'Programs', 'NexoraSkillsManager');
    const installedBinDir = options.installedBinDir || path.join(localAppData, 'NexoraSkillsManager', 'bin');
    const relaunchExecutable = options.relaunchExecutable || path.join(installedDesktopRoot, 'NexoraSkillsManager.exe');

    // 2. Stage Helper & Installer scripts inside transaction staging
    const helperStagingDir = path.join(stagingDir, 'helper');
    fs.mkdirSync(helperStagingDir, { recursive: true });

    // Locate source helper & installer
    let helperSrc = path.join(installedRuntimeRoot, 'update', 'NexoraUpdateHelper.ps1');
    if (!fs.existsSync(helperSrc)) {
      helperSrc = path.resolve(__dirname, '..', '..', 'engine', 'Update', 'NexoraUpdateHelper.ps1');
    }
    if (!fs.existsSync(helperSrc)) {
      const err = new Error('NexoraUpdateHelper.ps1 could not be located.');
      err.code = 'UPDATE_INSTALL_FAILED';
      throw err;
    }

    let installerSrc = path.join(installedRuntimeRoot, 'engine', 'Install', 'NexoraInstaller.ps1');
    if (!fs.existsSync(installerSrc)) {
      installerSrc = path.resolve(__dirname, '..', '..', 'engine', 'Install', 'NexoraInstaller.ps1');
    }
    if (!fs.existsSync(installerSrc)) {
      const err = new Error('NexoraInstaller.ps1 could not be located.');
      err.code = 'UPDATE_INSTALL_FAILED';
      throw err;
    }

    const stagedHelperPath = path.join(helperStagingDir, 'NexoraUpdateHelper.ps1');
    const stagedInstallerPath = path.join(helperStagingDir, 'NexoraInstaller.ps1');

    fs.copyFileSync(helperSrc, stagedHelperPath);
    fs.copyFileSync(installerSrc, stagedInstallerPath);

    // 3. Create handoff.json
    const manifestPath = path.join(stagingDir, 'manifest.json');
    const desktopDesc = activeTransaction.manifest.desktop;
    const runtimeDesc = activeTransaction.manifest.runtime;

    const handoffData = {
      schemaVersion: 1,
      operationId: activeTransaction.operationId,
      currentVersion: options.currentVersion || '1.0.0',
      version: activeTransaction.manifest.version,
      channel: activeTransaction.manifest.channel,
      createdAt: new Date().toISOString(),
      parentPid: options.parentPid || process.pid,
      manifestPath,
      desktopArtifact: {
        file: desktopDesc.file,
        path: activeTransaction.desktopVerifiedPath || path.join(stagingDir, 'desktop', desktopDesc.file),
        sha256: desktopDesc.sha256,
        size: desktopDesc.size
      },
      runtimeArtifact: {
        file: runtimeDesc.file,
        path: activeTransaction.runtimeVerifiedPath || path.join(stagingDir, 'runtime', runtimeDesc.file),
        sha256: runtimeDesc.sha256,
        size: runtimeDesc.size
      },
      installedRuntimeRoot,
      installedStateRoot,
      installedDesktopRoot,
      installedBinDir,
      relaunchExecutable,
      status: 'pending_helper'
    };

    const handoffPath = path.join(stagingDir, 'handoff.json');
    fs.writeFileSync(handoffPath, JSON.stringify(handoffData, null, 2), 'utf8');

    return {
      handoffPath,
      stagedHelperPath,
      handoffData
    };
  }

  /**
   * Spawns the detached update helper process and requests app shutdown.
   */
  async executeInstallHandoff(activeTransaction, options = {}) {
    const { handoffPath, stagedHelperPath } = this.prepareHandoff(activeTransaction, options);

    // Spawn detached PowerShell helper
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', stagedHelperPath,
      '-Handoff', handoffPath
    ];

    if (options.noRelaunch) {
      args.push('-NoRelaunch');
    }
    if (options.parentWaitTimeoutSec) {
      args.push('-ParentWaitTimeoutSec', String(options.parentWaitTimeoutSec));
    }
    if (options.injectFailureAt) {
      args.push('-InjectFailureAt', options.injectFailureAt);
    }

    let helperChild = null;
    try {
      helperChild = spawn('powershell.exe', args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      helperChild.unref();
    } catch (err) {
      const mapErr = new Error(`Failed to spawn update helper: ${err.message}`);
      mapErr.code = 'UPDATE_INSTALL_FAILED';
      throw mapErr;
    }

    if (!helperChild || !helperChild.pid) {
      const err = new Error('Failed to obtain process handle for update helper.');
      err.code = 'UPDATE_INSTALL_FAILED';
      throw err;
    }

    // Request clean shutdown only after confirmation of helper spawn
    if (!options.skipShutdown) {
      setImmediate(() => {
        try {
          this.onShutdownRequest();
        } catch {}
      });
    }

    return {
      success: true,
      operationId: activeTransaction.operationId,
      status: 'helper_spawned',
      helperPid: helperChild.pid,
      message: 'Update helper launched successfully. Application is restarting...'
    };
  }
}

module.exports = {
  UpdateInstallService
};
