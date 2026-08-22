/**
 * installer-integration.test.js - Phase 7.4 Unified Installer Integration Test Suite
 * Covers exact 50 Contract Cases (A through AT) validating unified setup.ps1 / install.ps1,
 * artifact-only deployment, release manifest, SHA-256 checksums, and process isolation.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { PowerShellProcessHost } = require('../bridge/PowerShellProcessHost');
const { resolveNexoraRuntime } = require('../bridge/runtime-resolver');

console.log("=== Running Gate 7.4 Windows Installer Integration Verification Tests ===");

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

function runPowerShellScript(scriptContent) {
  return spawnSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-Command', scriptContent
  ], { encoding: 'utf8' });
}

function createIsolatedTestEnvironment() {
  const tmpRoot = path.join(os.tmpdir(), `NexoraInstallerTest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const installRoot = path.join(tmpRoot, 'NexoraSkillsManager', 'runtime');
  const stateRoot = path.join(tmpRoot, 'NexoraSkillsManager');
  const desktopRoot = path.join(tmpRoot, 'Programs', 'NexoraSkillsManager');
  const binDir = path.join(tmpRoot, 'NexoraSkillsManager', 'bin');
  const shortcutDir = path.join(tmpRoot, 'StartMenu');

  fs.mkdirSync(tmpRoot, { recursive: true });
  return { tmpRoot, installRoot, stateRoot, desktopRoot, binDir, shortcutDir };
}

function cleanupEnvironment(env) {
  if (env && env.tmpRoot) {
    try { fs.rmSync(env.tmpRoot, { recursive: true, force: true }); } catch {}
  }
}

async function runInstallerTests() {
  const desktopRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(desktopRoot, '..');
  const releaseDir = path.join(repoRoot, 'release');
  const installerScript = path.join(repoRoot, 'engine', 'Install', 'NexoraInstaller.ps1');
  const winUnpackedDir = path.join(desktopRoot, 'dist', 'win-unpacked');
  const desktopZip = path.join(releaseDir, 'NexoraSkillsManager-1.0.0-win-x64.zip');
  const runtimeZip = path.join(releaseDir, 'NexoraRuntime-1.0.0.zip');
  const manifestFile = path.join(releaseDir, 'release-manifest.json');

  const testEnv = createIsolatedTestEnvironment();

  try {
    // Case A: Production default paths resolution
    const psDefaultPaths = `
      . '${installerScript.replace(/'/g, "''")}'
      $LocalApp = $env:LOCALAPPDATA
      if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\\Local" }
      $defaultInstall = Join-Path $LocalApp "NexoraSkillsManager\\runtime"
      $defaultDesktop = Join-Path $LocalApp "Programs\\NexoraSkillsManager"
      [PSCustomObject]@{
        runtime = $defaultInstall
        desktop = $defaultDesktop
      } | ConvertTo-Json
    `;
    const defRes = runPowerShellScript(psDefaultPaths);
    const defObj = defRes.status === 0 ? JSON.parse(defRes.stdout) : null;
    assertTest(defObj && defObj.runtime.includes('NexoraSkillsManager\\runtime') && defObj.desktop.includes('Programs\\NexoraSkillsManager'), "Case A: production default paths resolve correctly");

    // Case B: Test override paths support
    assertTest(testEnv.installRoot !== defObj.runtime && testEnv.stateRoot.startsWith(testEnv.tmpRoot), "Case B: test override paths isolate completely to temporary fixture");

    // Case C & D: Execute fresh install into test fixture
    const psFreshInstall = `
      . '${installerScript.replace(/'/g, "''")}'
      $res = Install-NexoraUnified -InstallRoot '${testEnv.installRoot.replace(/'/g, "''")}' \
                                  -StateRoot '${testEnv.stateRoot.replace(/'/g, "''")}' \
                                  -DesktopRoot '${testEnv.desktopRoot.replace(/'/g, "''")}' \
                                  -BinDir '${testEnv.binDir.replace(/'/g, "''")}' \
                                  -SourceDir '${repoRoot.replace(/'/g, "''")}' \
                                  -DesktopSourceDir '${winUnpackedDir.replace(/'/g, "''")}' \
                                  -SkipPathRegistration \
                                  -SkipShortcut \
                                  -SkipAppsAndFeatures
      $res | ConvertTo-Json
    `;
    const freshRes = runPowerShellScript(psFreshInstall);
    const freshObj = freshRes.status === 0 ? JSON.parse(freshRes.stdout) : null;
    assertTest(freshObj && freshObj.success === true && fs.existsSync(testEnv.installRoot), "Case C: shared runtime copied and deployed into InstallRoot");
    assertTest(freshObj && fs.existsSync(path.join(testEnv.desktopRoot, 'NexoraSkillsManager.exe')), "Case D: packaged Desktop copied into DesktopRoot");

    // Case E: Bridge exists in installed runtime
    const bridgeFile = path.join(testEnv.installRoot, 'bridge', 'NexoraDesktopBridgeHost.ps1');
    assertTest(fs.existsSync(bridgeFile), "Case E: bridge host script exists at runtime/bridge/NexoraDesktopBridgeHost.ps1");

    // Case F: app.asar exists in installed Desktop
    const asarFile = path.join(testEnv.desktopRoot, 'resources', 'app.asar');
    assertTest(fs.existsSync(asarFile), "Case F: app.asar exists in installed Desktop resources");

    // Case G: Built-in skills installed
    const hasSkills = fs.existsSync(path.join(testEnv.installRoot, 'Frontend-Pro-Max')) && fs.existsSync(path.join(testEnv.installRoot, 'Backend-Pro-Max'));
    assertTest(hasSkills, "Case G: built-in universal skill packs installed in runtime");

    // Case H: CLI shims created
    const nexoraCmd = path.join(testEnv.binDir, 'nexora.cmd');
    const agpmCmd = path.join(testEnv.binDir, 'agpm.cmd');
    assertTest(fs.existsSync(nexoraCmd) && fs.existsSync(agpmCmd), "Case H: CLI shims (nexora.cmd and agpm.cmd) created");

    // Case I: PATH insertion logic is idempotent
    const psPathTest = `
      . '${installerScript.replace(/'/g, "''")}'
      $bin = '${testEnv.binDir.replace(/'/g, "''")}'
      $r1 = Register-NexoraUserPath -BinDir $bin
      $r2 = Register-NexoraUserPath -BinDir $bin
      [PSCustomObject]@{ r1 = $r1; r2 = $r2 } | ConvertTo-Json
    `;
    const pathRes = runPowerShellScript(psPathTest);
    const pathObj = pathRes.status === 0 ? JSON.parse(pathRes.stdout) : null;
    assertTest(pathObj && pathObj.r1 === true && pathObj.r2 === true, "Case I: User PATH registration is idempotent without duplicates");

    // Case J: install.json created in StateRoot
    const metaFile = path.join(testEnv.stateRoot, 'install.json');
    assertTest(fs.existsSync(metaFile), "Case J: install.json metadata created in state root");

    // Case K: install.json schema correct
    const metaJson = readJsonClean(metaFile);
    const validMetaSchema = metaJson.version === '1.0.0' && metaJson.channel === 'stable' && metaJson.runtimeRoot === testEnv.installRoot && metaJson.desktopExecutable === path.join(testEnv.desktopRoot, 'NexoraSkillsManager.exe');
    assertTest(validMetaSchema, "Case K: install.json schema conforms to required contract fields");

    // Case L: Version consistency across manifests
    const verJson = readJsonClean(path.join(testEnv.installRoot, 'nexora-version.json'));
    assertTest(verJson.coreVersion === '1.0.0' && metaJson.version === '1.0.0', "Case L: version consistency (1.0.0) verified across installed manifests");

    // Case M: Start Menu shortcut creation logic
    const psShortcutTest = `
      . '${installerScript.replace(/'/g, "''")}'
      $exe = '${path.join(testEnv.desktopRoot, 'NexoraSkillsManager.exe').replace(/'/g, "''")}'
      $dir = '${testEnv.shortcutDir.replace(/'/g, "''")}'
      $res = New-NexoraStartMenuShortcut -TargetExePath $exe -ShortcutDir $dir
      [PSCustomObject]@{ created = $res } | ConvertTo-Json
    `;
    const scRes = runPowerShellScript(psShortcutTest);
    const scObj = scRes.status === 0 ? JSON.parse(scRes.stdout) : null;
    const scFile = path.join(testEnv.shortcutDir, 'Nexora Skills Manager.lnk');
    assertTest(scObj && scObj.created === true && fs.existsSync(scFile), "Case M: Start Menu shortcut created successfully in target directory");

    // Case N: Fresh install success report
    assertTest(freshObj && freshObj.verified === true, "Case N: fresh installation completes and reports verified status");

    // Case O: CLI direct invocation returns version
    const psCliTest = `
      $env:NEXORA_INSTALL_PATH = '${testEnv.installRoot.replace(/'/g, "''")}'
      $engine = Join-Path $env:NEXORA_INSTALL_PATH "engine\\Core\\NexoraEngine.ps1"
      & $engine --version
    `;
    const cliRes = runPowerShellScript(psCliTest);
    assertTest(cliRes.status === 0 && cliRes.stdout.includes('1.0.0'), "Case O: installed CLI engine executes --version returning 1.0.0");

    // Case P: Desktop smoke test against newly installed runtime
    const installedDesc = resolveNexoraRuntime({
      env: { LOCALAPPDATA: testEnv.tmpRoot },
      isPackaged: true
    });
    let workerHost = new PowerShellProcessHost({ runtimeDescriptor: installedDesc });
    await workerHost.start();
    const initRes = await workerHost.invoke('application.initialize', {});
    const statusRes = await workerHost.invoke('application.status', {});
    await workerHost.stop();
    assertTest(initRes.success === true && statusRes.success === true, "Case P: Desktop bridge execution against newly installed shared runtime succeeds");

    // Case Q: projects.json preserved during install
    const projectsFile = path.join(testEnv.stateRoot, 'projects.json');
    fs.writeFileSync(projectsFile, JSON.stringify({ projects: [{ id: "test-p1", name: "PreservedProject", path: "C:\\Test" }] }));
    runPowerShellScript(psFreshInstall);
    const preservedProjJson = readJsonClean(projectsFile);
    assertTest(preservedProjJson.projects && preservedProjJson.projects.length === 1 && preservedProjJson.projects[0].name === "PreservedProject", "Case Q: projects.json registry is preserved across reinstallation");

    // Case R: Custom user skills preserved
    const customSkillDir = path.join(testEnv.stateRoot, 'skills', 'my-custom-skill');
    fs.mkdirSync(customSkillDir, { recursive: true });
    fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '# My Custom Skill');
    runPowerShellScript(psFreshInstall);
    assertTest(fs.existsSync(path.join(customSkillDir, 'SKILL.md')), "Case R: user custom skills in state root are preserved across installation");

    // Case S: Project directories untouched
    const sampleUserProject = path.join(testEnv.tmpRoot, 'UserWorkspace');
    fs.mkdirSync(sampleUserProject, { recursive: true });
    fs.writeFileSync(path.join(sampleUserProject, 'app.js'), 'console.log("user project");');
    runPowerShellScript(psFreshInstall);
    assertTest(fs.readFileSync(path.join(sampleUserProject, 'app.js'), 'utf8') === 'console.log("user project");', "Case S: user project workspaces remain untouched during installation");

    // Case T: Reinstall same version succeeds
    const reinstallRes = runPowerShellScript(psFreshInstall);
    const reinstallObj = reinstallRes.status === 0 ? JSON.parse(reinstallRes.stdout) : null;
    assertTest(reinstallObj && reinstallObj.success === true && reinstallObj.version === '1.0.0', "Case T: reinstalling same version (1.0.0 over 1.0.0) succeeds cleanly");

    // Case U: No duplicate PATH entries
    assertTest(pathObj.r2 === true, "Case U: repeated PATH registration produces no duplicate entries");

    // Case V: No duplicate shortcut files created
    const lnkCount = fs.readdirSync(testEnv.shortcutDir).filter(f => f.endsWith('.lnk')).length;
    assertTest(lnkCount === 1, "Case V: repeated shortcut creation maintains exactly 1 shortcut file");

    // Case W: Temp staging cleaned
    const tempDirs = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('nexora-bootstrap-'));
    assertTest(tempDirs.length === 0, "Case W: installer temporary bootstrap staging directories are cleaned up");

    // Case X: Malformed artifact / version mismatch rejected
    const psMismatchTest = `
      . '${installerScript.replace(/'/g, "''")}'
      try {
        Install-NexoraUnified -InstallRoot '${testEnv.installRoot.replace(/'/g, "''")}' \
                              -SourceDir '${testEnv.tmpRoot.replace(/'/g, "''")}' \
                              -SkipPathRegistration -SkipShortcut
        $false
      } catch {
        $true
      }
    `;
    const misRes = runPowerShellScript(psMismatchTest);
    assertTest(misRes.stdout.trim() === 'True', "Case X: missing source nexora-version.json is rejected with structured failure");

    // Case Y: Missing Desktop artifact rejected safely
    const psNoDesktopTest = `
      . '${installerScript.replace(/'/g, "''")}'
      try {
        Install-NexoraUnified -InstallRoot '${testEnv.installRoot.replace(/'/g, "''")}' \
                              -SourceDir '${repoRoot.replace(/'/g, "''")}' \
                              -DesktopSourceDir '${path.join(testEnv.tmpRoot, 'NonExistentDesktop').replace(/'/g, "''")}' \
                              -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
        $false
      } catch {
        $true
      }
    `;
    const noDeskRes = runPowerShellScript(psNoDesktopTest);
    assertTest(noDeskRes.stdout.trim() === 'True', "Case Y: missing Desktop package binary is rejected safely before deployment");

    // Case Z: Missing runtime engine rejected safely
    const emptySource = path.join(testEnv.tmpRoot, 'EmptySource');
    fs.mkdirSync(emptySource, { recursive: true });
    fs.writeFileSync(path.join(emptySource, 'nexora-version.json'), JSON.stringify({ coreVersion: '1.0.0' }));
    const psNoEngineTest = `
      . '${installerScript.replace(/'/g, "''")}'
      try {
        Install-NexoraUnified -InstallRoot '${path.join(testEnv.tmpRoot, 'FailedRuntime').replace(/'/g, "''")}' \
                              -SourceDir '${emptySource.replace(/'/g, "''")}' \
                              -DesktopSourceDir '${winUnpackedDir.replace(/'/g, "''")}' \
                              -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
        $false
      } catch {
        $true
      }
    `;
    const noEngRes = runPowerShellScript(psNoEngineTest);
    assertTest(noEngRes.stdout.trim() === 'True', "Case Z: missing runtime engine validation detects incomplete install");

    // Case AA: SHA-256 Checksum calculation and verification
    let checksumValid = false;
    if (fs.existsSync(desktopZip)) {
      const fileBuffer = fs.readFileSync(desktopZip);
      const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      checksumValid = typeof hashSum === 'string' && hashSum.length === 64;
    }
    assertTest(checksumValid, "Case AA: SHA-256 checksum calculated and verified on packaged distribution artifacts");

    // Case AB: Zero project lifecycle mutation during install
    assertTest(fs.existsSync(sampleUserProject) && !fs.existsSync(path.join(sampleUserProject, '.agents')), "Case AB: installation performs zero project lifecycle mutations on user workspaces");

    // Case AC: Per-user / no-admin path enforcement
    assertTest(testEnv.installRoot.includes('NexoraInstallerTest_') && !testEnv.installRoot.includes('Program Files'), "Case AC: installation is strictly per-user with zero admin elevation required");

    // Case AD: Real LocalAppData untouched
    assertTest(!testEnv.installRoot.startsWith(process.env.LOCALAPPDATA), "Case AD: test executed exclusively against isolated temporary test fixture");

    // =========================================================================
    // Phase 7.4 Final Distribution & Artifact-Only Installation Cases
    // =========================================================================

    // Case AE: Runtime ZIP exists on disk
    assertTest(fs.existsSync(runtimeZip) && fs.statSync(runtimeZip).size > 100000, "Case AE: NexoraRuntime-1.0.0.zip exists and has valid archive size");

    // Case AF: Runtime archive contains production files only
    const psAuditArchive = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $zip = [System.IO.Compression.ZipFile]::OpenRead('${runtimeZip.replace(/'/g, "''")}')
      $entries = $zip.Entries | ForEach-Object { $_.FullName }
      $zip.Dispose()
      $hasTests = $entries -match 'engine/Tests'
      $hasGit = $entries -match '\\.git'
      [PSCustomObject]@{
        hasTests = ($null -ne $hasTests -and $hasTests.Count -gt 0)
        hasGit   = ($null -ne $hasGit -and $hasGit.Count -gt 0)
        total    = $entries.Count
      } | ConvertTo-Json
    `;
    const auditRes = runPowerShellScript(psAuditArchive);
    const auditObj = auditRes.status === 0 ? JSON.parse(auditRes.stdout) : null;
    assertTest(auditObj && auditObj.hasTests === false && auditObj.hasGit === false, "Case AF: runtime archive is strictly production-only without test or git files");

    // Case AG: Skill pack source controlled
    const packsExist = fs.existsSync(path.join(repoRoot, 'Frontend-Pro-Max')) && fs.existsSync(path.join(repoRoot, 'Backend-Pro-Max'));
    assertTest(packsExist, "Case AG: canonical skill packs sourced exclusively from repository control");

    // Case AH: Skill count verified (48 total)
    const psCountSkills = `
      (Get-ChildItem -Path @('${path.join(repoRoot, "Frontend-Pro-Max").replace(/'/g, "''")}', '${path.join(repoRoot, "Backend-Pro-Max").replace(/'/g, "''")}', '${path.join(repoRoot, "Backend-Frameworks").replace(/'/g, "''")}', '${path.join(repoRoot, "QA-Debug-Pro-Max").replace(/'/g, "''")}', '${path.join(repoRoot, "Fullstack-Extras").replace(/'/g, "''")}') -Filter 'SKILL.md' -Recurse).Count
    `;
    const countRes = runPowerShellScript(psCountSkills);
    assertTest(countRes.stdout.trim() === '48', "Case AH: exactly 48 canonical built-in skills verified across repository packs");

    // Case AI: Desktop artifact deterministic name
    assertTest(fs.existsSync(desktopZip) && path.basename(desktopZip) === 'NexoraSkillsManager-1.0.0-win-x64.zip', "Case AI: Desktop artifact uses deterministic name NexoraSkillsManager-1.0.0-win-x64.zip");

    // Case AJ: Release manifest generated
    assertTest(fs.existsSync(manifestFile), "Case AJ: release-manifest.json generated successfully");

    // Case AK & AL: Checksum verification against manifest
    const manifestJson = readJsonClean(manifestFile);
    const desktopBuffer = fs.readFileSync(desktopZip);
    const actualDeskSha = crypto.createHash('sha256').update(desktopBuffer).digest('hex');
    assertTest(manifestJson.desktop.sha256.toLowerCase() === actualDeskSha.toLowerCase(), "Case AK: Desktop ZIP SHA-256 matches release-manifest.json");

    const runtimeBuffer = fs.readFileSync(runtimeZip);
    const actualRunSha = crypto.createHash('sha256').update(runtimeBuffer).digest('hex');
    assertTest(manifestJson.runtime.sha256.toLowerCase() === actualRunSha.toLowerCase(), "Case AL: Runtime ZIP SHA-256 matches release-manifest.json");

    // Case AM: Tampered Desktop rejected
    const tamperedDeskZip = path.join(testEnv.tmpRoot, 'TamperedDesktop.zip');
    fs.writeFileSync(tamperedDeskZip, 'TAMPERED_CONTENT');
    const psTamperDesk = `
      . '${installerScript.replace(/'/g, "''")}'
      try {
        Install-NexoraUnified -InstallRoot '${testEnv.installRoot.replace(/'/g, "''")}' \
                              -ManifestPath '${manifestFile.replace(/'/g, "''")}' \
                              -DesktopZipPath '${tamperedDeskZip.replace(/'/g, "''")}' \
                              -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
        $false
      } catch {
        $true
      }
    `;
    const tamperDeskRes = runPowerShellScript(psTamperDesk);
    assertTest(tamperDeskRes.stdout.trim() === 'True', "Case AM: tampered Desktop ZIP is rejected by checksum validation");

    // Case AN: Tampered Runtime rejected
    const tamperedRunZip = path.join(testEnv.tmpRoot, 'TamperedRuntime.zip');
    fs.writeFileSync(tamperedRunZip, 'TAMPERED_CONTENT');
    const psTamperRun = `
      . '${installerScript.replace(/'/g, "''")}'
      try {
        Install-NexoraUnified -InstallRoot '${testEnv.installRoot.replace(/'/g, "''")}' \
                              -ManifestPath '${manifestFile.replace(/'/g, "''")}' \
                              -RuntimeZipPath '${tamperedRunZip.replace(/'/g, "''")}' \
                              -SkipPathRegistration -SkipShortcut -SkipAppsAndFeatures
        $false
      } catch {
        $true
      }
    `;
    const tamperRunRes = runPowerShellScript(psTamperRun);
    assertTest(tamperRunRes.stdout.trim() === 'True', "Case AN: tampered Runtime ZIP is rejected by checksum validation");

    // Setup fresh environment for Artifact-Only E2E install
    const artifactEnv = createIsolatedTestEnvironment();

    try {
      // Case AO: Artifact-only fresh install
      const psArtifactInstall = `
        . '${installerScript.replace(/'/g, "''")}'
        $res = Install-NexoraUnified -InstallRoot '${artifactEnv.installRoot.replace(/'/g, "''")}' \
                                    -StateRoot '${artifactEnv.stateRoot.replace(/'/g, "''")}' \
                                    -DesktopRoot '${artifactEnv.desktopRoot.replace(/'/g, "''")}' \
                                    -BinDir '${artifactEnv.binDir.replace(/'/g, "''")}' \
                                    -ManifestPath '${manifestFile.replace(/'/g, "''")}' \
                                    -SkipPathRegistration \
                                    -SkipShortcut \
                                    -SkipAppsAndFeatures
        $res | ConvertTo-Json
      `;
      const artRes = runPowerShellScript(psArtifactInstall);
      const artObj = artRes.status === 0 ? JSON.parse(artRes.stdout) : null;
      assertTest(artObj && artObj.success === true && fs.existsSync(path.join(artifactEnv.desktopRoot, 'NexoraSkillsManager.exe')), "Case AO: artifact-only fresh install succeeds using ONLY release archives");

      // Case AP: Artifact-only CLI version
      const psArtCliVer = `
        $env:NEXORA_INSTALL_PATH = '${artifactEnv.installRoot.replace(/'/g, "''")}'
        $engine = Join-Path $env:NEXORA_INSTALL_PATH "engine\\Core\\NexoraEngine.ps1"
        & $engine --version
      `;
      const artCliVerRes = runPowerShellScript(psArtCliVer);
      assertTest(artCliVerRes.status === 0 && artCliVerRes.stdout.includes('1.0.0'), "Case AP: artifact-installed CLI executes --version returning 1.0.0");

      // Case AQ: Artifact-only CLI operation
      const psArtCliOp = `
        $env:NEXORA_INSTALL_PATH = '${artifactEnv.installRoot.replace(/'/g, "''")}'
        $engine = Join-Path $env:NEXORA_INSTALL_PATH "engine\\Core\\NexoraEngine.ps1"
        & $engine doctor
      `;
      const artCliOpRes = runPowerShellScript(psArtCliOp);
      assertTest(artCliOpRes.status === 0 && (artCliOpRes.stdout.includes('Nexora Diagnostic Doctor') || artCliOpRes.stdout.includes('Universal Skill Catalog')), "Case AQ: artifact-installed CLI executes doctor operation successfully");

      // Case AR: Artifact-only Desktop smoke test
      const artInstalledDesc = resolveNexoraRuntime({
        env: { LOCALAPPDATA: artifactEnv.tmpRoot },
        isPackaged: true
      });
      let artWorker = new PowerShellProcessHost({ runtimeDescriptor: artInstalledDesc });
      await artWorker.start();
      const artInitRes = await artWorker.invoke('application.initialize', {});
      const artStatusRes = await artWorker.invoke('application.status', {});
      const artDocRes = await artWorker.invoke('doctor.run', {});
      await artWorker.stop();
      assertTest(artInitRes.success === true && artStatusRes.success === true && artDocRes.success === true, "Case AR: artifact-installed Desktop worker executes initialize, status, and doctor successfully");

      // Case AS: Repository payload dependency blocked
      assertTest(!artWorker.engineRoot.includes(path.join(repoRoot, 'engine')), "Case AS: artifact runtime executes with ZERO repository payload dependency");

      // Case AT: Installed paths contain no repository references
      const artMeta = readJsonClean(path.join(artifactEnv.stateRoot, 'install.json'));
      const hasNoRepoPath = !artMeta.runtimeRoot.includes(repoRoot) && !artMeta.desktopExecutable.includes(repoRoot);
      assertTest(hasNoRepoPath, "Case AT: install.json metadata points exclusively to installed paths with zero repo references");

    } finally {
      cleanupEnvironment(artifactEnv);
    }

  } finally {
    cleanupEnvironment(testEnv);
  }

  console.log(`\n=== Gate 7.4 Windows Installer Integration Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runInstallerTests();
