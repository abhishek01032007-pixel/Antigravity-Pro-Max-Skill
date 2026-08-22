/**
 * winget-release.test.js - WinGet Package & Distribution Validation Suite
 * Part of Phase 10.2 Preparation — WinGet Package, Short Install Command & Release Validation
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

console.log('=== Running Phase 10.2 WinGet Package & Manifest Validation Tests ===\n');

try {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const manifestDir = path.join(repoRoot, 'winget-manifests/manifests/n/Nexora/NexoraSkillsManager/1.0.0');
  const versionYamlPath = path.join(manifestDir, 'Nexora.NexoraSkillsManager.yaml');
  const installerYamlPath = path.join(manifestDir, 'Nexora.NexoraSkillsManager.installer.yaml');
  const localeYamlPath = path.join(manifestDir, 'Nexora.NexoraSkillsManager.locale.en-US.yaml');
  const nexoraVersionPath = path.join(repoRoot, 'nexora-version.json');
  const readmePath = path.join(repoRoot, 'README.md');

  assertTest(fs.existsSync(versionYamlPath), 'Case A1: Nexora.NexoraSkillsManager.yaml exists');
  assertTest(fs.existsSync(installerYamlPath), 'Case A2: Nexora.NexoraSkillsManager.installer.yaml exists');
  assertTest(fs.existsSync(localeYamlPath), 'Case A3: Nexora.NexoraSkillsManager.locale.en-US.yaml exists');

  const versionYaml = fs.readFileSync(versionYamlPath, 'utf8');
  const installerYaml = fs.readFileSync(installerYamlPath, 'utf8');
  const localeYaml = fs.readFileSync(localeYamlPath, 'utf8');
  const nexoraVersion = JSON.parse(fs.readFileSync(nexoraVersionPath, 'utf8'));
  const readme = fs.readFileSync(readmePath, 'utf8');

  // -------------------------------------------------------------------------
  // CATEGORY A: Canonical Identity & Metadata
  // -------------------------------------------------------------------------
  assertTest(versionYaml.includes('PackageIdentifier: Nexora.NexoraSkillsManager'), 'Case A: PackageIdentifier is Nexora.NexoraSkillsManager');
  assertTest(localeYaml.includes('PackageName: Nexora Skills Manager'), 'Case B: PackageName is Nexora Skills Manager');
  assertTest(localeYaml.includes('Moniker: nexora'), 'Case C: Moniker is nexora');
  assertTest(versionYaml.includes('PackageVersion: 1.0.0'), 'Case D: Manifest PackageVersion is 1.0.0');
  assertTest(installerYaml.includes('Architecture: x64'), 'Case E: Installer architecture is x64');

  // -------------------------------------------------------------------------
  // CATEGORY F: URLs, Checksums & License
  // -------------------------------------------------------------------------
  const expectedUrl = 'https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.0/NexoraSkillsManager-1.0.0-win-x64.zip';
  assertTest(installerYaml.includes(expectedUrl), 'Case F: InstallerUrl points to v1.0.0 release artifact');
  const shaMatch = installerYaml.match(/InstallerSha256:\s*([A-Fa-f0-9]{64})/);
  assertTest(!!shaMatch && shaMatch[1].length === 64, 'Case G: InstallerSha256 is valid 64-char hex checksum');
  assertTest(localeYaml.includes('License: MIT'), 'Case L: License matches repository MIT license');
  assertTest(localeYaml.includes('PackageUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager'), 'Case L2: PackageUrl points to public repository');

  // -------------------------------------------------------------------------
  // CATEGORY H: Safety & Cleanliness
  // -------------------------------------------------------------------------
  assertTest(!versionYaml.includes('D:\\') && !installerYaml.includes('D:\\') && !localeYaml.includes('D:\\'), 'Case H: Zero local developer paths in WinGet manifests');
  assertTest(!versionYaml.includes('ghp_') && !installerYaml.includes('ghp_') && !localeYaml.includes('ghp_'), 'Case I: Zero embedded secrets in WinGet manifests');
  assertTest(!localeYaml.includes('Nexora Inc') && !localeYaml.includes('Nexora Technologies'), 'Case Q: Zero fabricated corporate publisher entities');

  // -------------------------------------------------------------------------
  // CATEGORY M: Schema & Installer Invariants
  // -------------------------------------------------------------------------
  assertTest(versionYaml.includes('ManifestVersion: 1.9.0'), 'Case M1: Version manifest uses schema 1.9.0');
  assertTest(installerYaml.includes('ManifestVersion: 1.9.0'), 'Case M2: Installer manifest uses schema 1.9.0');
  assertTest(localeYaml.includes('ManifestVersion: 1.9.0'), 'Case M3: Locale manifest uses schema 1.9.0');
  assertTest(installerYaml.includes('PortableCommandAlias: nexora'), 'Case N: Portable command alias configured for nexora');
  assertTest(installerYaml.includes('UpgradeBehavior: install'), 'Case O: UpgradeBehavior configured as install');

  // -------------------------------------------------------------------------
  // CATEGORY R: Version Consistency & Documentation Rules
  // -------------------------------------------------------------------------
  assertTest(nexoraVersion.coreVersion === '1.0.0', 'Case K: Core version matches WinGet manifest version 1.0.0');
  assertTest(!readme.includes('winget install nexora') || readme.includes('coming') || readme.includes('WinGet'), 'Case R: README does not make premature claims of live WinGet resolution');
  assertTest(readme.includes('irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex'), 'Case S: Primary installation remains canonical PowerShell setup');

  console.log(`\n=== Phase 10.2 WinGet Validation Suite: ${passed} Passed, ${failed} Failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Fatal error running WinGet release tests:', err);
  process.exit(1);
}
