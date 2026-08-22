/**
 * runtime-resolver.js - Dynamic Nexora Runtime Path Resolver
 *
 * Discovers and validates the authoritative Nexora engine and bridge runtime paths
 * across Development Mode and Installed Production Mode with strict precedence.
 */

const fs = require('fs');
const path = require('path');

const ERROR_CODES = {
  RUNTIME_NOT_INSTALLED: 'RUNTIME_NOT_INSTALLED',
  RUNTIME_METADATA_INVALID: 'RUNTIME_METADATA_INVALID',
  RUNTIME_BRIDGE_MISSING: 'RUNTIME_BRIDGE_MISSING',
  RUNTIME_ENGINE_MISSING: 'RUNTIME_ENGINE_MISSING'
};

/**
 * Validates whether the given directory contains a functional Nexora engine.
 */
function isValidEngineRoot(engineRoot) {
  if (!engineRoot || typeof engineRoot !== 'string') return false;
  try {
    const appService = path.join(engineRoot, 'Application', 'NexoraApplicationService.ps1');
    return fs.existsSync(appService) && fs.statSync(appService).isFile();
  } catch {
    return false;
  }
}

/**
 * Validates whether the given bridge file path exists.
 */
function isValidBridgeEntry(bridgeEntry) {
  if (!bridgeEntry || typeof bridgeEntry !== 'string') return false;
  try {
    return fs.existsSync(bridgeEntry) && fs.statSync(bridgeEntry).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolves the authoritative Nexora runtime configuration.
 *
 * Precedence:
 * 1. Explicit process.env.NEXORA_INSTALL_PATH environment override
 * 2. install.json authoritative metadata in %LOCALAPPDATA%\NexoraSkillsManager\install.json
 * 3. Default installed runtime in %LOCALAPPDATA%\NexoraSkillsManager\runtime
 * 4. Development repository fallback (only when isPackaged is false)
 * 5. Structured RUNTIME_NOT_INSTALLED failure
 *
 * @param {Object} options
 * @param {Object} [options.env] - Custom environment variables (defaults to process.env)
 * @param {boolean} [options.isPackaged] - Whether the app is running in packaged production mode
 * @param {string} [options.repoRoot] - Optional repository root override for testing
 * @returns {Object} Normalized runtime descriptor
 */
function resolveNexoraRuntime(options = {}) {
  const env = options.env || process.env;
  const isPackaged = typeof options.isPackaged === 'boolean'
    ? options.isPackaged
    : (typeof process.versions.electron !== 'undefined' && process.mainModule && process.mainModule.filename.includes('app.asar'));

  // 1. Explicit Environment Override
  if (env.NEXORA_INSTALL_PATH && typeof env.NEXORA_INSTALL_PATH === 'string') {
    const candidatePath = path.resolve(env.NEXORA_INSTALL_PATH);

    // Check candidate directly as runtime root or install root
    const directEngine = path.join(candidatePath, 'engine');
    const nestedEngine = path.join(candidatePath, 'runtime', 'engine');

    let resolvedRuntimeRoot = candidatePath;
    let resolvedEngineRoot = directEngine;

    if (isValidEngineRoot(directEngine)) {
      resolvedRuntimeRoot = candidatePath;
      resolvedEngineRoot = directEngine;
    } else if (isValidEngineRoot(nestedEngine)) {
      resolvedRuntimeRoot = path.join(candidatePath, 'runtime');
      resolvedEngineRoot = nestedEngine;
    }

    if (isValidEngineRoot(resolvedEngineRoot)) {
      // Look for bridge host script
      let resolvedBridge = path.join(resolvedRuntimeRoot, 'bridge', 'NexoraDesktopBridgeHost.ps1');
      if (!isValidBridgeEntry(resolvedBridge)) {
        resolvedBridge = path.join(candidatePath, 'desktop', 'bridge', 'NexoraDesktopBridgeHost.ps1');
      }

      if (isValidBridgeEntry(resolvedBridge)) {
        const versionFile = path.join(resolvedRuntimeRoot, 'nexora-version.json');
        const skillsRoot = path.join(resolvedRuntimeRoot, 'skills');

        return {
          mode: 'installed',
          runtimeRoot: resolvedRuntimeRoot,
          engineRoot: resolvedEngineRoot,
          bridgeEntry: resolvedBridge,
          versionFile: fs.existsSync(versionFile) ? versionFile : null,
          skillsRoot: fs.existsSync(skillsRoot) ? skillsRoot : null,
          installMetadataPath: null,
          error: null
        };
      }
    }
  }

  // 2. Authoritative install.json Metadata
  const localAppData = env.LOCALAPPDATA || (env.USERPROFILE ? path.join(env.USERPROFILE, 'AppData', 'Local') : null);
  let metadataPath = null;
  if (localAppData) {
    metadataPath = path.join(localAppData, 'NexoraSkillsManager', 'install.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const rawContent = fs.readFileSync(metadataPath, 'utf8');
        const meta = JSON.parse(rawContent);

        if (meta && typeof meta === 'object') {
          const runtimeRoot = meta.runtimeRoot || meta.installPath || null;
          const engineRoot = meta.engineRoot || (runtimeRoot ? path.join(runtimeRoot, 'engine') : null);
          const bridgeEntry = meta.bridgeEntry || (runtimeRoot ? path.join(runtimeRoot, 'bridge', 'NexoraDesktopBridgeHost.ps1') : null);

          if (isValidEngineRoot(engineRoot) && isValidBridgeEntry(bridgeEntry)) {
            const versionFile = path.join(runtimeRoot, 'nexora-version.json');
            const skillsRoot = path.join(runtimeRoot, 'skills');

            return {
              mode: 'installed',
              runtimeRoot: path.resolve(runtimeRoot),
              engineRoot: path.resolve(engineRoot),
              bridgeEntry: path.resolve(bridgeEntry),
              versionFile: fs.existsSync(versionFile) ? path.resolve(versionFile) : null,
              skillsRoot: fs.existsSync(skillsRoot) ? path.resolve(skillsRoot) : null,
              installMetadataPath: metadataPath,
              error: null
            };
          }
        }
      } catch {
        // Corrupted install.json - proceed safely to fallback
      }
    }
  }

  // 3. Default Installed LocalAppData Runtime Path
  if (localAppData) {
    const defaultRuntime = path.join(localAppData, 'NexoraSkillsManager', 'runtime');
    const defaultEngine = path.join(defaultRuntime, 'engine');
    const defaultBridge = path.join(defaultRuntime, 'bridge', 'NexoraDesktopBridgeHost.ps1');

    if (isValidEngineRoot(defaultEngine) && isValidBridgeEntry(defaultBridge)) {
      const versionFile = path.join(defaultRuntime, 'nexora-version.json');
      const skillsRoot = path.join(defaultRuntime, 'skills');

      return {
        mode: 'installed',
        runtimeRoot: path.resolve(defaultRuntime),
        engineRoot: path.resolve(defaultEngine),
        bridgeEntry: path.resolve(defaultBridge),
        versionFile: fs.existsSync(versionFile) ? path.resolve(versionFile) : null,
        skillsRoot: fs.existsSync(skillsRoot) ? path.resolve(skillsRoot) : null,
        installMetadataPath: metadataPath && fs.existsSync(metadataPath) ? metadataPath : null,
        error: null
      };
    }
  }

  // 4. Development Repository Fallback (Disabled in packaged production mode)
  if (!isPackaged) {
    const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
    const devEngine = path.join(repoRoot, 'engine');
    const devBridge = path.join(repoRoot, 'desktop', 'bridge', 'NexoraDesktopBridgeHost.ps1');

    if (isValidEngineRoot(devEngine) && isValidBridgeEntry(devBridge)) {
      const versionFile = path.join(repoRoot, 'nexora-version.json');
      const skillsRoot = repoRoot; // Dev mode has root category folders

      return {
        mode: 'development',
        runtimeRoot: path.resolve(repoRoot),
        engineRoot: path.resolve(devEngine),
        bridgeEntry: path.resolve(devBridge),
        versionFile: fs.existsSync(versionFile) ? path.resolve(versionFile) : null,
        skillsRoot: path.resolve(skillsRoot),
        installMetadataPath: null,
        error: null
      };
    }
  }

  // 5. Structured RUNTIME_NOT_INSTALLED failure
  return {
    mode: null,
    runtimeRoot: null,
    engineRoot: null,
    bridgeEntry: null,
    versionFile: null,
    skillsRoot: null,
    installMetadataPath: null,
    error: {
      code: ERROR_CODES.RUNTIME_NOT_INSTALLED,
      message: 'Authoritative Nexora runtime could not be located on this system. Please run setup.ps1 to install or repair the runtime.'
    }
  };
}

module.exports = {
  resolveNexoraRuntime,
  isValidEngineRoot,
  isValidBridgeEntry,
  ERROR_CODES
};
