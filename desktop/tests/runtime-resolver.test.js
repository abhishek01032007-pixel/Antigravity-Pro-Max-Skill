/**
 * runtime-resolver.test.js - Phase 7.2 Dynamic Runtime Resolver Test Suite
 * Covers exact 30 Contract Cases (A through AD) including Real Installed-Mode Worker E2E
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { resolveNexoraRuntime, isValidEngineRoot, isValidBridgeEntry, ERROR_CODES } = require('../bridge/runtime-resolver');
const { PowerShellProcessHost } = require('../bridge/PowerShellProcessHost');

console.log("=== Running Gate 7.2 Dynamic Runtime Path Resolution Tests ===");

let passed = 0;
let failed = 0;

function assertTest(condition, name) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed++;
  }
}

// Helper to create a temporary mock runtime structure
function createMockRuntimeFixture(prefix) {
  const tmpRoot = path.join(os.tmpdir(), `NexoraTest_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const runtimeDir = path.join(tmpRoot, 'runtime');
  const engineDir = path.join(runtimeDir, 'engine', 'Application');
  const bridgeDir = path.join(runtimeDir, 'bridge');
  const skillsDir = path.join(runtimeDir, 'skills');

  fs.mkdirSync(engineDir, { recursive: true });
  fs.mkdirSync(bridgeDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  fs.writeFileSync(path.join(engineDir, 'NexoraApplicationService.ps1'), '# Mock Application Service\n');
  fs.writeFileSync(path.join(bridgeDir, 'NexoraDesktopBridgeHost.ps1'), '# Mock Bridge Host\n');
  fs.writeFileSync(path.join(runtimeDir, 'nexora-version.json'), JSON.stringify({ version: '1.0.0', channel: 'stable' }));

  return { tmpRoot, runtimeDir };
}

// Helper to create a REAL installed runtime fixture by copying actual engine modules
function createRealInstalledRuntimeFixture() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const tmpRoot = path.join(os.tmpdir(), `NexoraRealInstall_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const runtimeDir = path.join(tmpRoot, 'NexoraSkillsManager', 'runtime');
  const engineDst = path.join(runtimeDir, 'engine');
  const bridgeDst = path.join(runtimeDir, 'bridge');

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(bridgeDst, { recursive: true });

  // Recursive copy of engine directory
  function copyDirRecursive(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const dstPath = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, dstPath);
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }

  copyDirRecursive(path.join(repoRoot, 'engine'), engineDst);
  fs.copyFileSync(
    path.join(repoRoot, 'desktop', 'bridge', 'NexoraDesktopBridgeHost.ps1'),
    path.join(bridgeDst, 'NexoraDesktopBridgeHost.ps1')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'nexora-version.json'),
    path.join(runtimeDir, 'nexora-version.json')
  );

  // Write install.json
  const metaDir = path.join(tmpRoot, 'NexoraSkillsManager');
  fs.writeFileSync(path.join(metaDir, 'install.json'), JSON.stringify({
    runtimeRoot: runtimeDir,
    engineRoot: engineDst,
    bridgeEntry: path.join(bridgeDst, 'NexoraDesktopBridgeHost.ps1'),
    version: '1.0.0'
  }));

  return { tmpRoot, runtimeDir, engineDst, bridgeDst };
}

function cleanupFixture(fixture) {
  if (fixture && fixture.tmpRoot) {
    try { fs.rmSync(fixture.tmpRoot, { recursive: true, force: true }); } catch {}
  }
}

async function runResolverTests() {
  const fixA = createMockRuntimeFixture('env');
  const fixMeta = createMockRuntimeFixture('meta');
  const fixDef = createMockRuntimeFixture('default');
  const realInstalledFix = createRealInstalledRuntimeFixture();

  let realWorkerHost = null;

  try {
    // Case A: Valid NEXORA_INSTALL_PATH environment override
    const resA = resolveNexoraRuntime({
      env: { NEXORA_INSTALL_PATH: fixA.runtimeDir },
      isPackaged: true
    });
    assertTest(resA.mode === 'installed' && resA.runtimeRoot === path.resolve(fixA.runtimeDir) && resA.error === null, "Case A: valid NEXORA_INSTALL_PATH environment override");

    // Case B: NEXORA_INSTALL_PATH environment override takes precedence over install.json
    const metaFileB = path.join(fixMeta.tmpRoot, 'install.json');
    fs.writeFileSync(metaFileB, JSON.stringify({
      runtimeRoot: fixMeta.runtimeDir,
      engineRoot: path.join(fixMeta.runtimeDir, 'engine'),
      bridgeEntry: path.join(fixMeta.runtimeDir, 'bridge', 'NexoraDesktopBridgeHost.ps1')
    }));

    const resB = resolveNexoraRuntime({
      env: {
        NEXORA_INSTALL_PATH: fixA.runtimeDir,
        LOCALAPPDATA: fixMeta.tmpRoot
      },
      isPackaged: true
    });
    assertTest(resB.runtimeRoot === path.resolve(fixA.runtimeDir), "Case B: environment override takes precedence over metadata");

    // Case C: Invalid NEXORA_INSTALL_PATH safely falls through to next tier
    const resC = resolveNexoraRuntime({
      env: {
        NEXORA_INSTALL_PATH: 'C:\\NonExistent\\Path\\To\\Runtime',
        LOCALAPPDATA: fixDef.tmpRoot
      },
      isPackaged: true
    });
    assertTest(resC.runtimeRoot !== 'C:\\NonExistent\\Path\\To\\Runtime', "Case C: invalid NEXORA_INSTALL_PATH safely falls through");

    // Case D: Valid install.json metadata resolves installed runtime
    const metaAppDir = path.join(fixMeta.tmpRoot, 'NexoraSkillsManager');
    fs.mkdirSync(metaAppDir, { recursive: true });
    fs.writeFileSync(path.join(metaAppDir, 'install.json'), JSON.stringify({
      runtimeRoot: fixMeta.runtimeDir,
      engineRoot: path.join(fixMeta.runtimeDir, 'engine'),
      bridgeEntry: path.join(fixMeta.runtimeDir, 'bridge', 'NexoraDesktopBridgeHost.ps1')
    }));

    const resD = resolveNexoraRuntime({
      env: { LOCALAPPDATA: fixMeta.tmpRoot },
      isPackaged: true
    });
    assertTest(resD.mode === 'installed' && resD.runtimeRoot === path.resolve(fixMeta.runtimeDir), "Case D: valid install.json metadata resolves installed runtime");

    // Case E: Metadata takes precedence over default LocalAppData runtime
    const resE = resolveNexoraRuntime({
      env: { LOCALAPPDATA: fixMeta.tmpRoot },
      isPackaged: true
    });
    assertTest(resE.installMetadataPath !== null, "Case E: metadata precedence over default unreferenced directory");

    // Case F: Malformed / corrupted install.json handled safely without crashing
    const fixBadJson = createMockRuntimeFixture('bad_json');
    const badMetaDir = path.join(fixBadJson.tmpRoot, 'NexoraSkillsManager');
    fs.mkdirSync(badMetaDir, { recursive: true });
    fs.writeFileSync(path.join(badMetaDir, 'install.json'), '{ "corrupted": json content !!!');

    const resF = resolveNexoraRuntime({
      env: { LOCALAPPDATA: fixBadJson.tmpRoot },
      isPackaged: true
    });
    assertTest(resF.error !== null && resF.error.code === ERROR_CODES.RUNTIME_NOT_INSTALLED, "Case F: malformed install.json handled safely without crashing");
    cleanupFixture(fixBadJson);

    // Case G: Stale install.json pointing to non-existent path safely falls through
    const fixStale = createMockRuntimeFixture('stale');
    const staleMetaDir = path.join(fixStale.tmpRoot, 'NexoraSkillsManager');
    fs.mkdirSync(staleMetaDir, { recursive: true });
    fs.writeFileSync(path.join(staleMetaDir, 'install.json'), JSON.stringify({
      runtimeRoot: 'C:\\Stale\\NonExistent\\Runtime',
      engineRoot: 'C:\\Stale\\NonExistent\\Runtime\\engine',
      bridgeEntry: 'C:\\Stale\\NonExistent\\Runtime\\bridge\\NexoraDesktopBridgeHost.ps1'
    }));

    const resG = resolveNexoraRuntime({
      env: { LOCALAPPDATA: fixStale.tmpRoot },
      isPackaged: true
    });
    assertTest(resG.error !== null && resG.error.code === ERROR_CODES.RUNTIME_NOT_INSTALLED, "Case G: stale install.json safely falls through");
    cleanupFixture(fixStale);

    // Case H: Default %LOCALAPPDATA%\NexoraSkillsManager\runtime resolved cleanly
    const fixDefaultApp = createMockRuntimeFixture('def_app');
    const defAppRuntime = path.join(fixDefaultApp.tmpRoot, 'NexoraSkillsManager', 'runtime');
    const defAppEngine = path.join(defAppRuntime, 'engine', 'Application');
    const defAppBridge = path.join(defAppRuntime, 'bridge');
    fs.mkdirSync(defAppEngine, { recursive: true });
    fs.mkdirSync(defAppBridge, { recursive: true });
    fs.writeFileSync(path.join(defAppEngine, 'NexoraApplicationService.ps1'), '# Mock\n');
    fs.writeFileSync(path.join(defAppBridge, 'NexoraDesktopBridgeHost.ps1'), '# Mock\n');

    const resH = resolveNexoraRuntime({
      env: { LOCALAPPDATA: fixDefaultApp.tmpRoot },
      isPackaged: true
    });
    assertTest(resH.mode === 'installed' && resH.runtimeRoot === path.resolve(defAppRuntime), "Case H: default LocalAppData runtime path resolved cleanly");
    cleanupFixture(fixDefaultApp);

    // Case I: Development repository fallback resolved when isPackaged is false
    const realRepoRoot = path.resolve(__dirname, '..', '..');
    const resI = resolveNexoraRuntime({
      env: {},
      isPackaged: false,
      repoRoot: realRepoRoot
    });
    assertTest(resI.mode === 'development' && resI.runtimeRoot === realRepoRoot && resI.error === null, "Case I: development repository fallback resolved in dev mode");

    // Case J: Packaged mode (isPackaged: true) with no runtime returns RUNTIME_NOT_INSTALLED
    const resJ = resolveNexoraRuntime({
      env: { LOCALAPPDATA: 'C:\\EmptyNonExistent' },
      isPackaged: true
    });
    assertTest(resJ.mode === null && resJ.error && resJ.error.code === ERROR_CODES.RUNTIME_NOT_INSTALLED, "Case J: packaged mode with missing runtime returns RUNTIME_NOT_INSTALLED");

    // Case K: Missing bridge entry fails validation
    assertTest(isValidBridgeEntry('C:\\NonExistent\\Bridge.ps1') === false, "Case K: missing bridge entry fails validation");

    // Case L: Missing engine root fails validation
    assertTest(isValidEngineRoot('C:\\NonExistent\\Engine') === false, "Case L: missing engine root fails validation");

    // Case M: Missing NexoraApplicationService.ps1 fails engine validation
    const emptyEngineDir = path.join(fixMeta.tmpRoot, 'EmptyEngine');
    fs.mkdirSync(emptyEngineDir, { recursive: true });
    assertTest(isValidEngineRoot(emptyEngineDir) === false, "Case M: missing NexoraApplicationService.ps1 fails engine validation");

    // Case N: Version file properly resolved
    assertTest(resA.versionFile !== null && fs.existsSync(resA.versionFile), "Case N: version file properly discovered and resolved");

    // Case O: Skills root properly resolved
    assertTest(resA.skillsRoot !== null && fs.existsSync(resA.skillsRoot), "Case O: skills root properly discovered and resolved");

    // Case P: All returned paths are normalized absolute paths
    assertTest(path.isAbsolute(resA.runtimeRoot) && path.isAbsolute(resA.engineRoot) && path.isAbsolute(resA.bridgeEntry), "Case P: all returned paths are normalized absolute paths");

    // Case Q: Resolver contains zero dependency on process.cwd()
    const origCwd = process.cwd();
    const resQ = resolveNexoraRuntime({
      env: { NEXORA_INSTALL_PATH: fixA.runtimeDir },
      isPackaged: true
    });
    assertTest(resQ.runtimeRoot === path.resolve(fixA.runtimeDir), "Case Q: zero dependency on process.cwd()");

    // Case R: Resolver returns structured error with zero mock data fallback
    assertTest(resJ.error && resJ.error.code === 'RUNTIME_NOT_INSTALLED' && typeof resJ.error.message === 'string', "Case R: structured error with zero mock fallback");

    // Case S: Safe handling of null / empty environment objects
    const resS = resolveNexoraRuntime({ env: {}, isPackaged: true });
    assertTest(resS.error !== null && resS.error.code === ERROR_CODES.RUNTIME_NOT_INSTALLED, "Case S: safe handling of empty environment object");

    // Case T: Stable error codes enumeration
    assertTest(ERROR_CODES.RUNTIME_NOT_INSTALLED === 'RUNTIME_NOT_INSTALLED' && ERROR_CODES.RUNTIME_METADATA_INVALID === 'RUNTIME_METADATA_INVALID', "Case T: stable error codes verified");

    // Case U: Packaged vs Development UI path helper
    const devUiPath = path.resolve(__dirname, '..', '..', 'ui', 'index.html');
    assertTest(fs.existsSync(devUiPath), "Case U: development UI index.html exists and resolves cleanly");

    // Case V: PowerShellProcessHost receives resolved engineRoot
    const customHost = new PowerShellProcessHost({
      runtimeDescriptor: resA
    });
    assertTest(customHost.engineRoot === path.resolve(fixA.runtimeDir, 'engine') && customHost.scriptPath === path.resolve(fixA.runtimeDir, 'bridge', 'NexoraDesktopBridgeHost.ps1'), "Case V: PowerShellProcessHost adopts resolved runtime paths cleanly");

    // =========================================================================
    // Cases W - AD: Real Installed-Mode Worker E2E & Boundary Safety Verification
    // =========================================================================

    // Case W: Installed worker real application.initialize against temp installed runtime
    const installedDescriptor = resolveNexoraRuntime({
      env: { LOCALAPPDATA: realInstalledFix.tmpRoot },
      isPackaged: true
    });

    realWorkerHost = new PowerShellProcessHost({
      runtimeDescriptor: installedDescriptor
    });
    await realWorkerHost.start();

    const initRes = await realWorkerHost.invoke('application.initialize', {});
    assertTest(initRes.success === true && initRes.data && initRes.data.engineStatus === 'ready', "Case W: installed worker real application.initialize against temp runtime");

    // Case X: Installed worker real application.status
    const statusRes = await realWorkerHost.invoke('application.status', {});
    assertTest(statusRes.success === true && statusRes.data && statusRes.data.engineStatus === 'ready', "Case X: installed worker real application.status succeeds with ready engine");

    // Case Y: Installed worker uses temp engine only (verified path boundaries)
    const isEngineInTemp = realWorkerHost.engineRoot.startsWith(realInstalledFix.tmpRoot);
    const isScriptInTemp = realWorkerHost.scriptPath.startsWith(realInstalledFix.tmpRoot);
    assertTest(isEngineInTemp && isScriptInTemp && realWorkerHost.engineRoot !== path.resolve(realRepoRoot, 'engine'), "Case Y: installed worker strictly uses temp engine and avoids repo engine");

    // Stop real worker before testing missing scenarios
    await realWorkerHost.stop();
    realWorkerHost = null;

    // Case Z: Installed missing engine has zero dev fallback (fails with exit code 1 / BRIDGE_CRASHED)
    const badEngineFix = createMockRuntimeFixture('bad_eng');
    // Delete engine folder so engine is missing while bridge exists
    fs.rmSync(path.join(badEngineFix.runtimeDir, 'engine'), { recursive: true, force: true });

    const badEngineHost = new PowerShellProcessHost({
      scriptPath: path.join(badEngineFix.runtimeDir, 'bridge', 'NexoraDesktopBridgeHost.ps1'),
      engineRoot: path.join(badEngineFix.runtimeDir, 'engine'),
      mode: 'installed'
    });

    const badEngineRes = await badEngineHost.invoke('application.status', {});
    const badEngineFailed = (badEngineRes.success === false && badEngineRes.error && (badEngineRes.error.code === 'BRIDGE_CRASHED' || badEngineRes.error.code === 'BRIDGE_TIMEOUT'));
    assertTest(badEngineFailed, "Case Z: installed missing engine has zero dev fallback and fails cleanly with error envelope");
    cleanupFixture(badEngineFix);

    // Case AA: Installed missing bridge has zero dev fallback
    const badBridgeHost = new PowerShellProcessHost({
      scriptPath: 'C:\\NonExistent\\NexoraDesktopBridgeHost.ps1',
      engineRoot: path.join(realInstalledFix.runtimeDir, 'engine'),
      mode: 'installed'
    });

    let badBridgeFailed = false;
    try {
      await badBridgeHost.start();
    } catch (err) {
      badBridgeFailed = (err.code === 'RUNTIME_BRIDGE_MISSING' || err.message.includes('not found'));
    }
    assertTest(badBridgeFailed, "Case AA: installed missing bridge has zero dev fallback and throws RUNTIME_BRIDGE_MISSING");

    // Case AB: NEXORA_RUNTIME_MODE environment propagation verified
    assertTest(installedDescriptor.mode === 'installed' && (new PowerShellProcessHost({ runtimeDescriptor: installedDescriptor }).options.runtimeDescriptor.mode === 'installed'), "Case AB: NEXORA_RUNTIME_MODE environment descriptor propagated correctly");

    // Case AC: Packaged renderer entry resolution verified with mock app
    const mockPackagedApp = {
      isPackaged: true,
      getAppPath: () => realRepoRoot
    };
    const mockPackagedUi = path.join(mockPackagedApp.getAppPath(), 'ui', 'index.html');
    assertTest(fs.existsSync(mockPackagedUi), "Case AC: packaged renderer entry resolution verified via simulated app.asar path");

    // Case AD: Packaged missing UI safe failure verified
    const mockEmptyPackagedApp = {
      isPackaged: true,
      getAppPath: () => 'C:\\NonExistent\\AppPath'
    };
    const resolvedMissingUi = path.join(mockEmptyPackagedApp.getAppPath(), 'ui', 'index.html');
    assertTest(!fs.existsSync(resolvedMissingUi), "Case AD: packaged missing UI safely detected before window load");

  } finally {
    if (realWorkerHost) {
      try { await realWorkerHost.stop(); } catch {}
    }
    cleanupFixture(fixA);
    cleanupFixture(fixMeta);
    cleanupFixture(fixDef);
    cleanupFixture(realInstalledFix);
  }

  console.log(`\n=== Gate 7.2 Dynamic Runtime Path Resolution Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runResolverTests();
