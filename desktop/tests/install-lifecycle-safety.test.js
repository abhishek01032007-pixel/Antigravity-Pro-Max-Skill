/**
 * install-lifecycle-safety.test.js - Phase 7.5 Lifecycle Safety Test Suite
 * Covers 46 Contract Cases (A through AT) validating:
 *   - Transactional install with backup/rollback
 *   - Upgrade with version markers
 *   - Injected failure rollback verification
 *   - Same-version repair
 *   - Safe uninstall with ownership-only removal
 *   - User-state preservation (projects.json, custom skills, logs)
 *   - Apps & Features registry abstraction (fail-closed)
 *   - Process-in-use detection
 *   - Downgrade blocking
 *   - Fresh install failure cleanup
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

console.log("=== Running Gate 7.5 Install Lifecycle Safety Tests ===");

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

function readJsonClean(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function runPS(scriptContent) {
  return spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-Command', scriptContent
  ], { encoding: 'utf8', timeout: 60000 });
}

function createTestEnv(suffix = '') {
  const tmpRoot = path.join(os.tmpdir(), `NexoraLifecycle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${suffix}`);
  const stateRoot = path.join(tmpRoot, 'NexoraSkillsManager');
  const installRoot = path.join(stateRoot, 'runtime');
  const desktopRoot = path.join(tmpRoot, 'Programs', 'NexoraSkillsManager');
  const binDir = path.join(stateRoot, 'bin');
  const shortcutDir = path.join(tmpRoot, 'StartMenu');
  const registryRoot = path.join(tmpRoot, 'TestRegistry');
  fs.mkdirSync(tmpRoot, { recursive: true });
  return { tmpRoot, stateRoot, installRoot, desktopRoot, binDir, shortcutDir, registryRoot };
}

function cleanup(env) {
  if (env && env.tmpRoot) {
    try { fs.rmSync(env.tmpRoot, { recursive: true, force: true }); } catch {}
  }
}

function esc(s) { return s.replace(/'/g, "''"); }

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');
const installerScript = path.join(repoRoot, 'engine', 'Install', 'NexoraInstaller.ps1');
const winUnpackedDir = path.join(desktopRoot, 'dist', 'win-unpacked');

function buildInstallCmd(env, extraParams = '') {
  return `
    . '${esc(installerScript)}'
    $res = Install-NexoraUnified -InstallRoot '${esc(env.installRoot)}' \`
        -StateRoot '${esc(env.stateRoot)}' \`
        -DesktopRoot '${esc(env.desktopRoot)}' \`
        -BinDir '${esc(env.binDir)}' \`
        -SourceDir '${esc(repoRoot)}' \`
        -DesktopSourceDir '${esc(winUnpackedDir)}' \`
        -SkipPathRegistration \`
        -SkipShortcut \`
        -SkipAppsAndFeatures ${extraParams}
    $res | ConvertTo-Json -Depth 5
  `;
}

function writeVersionMarker(dir, version) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'runtime-build-marker.txt'), version, 'utf8');
}

function readVersionMarker(dir) {
  const f = path.join(dir, 'runtime-build-marker.txt');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null;
}

// Helper: create a v1.0.1-test fixture by cloning repo source + injecting markers
function createUpgradeFixture(env) {
  const fixDir = path.join(env.tmpRoot, 'upgrade-source');
  const srcVer = path.join(repoRoot, 'nexora-version.json');
  fs.mkdirSync(fixDir, { recursive: true });
  // Create nexora-version.json for 1.0.1-test
  const verObj = readJsonClean(srcVer);
  verObj.version = '1.0.1-test';
  verObj.coreVersion = '1.0.1-test';
  verObj.skillPackVersion = '1.0.1-test';
  fs.writeFileSync(path.join(fixDir, 'nexora-version.json'), JSON.stringify(verObj, null, 2));
  // Copy engine
  cpRecursive(path.join(repoRoot, 'engine'), path.join(fixDir, 'engine'));
  // Copy bridge
  const bridgeSrc = path.join(repoRoot, 'desktop', 'bridge', 'NexoraDesktopBridgeHost.ps1');
  const bridgeDir = path.join(fixDir, 'desktop', 'bridge');
  fs.mkdirSync(bridgeDir, { recursive: true });
  if (fs.existsSync(bridgeSrc)) fs.copyFileSync(bridgeSrc, path.join(bridgeDir, 'NexoraDesktopBridgeHost.ps1'));
  // Copy skill packs
  for (const pack of ['Frontend-Pro-Max', 'Backend-Pro-Max', 'Backend-Frameworks', 'QA-Debug-Pro-Max', 'Fullstack-Extras', 'Loaders']) {
    const sp = path.join(repoRoot, pack);
    if (fs.existsSync(sp)) cpRecursive(sp, path.join(fixDir, pack));
  }
  // Copy batch files
  for (const f of ['Start-Nexora-Skills-Manager.bat', 'Start-Antigravity-Pro-Max.bat']) {
    const s = path.join(repoRoot, f);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(fixDir, f));
  }
  // Copy uninstall.ps1
  const uninstSrc = path.join(repoRoot, 'uninstall.ps1');
  if (fs.existsSync(uninstSrc)) fs.copyFileSync(uninstSrc, path.join(fixDir, 'uninstall.ps1'));
  return fixDir;
}

function cpRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) { cpRecursive(s, d); }
    else { fs.copyFileSync(s, d); }
  }
}

async function runLifecycleTests() {
  // ============================================================
  // SECTION 1: TRANSACTIONAL FRESH INSTALL
  // ============================================================
  console.log("\n--- Section 1: Transactional Fresh Install ---");
  const env1 = createTestEnv('_fresh');
  try {
    const res = runPS(buildInstallCmd(env1));
    const obj = res.status === 0 ? JSON.parse(res.stdout) : null;

    // Case A: Fresh install succeeds
    assertTest(obj && obj.success === true, "Case A: fresh install completes successfully");

    // Case B: Transaction reports operationType=install
    assertTest(obj && obj.operationType === 'install', "Case B: operationType is 'install' for fresh install");

    // Case C: install.json contains desktopRoot and binDir
    const meta = readJsonClean(path.join(env1.stateRoot, 'install.json'));
    assertTest(meta.desktopRoot && meta.binDir && meta.runtimeRoot, "Case C: install.json contains desktopRoot, binDir, runtimeRoot");

    // Case D: install.json contains uninstallScript path
    assertTest(meta.uninstallScript && meta.uninstallScript.includes('install'), "Case D: install.json contains uninstallScript path");

    // Case E: Installed uninstall.ps1 exists at runtime/install/
    const installedUninstall = path.join(env1.installRoot, 'install', 'uninstall.ps1');
    assertTest(fs.existsSync(installedUninstall), "Case E: uninstall.ps1 copied to runtime/install/");

    // Case F: Version comparison function works
    const cmpRes = runPS(`
      . '${esc(installerScript)}'
      $r1 = Compare-NexoraVersions -Installed '1.0.0' -Incoming '1.0.1'
      $r2 = Compare-NexoraVersions -Installed '1.0.1' -Incoming '1.0.0'
      $r3 = Compare-NexoraVersions -Installed '1.0.0' -Incoming '1.0.0'
      "$r1|$r2|$r3"
    `);
    const parts = cmpRes.stdout.trim().split('|');
    assertTest(parts[0] === 'UPGRADE' && parts[1] === 'DOWNGRADE' && parts[2] === 'SAME', "Case F: Compare-NexoraVersions returns UPGRADE/DOWNGRADE/SAME correctly");

  } finally { cleanup(env1); }

  // ============================================================
  // SECTION 2: UPGRADE WITH VERSION MARKERS
  // ============================================================
  console.log("\n--- Section 2: Upgrade with Version Markers ---");
  const env2 = createTestEnv('_upgrade');
  try {
    // Base install v1.0.0
    const baseRes = runPS(buildInstallCmd(env2));
    assertTest(baseRes.status === 0, "Case G: base v1.0.0 install succeeds");

    // Write v1.0.0 markers
    writeVersionMarker(env2.installRoot, '1.0.0');
    const desktopMarkerDir = env2.desktopRoot;
    fs.writeFileSync(path.join(desktopMarkerDir, 'desktop-build-marker.txt'), '1.0.0', 'utf8');

    // Create v1.0.1-test fixture
    const upgradeSource = createUpgradeFixture(env2);

    // Upgrade
    const upgCmd = `
      . '${esc(installerScript)}'
      $res = Install-NexoraUnified -InstallRoot '${esc(env2.installRoot)}' \`
          -StateRoot '${esc(env2.stateRoot)}' \`
          -DesktopRoot '${esc(env2.desktopRoot)}' \`
          -BinDir '${esc(env2.binDir)}' \`
          -SourceDir '${esc(upgradeSource)}' \`
          -DesktopSourceDir '${esc(winUnpackedDir)}' \`
          -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `;
    const upgRes = runPS(upgCmd);
    const upgObj = upgRes.status === 0 ? JSON.parse(upgRes.stdout) : null;

    // Case H: Upgrade detected
    assertTest(upgObj && upgObj.operationType === 'upgrade', "Case H: operationType is 'upgrade' when version increases");

    // Case I: Upgraded version in install.json
    const upgMeta = readJsonClean(path.join(env2.stateRoot, 'install.json'));
    assertTest(upgMeta.version === '1.0.1-test', "Case I: install.json version updated to 1.0.1-test");

    // Case J: Previous version reported
    assertTest(upgObj && upgObj.previousVersion === '1.0.0', "Case J: previousVersion is 1.0.0");

    // Case K: Runtime marker was replaced (staging replaced old markers)
    const verFile = path.join(env2.installRoot, 'nexora-version.json');
    if (fs.existsSync(verFile)) {
      const vj = readJsonClean(verFile);
      assertTest(vj.version === '1.0.1-test' && vj.coreVersion === '1.0.1-test', "Case K: nexora-version.json updated to 1.0.1-test");
    } else {
      assertTest(false, "Case K: nexora-version.json updated to 1.0.1-test");
    }

  } finally { cleanup(env2); }

  // ============================================================
  // SECTION 3: DOWNGRADE BLOCKING
  // ============================================================
  console.log("\n--- Section 3: Downgrade Blocking ---");
  const env3 = createTestEnv('_downgrade');
  try {
    // Install v1.0.1-test first via upgrade fixture
    const upgradeSource3 = createUpgradeFixture(env3);
    const installCmd3 = `
      . '${esc(installerScript)}'
      $res = Install-NexoraUnified -InstallRoot '${esc(env3.installRoot)}' \`
          -StateRoot '${esc(env3.stateRoot)}' \`
          -DesktopRoot '${esc(env3.desktopRoot)}' \`
          -BinDir '${esc(env3.binDir)}' \`
          -SourceDir '${esc(upgradeSource3)}' \`
          -DesktopSourceDir '${esc(winUnpackedDir)}' \`
          -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `;
    runPS(installCmd3);

    // Now try downgrade back to v1.0.0 (should fail)
    const downgradeCmd = buildInstallCmd(env3);
    const dgRes = runPS(downgradeCmd);

    // Case L: Downgrade blocked with DOWNGRADE_NOT_ALLOWED
    assertTest(dgRes.status !== 0 && dgRes.stderr.includes('DOWNGRADE_NOT_ALLOWED'), "Case L: downgrade blocked with DOWNGRADE_NOT_ALLOWED error code");

    // Case M: Original installation preserved after blocked downgrade
    const origMeta = readJsonClean(path.join(env3.stateRoot, 'install.json'));
    assertTest(origMeta.version === '1.0.1-test', "Case M: original v1.0.1-test install.json preserved after blocked downgrade");

  } finally { cleanup(env3); }

  // ============================================================
  // SECTION 4: INJECTED FAILURE ROLLBACK
  // ============================================================
  console.log("\n--- Section 4: Injected Failure Rollback ---");
  const env4 = createTestEnv('_rollback');
  try {
    // Base install v1.0.0
    runPS(buildInstallCmd(env4));
    writeVersionMarker(env4.installRoot, '1.0.0');
    fs.writeFileSync(path.join(env4.desktopRoot, 'desktop-build-marker.txt'), '1.0.0', 'utf8');

    // Seed user state
    fs.writeFileSync(path.join(env4.stateRoot, 'projects.json'), '{"projects":[]}', 'utf8');
    fs.mkdirSync(path.join(env4.stateRoot, 'skills', 'my-custom-skill'), { recursive: true });
    fs.writeFileSync(path.join(env4.stateRoot, 'skills', 'my-custom-skill', 'skill.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(env4.stateRoot, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(env4.stateRoot, 'logs', 'test.log'), 'log content', 'utf8');

    const origInstallJson = fs.readFileSync(path.join(env4.stateRoot, 'install.json'), 'utf8');

    // Create v1.0.1 upgrade fixture
    const upgradeSource4 = createUpgradeFixture(env4);

    // Inject failure after_runtime (partial replacement)
    const failCmd = `
      . '${esc(installerScript)}'
      try {
        Install-NexoraUnified -InstallRoot '${esc(env4.installRoot)}' \`
            -StateRoot '${esc(env4.stateRoot)}' \`
            -DesktopRoot '${esc(env4.desktopRoot)}' \`
            -BinDir '${esc(env4.binDir)}' \`
            -SourceDir '${esc(upgradeSource4)}' \`
            -DesktopSourceDir '${esc(winUnpackedDir)}' \`
            -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures \`
            -InjectFailureAt 'after_runtime'
        Write-Output "UNEXPECTED_SUCCESS"
      } catch {
        Write-Output "EXPECTED_FAILURE: $($_.Exception.Message)"
      }
    `;
    const failRes = runPS(failCmd);

    // Case N: Injected failure triggers rollback
    assertTest(failRes.stdout.includes('EXPECTED_FAILURE') && failRes.stdout.includes('INSTALL_REPLACEMENT_FAILED'), "Case N: injected failure triggers INSTALL_REPLACEMENT_FAILED");

    // Case O: install.json restored to v1.0.0 after rollback
    const rolledBackMeta = readJsonClean(path.join(env4.stateRoot, 'install.json'));
    assertTest(rolledBackMeta.version === '1.0.0', "Case O: install.json version restored to 1.0.0 after rollback");

    // Case P: projects.json unchanged after rollback
    const pj = fs.readFileSync(path.join(env4.stateRoot, 'projects.json'), 'utf8');
    assertTest(pj === '{"projects":[]}', "Case P: projects.json unchanged after rollback");

    // Case Q: custom skills unchanged after rollback
    assertTest(fs.existsSync(path.join(env4.stateRoot, 'skills', 'my-custom-skill', 'skill.json')), "Case Q: custom skills unchanged after rollback");

    // Case R: logs unchanged after rollback
    assertTest(fs.existsSync(path.join(env4.stateRoot, 'logs', 'test.log')), "Case R: logs unchanged after rollback");

    // Case S: runtime files restored (engine exists)
    assertTest(fs.existsSync(path.join(env4.installRoot, 'engine', 'Application', 'NexoraApplicationService.ps1')), "Case S: runtime engine restored after rollback");

    // Case T: Desktop files restored (exe exists)
    assertTest(fs.existsSync(path.join(env4.desktopRoot, 'NexoraSkillsManager.exe')), "Case T: Desktop exe restored after rollback");

  } finally { cleanup(env4); }

  // ============================================================
  // SECTION 5: SAME-VERSION REPAIR
  // ============================================================
  console.log("\n--- Section 5: Same-Version Repair ---");
  const env5 = createTestEnv('_repair');
  try {
    // Base install
    runPS(buildInstallCmd(env5));

    // Corrupt runtime by deleting bridge
    const bridgePath = path.join(env5.installRoot, 'bridge', 'NexoraDesktopBridgeHost.ps1');
    if (fs.existsSync(bridgePath)) fs.unlinkSync(bridgePath);

    // Seed user state
    fs.writeFileSync(path.join(env5.stateRoot, 'projects.json'), '{"projects":["p1"]}', 'utf8');

    // Repair
    const repairCmd = `
      . '${esc(installerScript)}'
      $res = Repair-NexoraUnified -InstallRoot '${esc(env5.installRoot)}' \`
          -StateRoot '${esc(env5.stateRoot)}' \`
          -DesktopRoot '${esc(env5.desktopRoot)}' \`
          -BinDir '${esc(env5.binDir)}' \`
          -SourceDir '${esc(repoRoot)}' \`
          -DesktopSourceDir '${esc(winUnpackedDir)}' \`
          -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `;
    const repRes = runPS(repairCmd);
    const repObj = repRes.status === 0 ? JSON.parse(repRes.stdout) : null;

    // Case U: Repair succeeds
    assertTest(repObj && repObj.success === true, "Case U: repair completes successfully");

    // Case V: Repair reports operationType=repair
    assertTest(repObj && repObj.operationType === 'repair', "Case V: operationType is 'repair'");

    // Case W: Bridge restored
    assertTest(fs.existsSync(bridgePath), "Case W: bridge file restored after repair");

    // Case X: projects.json preserved after repair
    const repPj = JSON.parse(fs.readFileSync(path.join(env5.stateRoot, 'projects.json'), 'utf8'));
    assertTest(repPj.projects && repPj.projects[0] === 'p1', "Case X: projects.json preserved during repair");

  } finally { cleanup(env5); }

  // ============================================================
  // SECTION 6: SAFE UNINSTALL
  // ============================================================
  console.log("\n--- Section 6: Safe Uninstall ---");
  const env6 = createTestEnv('_uninstall');
  try {
    // Base install
    runPS(buildInstallCmd(env6));

    // Seed user state
    fs.writeFileSync(path.join(env6.stateRoot, 'projects.json'), '{"projects":["proj-A"]}', 'utf8');
    fs.mkdirSync(path.join(env6.stateRoot, 'skills', 'user-skill'), { recursive: true });
    fs.writeFileSync(path.join(env6.stateRoot, 'skills', 'user-skill', 'config.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(env6.stateRoot, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(env6.stateRoot, 'logs', 'session.log'), 'session data', 'utf8');

    // Uninstall (default - no RemoveUserData)
    const uninstCmd = `
      . '${esc(installerScript)}'
      $res = Uninstall-NexoraUnified -StateRoot '${esc(env6.stateRoot)}' \`
          -SkipPathRemoval -SkipShortcutRemoval -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `;
    const uninstRes = runPS(uninstCmd);
    const uninstObj = uninstRes.status === 0 ? JSON.parse(uninstRes.stdout) : null;

    // Case Y: Uninstall succeeds
    assertTest(uninstObj && uninstObj.success === true, "Case Y: uninstall completes successfully");

    // Case Z: Runtime removed
    assertTest(!fs.existsSync(env6.installRoot), "Case Z: runtime directory removed");

    // Case AA: Desktop removed
    assertTest(!fs.existsSync(env6.desktopRoot), "Case AA: Desktop directory removed");

    // Case AB: bin removed
    assertTest(!fs.existsSync(env6.binDir), "Case AB: bin directory removed");

    // Case AC: install.json removed
    assertTest(!fs.existsSync(path.join(env6.stateRoot, 'install.json')), "Case AC: install.json removed");

    // Case AD: projects.json preserved
    assertTest(fs.existsSync(path.join(env6.stateRoot, 'projects.json')), "Case AD: projects.json preserved after default uninstall");

    // Case AE: custom skills preserved
    assertTest(fs.existsSync(path.join(env6.stateRoot, 'skills', 'user-skill', 'config.json')), "Case AE: custom skills preserved after default uninstall");

    // Case AF: logs preserved
    assertTest(fs.existsSync(path.join(env6.stateRoot, 'logs', 'session.log')), "Case AF: logs preserved after default uninstall");

  } finally { cleanup(env6); }

  // ============================================================
  // SECTION 7: UNINSTALL WITH -RemoveUserData
  // ============================================================
  console.log("\n--- Section 7: Uninstall with RemoveUserData ---");
  const env7 = createTestEnv('_rmdata');
  try {
    // Base install
    runPS(buildInstallCmd(env7));

    // Seed user state
    fs.writeFileSync(path.join(env7.stateRoot, 'projects.json'), '{"projects":["safe"]}', 'utf8');
    fs.mkdirSync(path.join(env7.stateRoot, 'skills', 'custom'), { recursive: true });
    fs.writeFileSync(path.join(env7.stateRoot, 'skills', 'custom', 'x.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(env7.stateRoot, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(env7.stateRoot, 'logs', 'app.log'), 'data', 'utf8');

    // Uninstall with RemoveUserData
    const rmCmd = `
      . '${esc(installerScript)}'
      $res = Uninstall-NexoraUnified -StateRoot '${esc(env7.stateRoot)}' \`
          -RemoveUserData -SkipPathRemoval -SkipShortcutRemoval -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `;
    const rmRes = runPS(rmCmd);
    const rmObj = rmRes.status === 0 ? JSON.parse(rmRes.stdout) : null;

    // Case AG: RemoveUserData uninstall succeeds
    assertTest(rmObj && rmObj.success === true, "Case AG: uninstall with RemoveUserData succeeds");

    // Case AH: projects.json STILL preserved even with RemoveUserData
    assertTest(fs.existsSync(path.join(env7.stateRoot, 'projects.json')), "Case AH: projects.json preserved even with RemoveUserData");

    // Case AI: custom skills removed with RemoveUserData
    assertTest(!fs.existsSync(path.join(env7.stateRoot, 'skills', 'custom', 'x.json')), "Case AI: custom skills removed with RemoveUserData");

    // Case AJ: logs removed with RemoveUserData
    assertTest(!fs.existsSync(path.join(env7.stateRoot, 'logs', 'app.log')), "Case AJ: logs removed with RemoveUserData");

  } finally { cleanup(env7); }

  // ============================================================
  // SECTION 8: UNINSTALL IDEMPOTENCY
  // ============================================================
  console.log("\n--- Section 8: Uninstall Idempotency ---");
  const env8 = createTestEnv('_idem');
  try {
    // Install then uninstall
    runPS(buildInstallCmd(env8));
    runPS(`
      . '${esc(installerScript)}'
      Uninstall-NexoraUnified -StateRoot '${esc(env8.stateRoot)}' -SkipPathRemoval -SkipShortcutRemoval -SkipAppsAndFeatures | Out-Null
    `);

    // Second uninstall (idempotent)
    const idem = runPS(`
      . '${esc(installerScript)}'
      $res = Uninstall-NexoraUnified -StateRoot '${esc(env8.stateRoot)}' -SkipPathRemoval -SkipShortcutRemoval -SkipAppsAndFeatures
      $res | ConvertTo-Json -Depth 5
    `);
    const idemObj = idem.status === 0 ? JSON.parse(idem.stdout) : null;

    // Case AK: Second uninstall succeeds (idempotent)
    assertTest(idemObj && idemObj.success === true, "Case AK: second uninstall is idempotent (no-op success)");

  } finally { cleanup(env8); }

  // ============================================================
  // SECTION 9: APPS & FEATURES REGISTRY ABSTRACTION
  // ============================================================
  console.log("\n--- Section 9: Apps & Features Registry Abstraction ---");
  const env9 = createTestEnv('_registry');
  try {
    // Create test registry hive in temp
    const testRegRoot = `HKCU:\\Software\\NexoraTest_${Date.now()}`;
    const testRegKey = `${testRegRoot}\\NexoraSkillsManager`;

    // Case AL: Register with test hive
    const regCmd = `
      . '${esc(installerScript)}'
      $r = Register-NexoraAppsAndFeatures -Version '1.0.0' \`
          -InstallLocation 'C:\\fake\\path' \`
          -DisplayIcon 'C:\\fake\\icon.exe' \`
          -UninstallString 'powershell.exe -File C:\\fake\\uninstall.ps1' \`
          -RegistryRoot '${testRegRoot}'
      $exists = Test-Path '${testRegKey}'
      $displayName = if ($exists) { (Get-ItemProperty '${testRegKey}').DisplayName } else { '' }
      $displayVersion = if ($exists) { (Get-ItemProperty '${testRegKey}').DisplayVersion } else { '' }
      $hasPublisher = if ($exists) { (Get-ItemProperty '${testRegKey}').PSObject.Properties.Name -contains 'Publisher' } else { $false }
      [PSCustomObject]@{ success=$r; exists=$exists; displayName=$displayName; displayVersion=$displayVersion; hasPublisher=$hasPublisher } | ConvertTo-Json
    `;
    const regRes = runPS(regCmd);
    const regObj = regRes.status === 0 ? JSON.parse(regRes.stdout) : null;

    assertTest(regObj && regObj.success === true && regObj.exists === true, "Case AL: Apps & Features registration writes to test hive");
    assertTest(regObj && regObj.displayName === 'Nexora Skills Manager', "Case AM: DisplayName is 'Nexora Skills Manager'");
    assertTest(regObj && (regObj.hasPublisher === false || regObj.hasPublisher === 'False'), "Case AN: Publisher is not set");

    // Case AO: Unregister
    const unregCmd = `
      . '${esc(installerScript)}'
      Unregister-NexoraAppsAndFeatures -RegistryRoot '${testRegRoot}' | Out-Null
      $exists = Test-Path '${testRegKey}'
      Write-Output $exists
    `;
    const unregRes = runPS(unregCmd);
    assertTest(unregRes.stdout.trim() === 'False', "Case AO: Apps & Features entry removed from test hive");

    // Cleanup test registry
    runPS(`Remove-Item '${testRegRoot}' -Recurse -Force -ErrorAction SilentlyContinue`);

  } finally { cleanup(env9); }

  // ============================================================
  // SECTION 10: FRESH INSTALL FAILURE CLEANUP
  // ============================================================
  console.log("\n--- Section 10: Fresh Install Failure Cleanup ---");
  const env10 = createTestEnv('_freshfail');
  try {
    // Seed pre-existing user state that must survive
    fs.mkdirSync(env10.stateRoot, { recursive: true });
    fs.writeFileSync(path.join(env10.stateRoot, 'projects.json'), '{"projects":["pre-existing"]}', 'utf8');

    // Inject failure during fresh install after_desktop
    const failCmd = `
      . '${esc(installerScript)}'
      try {
        Install-NexoraUnified -InstallRoot '${esc(env10.installRoot)}' \`
            -StateRoot '${esc(env10.stateRoot)}' \`
            -DesktopRoot '${esc(env10.desktopRoot)}' \`
            -BinDir '${esc(env10.binDir)}' \`
            -SourceDir '${esc(repoRoot)}' \`
            -DesktopSourceDir '${esc(winUnpackedDir)}' \`
            -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures \`
            -InjectFailureAt 'after_desktop'
        Write-Output "UNEXPECTED_SUCCESS"
      } catch {
        Write-Output "CAUGHT: $($_.Exception.Message)"
      }
    `;
    const fRes = runPS(failCmd);

    // Case AP: Partial fresh install cleaned up
    assertTest(!fs.existsSync(env10.installRoot), "Case AP: partially created runtime removed after fresh install failure");
    assertTest(!fs.existsSync(env10.desktopRoot), "Case AQ: partially created Desktop removed after fresh install failure");

    // Case AR: Pre-existing projects.json preserved
    assertTest(fs.existsSync(path.join(env10.stateRoot, 'projects.json')), "Case AR: pre-existing projects.json preserved after fresh install failure");

  } finally { cleanup(env10); }

  // ============================================================
  // SECTION 11: ERROR CODES
  // ============================================================
  console.log("\n--- Section 11: Error Codes ---");

  // Case AS: Error codes are stable strings
  const codeRes = runPS(`
    . '${esc(installerScript)}'
    $codes = $script:NexoraErrorCodes
    $all = @(
      'INSTALL_VALIDATION_FAILED',
      'INSTALL_REPLACEMENT_FAILED',
      'INSTALL_ROLLBACK_FAILED',
      'INSTALLATION_IN_USE',
      'UPGRADE_VERSION_MISMATCH',
      'DOWNGRADE_NOT_ALLOWED',
      'REPAIR_FAILED',
      'UNINSTALL_FAILED'
    )
    $present = 0
    foreach ($c in $all) { if ($codes[$c] -eq $c) { $present++ } }
    Write-Output "$present"
  `);
  assertTest(codeRes.stdout.trim() === '8', "Case AS: all 8 stable error codes defined");

  // ============================================================
  // SECTION 12: PROCESS-IN-USE DETECTION
  // ============================================================
  console.log("\n--- Section 12: Process-in-Use Detection ---");

  // Case AT: Test-NexoraProcessInUse with non-existent paths returns not in use
  const piuRes = runPS(`
    . '${esc(installerScript)}'
    $r = Test-NexoraProcessInUse -DesktopRoot 'C:\\nonexistent\\path\\12345' -InstallRoot 'C:\\nonexistent\\path\\67890'
    Write-Output $r.inUse
  `);
  assertTest(piuRes.stdout.trim() === 'False', "Case AT: process-in-use returns false for non-existent paths");

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log(`\n=== Gate 7.5 Install Lifecycle Safety Results: ${passed} / ${passed + failed} PASS ===`);
  if (failed > 0) {
    console.error(`FAILED: ${failed} test(s) did not pass`);
    process.exit(1);
  }
}

runLifecycleTests().catch(err => {
  console.error('Test suite error:', err.message);
  process.exit(1);
});
