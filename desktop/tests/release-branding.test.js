/**
 * release-branding.test.js - Release Branding, Assets & Production Invariants Verification
 * Part of Phase 10.1 Final Release Assets, Windows Branding & Production Release Preparation
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

console.log('=== Running Phase 10.1 Release Branding & Production Invariants Tests ===\n');

try {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const electronBuilderPath = path.join(repoRoot, 'desktop/electron-builder.yml');
  const mainJsPath = path.join(repoRoot, 'desktop/main.js');
  const packageJsonPath = path.join(repoRoot, 'desktop/package.json');
  const nexoraVersionPath = path.join(repoRoot, 'nexora-version.json');
  const readmePath = path.join(repoRoot, 'README.md');
  const releaseNotesPath = path.join(repoRoot, 'RELEASE_NOTES.md');
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const setupPs1Path = path.join(repoRoot, 'setup.ps1');
  const uninstallPs1Path = path.join(repoRoot, 'uninstall.ps1');
  const installerPs1Path = path.join(repoRoot, 'engine/Install/NexoraInstaller.ps1');
  const settingsScreenPath = path.join(repoRoot, 'ui/js/screens/SettingsAboutScreen.js');
  const updateCenterPath = path.join(repoRoot, 'ui/js/screens/UpdateCenterScreen.js');

  const electronBuilderYml = fs.readFileSync(electronBuilderPath, 'utf8');
  const mainJs = fs.readFileSync(mainJsPath, 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const nexoraVersion = JSON.parse(fs.readFileSync(nexoraVersionPath, 'utf8'));
  const readme = fs.readFileSync(readmePath, 'utf8');
  const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const setupPs1 = fs.readFileSync(setupPs1Path, 'utf8');
  const uninstallPs1 = fs.readFileSync(uninstallPs1Path, 'utf8');
  const installerPs1 = fs.readFileSync(installerPs1Path, 'utf8');
  const settingsScreen = fs.readFileSync(settingsScreenPath, 'utf8');
  const updateCenter = fs.readFileSync(updateCenterPath, 'utf8');

  // -------------------------------------------------------------------------
  // CATEGORY A: Canonical Identity & Metadata
  // -------------------------------------------------------------------------
  assertTest(electronBuilderYml.includes('productName: Nexora Skills Manager'), 'Case A: Canonical product name is Nexora Skills Manager');
  assertTest(electronBuilderYml.includes('executableName: NexoraSkillsManager'), 'Case B: Executable name is NexoraSkillsManager');
  assertTest(electronBuilderYml.includes('appId: com.nexora.skillsmanager'), 'Case C: Application ID is com.nexora.skillsmanager');
  assertTest(nexoraVersion.coreVersion === '1.0.0' && packageJson.version === '1.0.0', 'Case D: Production version is 1.0.0');
  assertTest(settingsScreen.includes('Stable'), 'Case E: Release channel is Stable');
  assertTest(electronBuilderYml.includes('platform=win32') || electronBuilderYml.includes('win:'), 'Case F: Internal platform contract is win32');
  assertTest(electronBuilderYml.includes('arch:\n        - x64') || electronBuilderYml.includes('- x64'), 'Case G: Architecture is x64');

  // -------------------------------------------------------------------------
  // CATEGORY H: Windows Icon Configuration & Asset Audit
  // -------------------------------------------------------------------------
  assertTest(electronBuilderYml.includes('icon: "../assets/branding/NexoraSkillsManager.ico"'), 'Case H: electron-builder configures relative icon path');
  const iconPath = path.join(repoRoot, 'assets/branding/NexoraSkillsManager.ico');
  const png1024Path = path.join(repoRoot, 'assets/branding/NexoraSkillsManager-1024.png');
  const iconExists = fs.existsSync(iconPath);
  const pngExists = fs.existsSync(png1024Path);
  assertTest(iconExists, 'Case I1: Canonical Windows ICO asset exists');
  assertTest(pngExists, 'Case I2: Canonical 1024x1024 PNG asset exists');

  if (iconExists) {
    const iconBuf = fs.readFileSync(iconPath);
    const isIcoHeader = iconBuf.length >= 6 && iconBuf.readUInt16LE(0) === 0 && iconBuf.readUInt16LE(2) === 1;
    assertTest(isIcoHeader, 'Case J: Icon has valid Windows ICO magic header');
    const frameCount = iconBuf.readUInt16LE(4);
    assertTest(frameCount >= 7, `Case K: Multi-frame icon contains ${frameCount} frames (expected >= 7)`);
  }
  assertTest(mainJs.includes('icon: windowIcon'), 'Case M: BrowserWindow explicitly configures windowIcon');
  assertTest(installerPs1.includes('NexoraSkillsManager.exe') && installerPs1.includes('CreateShortcut'), 'Case N: Installer configures Start Menu shortcut');
  assertTest(installerPs1.includes('DisplayIcon'), 'Case O: Installer registry configures DisplayIcon');

  // -------------------------------------------------------------------------
  // CATEGORY P: Security & Anti-Spoofing Rules
  // -------------------------------------------------------------------------
  assertTest(!electronBuilderYml.includes('publisherName: "Nexora Inc"'), 'Case Q: Zero fabricated corporate publisher entities');
  assertTest(!readme.includes('Verified Publisher'), 'Case R: Zero false Verified Publisher claims');
  assertTest(readme.includes('SmartScreen') && releaseNotes.includes('SmartScreen'), 'Case S: Public documentation explains SmartScreen behavior');
  assertTest(!readme.includes('C:\\Antigravity Pro Max Skill'), 'Case T: Zero legacy primary branding paths');

  // -------------------------------------------------------------------------
  // CATEGORY U: User Interface & Host Presentation
  // -------------------------------------------------------------------------
  assertTest(settingsScreen.includes('Nexora Skills Manager'), 'Case U: Settings screen renders canonical product name');
  assertTest(updateCenter.includes('Nexora Skills Manager'), 'Case V: Update Center renders canonical product name');
  assertTest(mainJs.includes("title: 'Nexora Skills Manager'"), 'Case W: BrowserWindow title is Nexora Skills Manager');
  assertTest(!mainJs.includes("title: 'Electron'") && !mainJs.includes("title: 'localhost'"), 'Case X: Zero development window titles');
  assertTest(mainJs.includes('Menu.setApplicationMenu(null)'), 'Case Y: Default Electron menu is disabled on Windows');
  assertTest(mainJs.includes("input.key === 'F12'") && mainJs.includes('app.isPackaged'), 'Case Z: DevTools shortcuts blocked in packaged mode');

  // -------------------------------------------------------------------------
  // CATEGORY AA: Security Flags & URL Restrictions
  // -------------------------------------------------------------------------
  assertTest(mainJs.includes('contextIsolation: true'), 'Case AA1: contextIsolation is enabled');
  assertTest(mainJs.includes('nodeIntegration: false'), 'Case AA2: nodeIntegration is disabled');
  assertTest(mainJs.includes('sandbox: true'), 'Case AA3: sandbox is enabled');
  assertTest(mainJs.includes('webSecurity: true'), 'Case AA4: webSecurity is enabled');
  assertTest(mainJs.includes("startsWith('/abhishek01032007-pixel/Nexora-Skills-Manager')"), 'Case AB: External URL allowlist restricted to repo');

  // -------------------------------------------------------------------------
  // CATEGORY AC: Release Artifacts & Skill Inventory
  // -------------------------------------------------------------------------
  assertTest(electronBuilderYml.includes('artifactName: "NexoraSkillsManager-${version}-win-${arch}.${ext}"'), 'Case AC: Desktop artifact follows standard naming');
  const canonicalInstallUrl = 'irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex';
  assertTest(readme.includes(canonicalInstallUrl), 'Case AD: README contains canonical public installer URL');
  assertTest(releaseNotes.includes('v1.0.0'), 'Case AE: RELEASE_NOTES targets v1.0.0');
  assertTest(changelog.includes('## [1.0.0]'), 'Case AF: CHANGELOG specifies [1.0.0]');

  // Count exact built-in skills
  function countSkillMds(dir) {
    let total = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.git', 'dist', 'release'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) total += countSkillMds(full);
      else if (e.name === 'SKILL.md') total += 1;
    }
    return total;
  }
  const exactSkills = countSkillMds(repoRoot);
  assertTest(exactSkills === 48, `Case AG: Exact built-in skills count is 48 (verified: ${exactSkills})`);

  // -------------------------------------------------------------------------
  // CATEGORY AH: Path & Secret Leaks Scan
  // -------------------------------------------------------------------------
  assertTest(!mainJs.includes('D:\\Nexora Skills Manager GitHub'), 'Case AH: Zero hardcoded developer repository paths');
  assertTest(!mainJs.includes('ghp_') && !mainJs.includes('github_pat_'), 'Case AI: Zero embedded GitHub tokens');
  assertTest(!setupPs1.includes('Nexora-Skills.git'), 'Case AJ: setup.ps1 has zero dependency on experimental repositories');

  console.log(`\n=== Phase 10.1 Release Branding Suite: ${passed} Passed, ${failed} Failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Fatal error running release branding tests:', err);
  process.exit(1);
}
