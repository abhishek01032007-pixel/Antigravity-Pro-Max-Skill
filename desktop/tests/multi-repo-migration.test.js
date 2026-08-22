/**
 * multi-repo-migration.test.js - Automated Verification of Multi-Repository Architecture
 * Part of Phase 9.5 Multi-Repository Architecture, Component Versioning & Update-Centre Migration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assertTest(condition, name) {
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${name}`);
    passed++;
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${name}`);
    failed++;
  }
}

console.log('=== Running Phase 9.5 Multi-Repository Architecture & Migration Tests ===\n');

try {
  const baseDir = 'D:\\Nexora Repositories';
  const skillsRepo = path.join(baseDir, 'Nexora-Skills');
  const desktopRepo = path.join(baseDir, 'Nexora-Desktop');
  const engineRepo = path.join(baseDir, 'Nexora-Engine');
  const installerRepo = path.join(baseDir, 'Nexora-Windows-Installer');

  // -------------------------------------------------------------------------
  // CATEGORY A: Four Repositories Defined & Present
  // -------------------------------------------------------------------------
  assertTest(fs.existsSync(skillsRepo), 'Case A1: Nexora-Skills repository directory exists');
  assertTest(fs.existsSync(desktopRepo), 'Case A2: Nexora-Desktop repository directory exists');
  assertTest(fs.existsSync(engineRepo), 'Case A3: Nexora-Engine repository directory exists');
  assertTest(fs.existsSync(installerRepo), 'Case A4: Nexora-Windows-Installer repository directory exists');

  // -------------------------------------------------------------------------
  // CATEGORY B: Component Manifests Contract
  // -------------------------------------------------------------------------
  const skillsManifestPath = path.join(skillsRepo, 'nexora-skills-manifest.json');
  const desktopManifestPath = path.join(desktopRepo, 'nexora-desktop-manifest.json');
  const engineManifestPath = path.join(engineRepo, 'nexora-engine-manifest.json');
  const installerManifestPath = path.join(installerRepo, 'nexora-installer-manifest.json');
  const lockFilePath = path.join(installerRepo, 'components.lock.json');

  assertTest(fs.existsSync(skillsManifestPath), 'Case B1: nexora-skills-manifest.json exists');
  assertTest(fs.existsSync(desktopManifestPath), 'Case B2: nexora-desktop-manifest.json exists');
  assertTest(fs.existsSync(engineManifestPath), 'Case B3: nexora-engine-manifest.json exists');
  assertTest(fs.existsSync(installerManifestPath), 'Case B4: nexora-installer-manifest.json exists');
  assertTest(fs.existsSync(lockFilePath), 'Case B5: components.lock.json exists in Installer repository');

  const stripBom = (str) => str.replace(/^\uFEFF/, '');

  const skillsManifest = JSON.parse(stripBom(fs.readFileSync(skillsManifestPath, 'utf8')));
  const desktopManifest = JSON.parse(stripBom(fs.readFileSync(desktopManifestPath, 'utf8')));
  const engineManifest = JSON.parse(stripBom(fs.readFileSync(engineManifestPath, 'utf8')));
  const installerManifest = JSON.parse(stripBom(fs.readFileSync(installerManifestPath, 'utf8')));
  const lockFile = JSON.parse(stripBom(fs.readFileSync(lockFilePath, 'utf8')));

  // -------------------------------------------------------------------------
  // CATEGORY C: Manifest Schema & Version Validation
  // -------------------------------------------------------------------------
  assertTest(skillsManifest.schemaVersion === 1, 'Case C1: Skills manifest schemaVersion is 1');
  assertTest(skillsManifest.skillsVersion === '1.0.0', 'Case C2: Skills manifest skillsVersion is 1.0.0');
  assertTest(skillsManifest.totalSkills >= 48, 'Case C3: Skills manifest covers 48+ skills');

  assertTest(desktopManifest.schemaVersion === 1, 'Case D1: Desktop manifest schemaVersion is 1');
  assertTest(desktopManifest.desktopVersion === '1.0.0', 'Case D2: Desktop manifest desktopVersion is 1.0.0');
  assertTest(desktopManifest.requiredEngineApiVersion === 1, 'Case D3: Desktop manifest requires engineApiVersion 1');

  assertTest(engineManifest.schemaVersion === 1, 'Case E1: Engine manifest schemaVersion is 1');
  assertTest(engineManifest.engineVersion === '1.0.0', 'Case E2: Engine manifest engineVersion is 1.0.0');
  assertTest(engineManifest.engineApiVersion === 1, 'Case E3: Engine manifest provides engineApiVersion 1');
  assertTest(engineManifest.bridgeOperationsCount === 29, 'Case E4: Engine manifest specifies exact 29 bridge operations');

  assertTest(installerManifest.schemaVersion === 1, 'Case F1: Installer manifest schemaVersion is 1');
  assertTest(installerManifest.installerVersion === '1.0.0', 'Case F2: Installer manifest installerVersion is 1.0.0');
  assertTest(installerManifest.targetPlatform === 'win32', 'Case F3: Installer manifest targets win32 platform');
  assertTest(installerManifest.targetArch === 'x64', 'Case F4: Installer manifest targets x64 architecture');

  // -------------------------------------------------------------------------
  // CATEGORY G: Component Lock & Cross-Version Compatibility
  // -------------------------------------------------------------------------
  assertTest(lockFile.product === 'Nexora Skills Manager', 'Case G1: Lock file product name is Nexora Skills Manager');
  assertTest(lockFile.productVersion === '1.0.0', 'Case G2: Lock file productVersion is 1.0.0');
  assertTest(lockFile.components.desktop.version === '1.0.0', 'Case G3: Pinned desktop version is 1.0.0');
  assertTest(lockFile.components.engine.version === '1.0.0', 'Case G4: Pinned engine version is 1.0.0');
  assertTest(lockFile.components.skills.version === '1.0.0', 'Case G5: Pinned skills version is 1.0.0');
  assertTest(lockFile.components.installer.version === '1.0.0', 'Case G6: Pinned installer version is 1.0.0');

  // Compatibility Assertion: Desktop required API matches Engine provided API
  assertTest(desktopManifest.requiredEngineApiVersion === engineManifest.engineApiVersion, 'Case H1: Desktop and Engine API versions are 100% compatible');

  // -------------------------------------------------------------------------
  // CATEGORY I: Repository Documentation & Ownership Policies
  // -------------------------------------------------------------------------
  const repos = [skillsRepo, desktopRepo, engineRepo, installerRepo];
  for (const r of repos) {
    const repoName = path.basename(r);
    assertTest(fs.existsSync(path.join(r, 'README.md')), `Case I1 [${repoName}]: README.md present`);
    assertTest(fs.existsSync(path.join(r, 'OWNERSHIP.md')), `Case I2 [${repoName}]: OWNERSHIP.md present`);
    assertTest(fs.existsSync(path.join(r, 'CONTRIBUTING.md')), `Case I3 [${repoName}]: CONTRIBUTING.md present`);
    assertTest(fs.existsSync(path.join(r, 'LICENSE')), `Case I4 [${repoName}]: LICENSE present`);
    assertTest(fs.existsSync(path.join(r, '.gitignore')), `Case I5 [${repoName}]: .gitignore present`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY J: Windows Assembly Pipeline
  // -------------------------------------------------------------------------
  const assemblyScript = path.join(installerRepo, 'scripts/Build-NexoraProduct.ps1');
  assertTest(fs.existsSync(assemblyScript), 'Case J1: Build-NexoraProduct.ps1 exists in Installer repository');

  // -------------------------------------------------------------------------
  // CATEGORY K: User Experience & Single Product Invariants
  // -------------------------------------------------------------------------
  assertTest(desktopManifest.executableName === 'NexoraSkillsManager.exe', 'Case K1: Single Windows executable target is NexoraSkillsManager.exe');
  assertTest(desktopManifest.appId === 'com.nexora.skillsmanager', 'Case K2: Single App ID is com.nexora.skillsmanager');

  console.log(`\n=== Phase 9.5 Multi-Repository Architecture Suite: ${passed} Passed, ${failed} Failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Fatal error running multi-repo migration tests:', err);
  process.exit(1);
}
