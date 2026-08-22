/**
 * release-documentation.test.js - Automated Verification of Public Release Documentation
 * Part of Phase 9.3 Documentation & Installer Presentation Polish
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

console.log('=== Running Phase 9.3 Release Documentation Verification Tests ===\n');

try {
  const repoRoot = path.resolve(__dirname, '../..');
  const readmePath = path.join(repoRoot, 'README.md');
  const releaseNotesPath = path.join(repoRoot, 'RELEASE_NOTES.md');
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const setupPath = path.join(repoRoot, 'setup.ps1');
  const uninstallPath = path.join(repoRoot, 'uninstall.ps1');

  // -------------------------------------------------------------------------
  // CATEGORY A: File Existence
  // -------------------------------------------------------------------------
  assertTest(fs.existsSync(readmePath), 'Case A1: README.md exists');
  assertTest(fs.existsSync(releaseNotesPath), 'Case A2: RELEASE_NOTES.md exists');
  assertTest(fs.existsSync(changelogPath), 'Case A3: CHANGELOG.md exists');
  assertTest(fs.existsSync(setupPath), 'Case A4: setup.ps1 exists');
  assertTest(fs.existsSync(uninstallPath), 'Case A5: uninstall.ps1 exists');

  const readme = fs.readFileSync(readmePath, 'utf8');
  const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const setup = fs.readFileSync(setupPath, 'utf8');
  const uninstall = fs.readFileSync(uninstallPath, 'utf8');

  // -------------------------------------------------------------------------
  // CATEGORY B: Canonical Installation Command
  // -------------------------------------------------------------------------
  const canonicalUrl = 'irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex';
  assertTest(readme.includes(canonicalUrl), 'Case B1: README.md contains canonical installation URL');
  assertTest(!readme.includes('agpm.dev'), 'Case B2: README.md strictly excludes placeholder agpm.dev domain');
  assertTest(!readme.includes('C:\\Antigravity Pro Max Skill'), 'Case B3: README.md strictly excludes legacy hardcoded path');
  assertTest(!setup.includes('agpm.dev'), 'Case B4: setup.ps1 strictly excludes placeholder agpm.dev domain');
  assertTest(!uninstall.includes('agpm.dev'), 'Case B5: uninstall.ps1 strictly excludes placeholder agpm.dev domain');

  // -------------------------------------------------------------------------
  // CATEGORY C: Product Identity & Platform Support
  // -------------------------------------------------------------------------
  assertTest(readme.includes('NEXORA SKILLS MANAGER'), 'Case C1: README.md contains product name header');
  assertTest(readme.includes('Windows x64'), 'Case C2: README.md specifies Windows x64');
  assertTest(readme.includes('nexora') && readme.includes('agpm'), 'Case C3: README.md documents primary nexora and legacy agpm');
  assertTest(readme.includes('Google Antigravity') && readme.includes('Cursor') && readme.includes('GitHub Copilot'), 'Case C4: README.md documents exact supported AI platforms');
  assertTest(!readme.includes('official partner') && !readme.includes('endorsed by Google'), 'Case C5: README.md excludes false partnership claims');

  // -------------------------------------------------------------------------
  // CATEGORY D: Privacy, Security & SmartScreen Guidance
  // -------------------------------------------------------------------------
  assertTest(readme.includes('does not transmit project contents or telemetry'), 'Case D1: README.md contains accurate privacy statement');
  assertTest(readme.includes('SmartScreen') && readme.includes('unsigned'), 'Case D2: README.md contains neutral SmartScreen guidance');
  assertTest(!readme.includes('Verified Publisher') && !readme.includes('Signed Certificate'), 'Case D3: README.md excludes false verified publisher claims');
  assertTest(!readme.includes('winget install'), 'Case D4: README.md excludes nonexistent winget package claims');

  // -------------------------------------------------------------------------
  // CATEGORY E: Public Docs Phase Jargon Absence
  // -------------------------------------------------------------------------
  assertTest(!readme.includes('Phase 8') && !readme.includes('Phase 7') && !readme.includes('Gate 6'), 'Case E1: README.md contains zero internal phase/gate jargon');
  assertTest(!releaseNotes.includes('Phase 8') && !releaseNotes.includes('Phase 7') && !releaseNotes.includes('Gate 6'), 'Case E2: RELEASE_NOTES.md contains zero internal phase/gate jargon');
  assertTest(!changelog.includes('Phase 8') && !changelog.includes('Phase 7') && !changelog.includes('Gate 6'), 'Case E3: CHANGELOG.md contains zero internal phase/gate jargon');

  // -------------------------------------------------------------------------
  // CATEGORY F: Release Notes & Changelog Structure
  // -------------------------------------------------------------------------
  assertTest(releaseNotes.includes('Nexora Skills Manager v1.0.0'), 'Case F1: RELEASE_NOTES.md specifies v1.0.0');
  assertTest(releaseNotes.includes('Google Antigravity') && releaseNotes.includes('Cursor') && releaseNotes.includes('GitHub Copilot'), 'Case F2: RELEASE_NOTES.md specifies supported AI platforms');
  assertTest(changelog.includes('## [1.0.0]'), 'Case F3: CHANGELOG.md contains [1.0.0] release header');

  // -------------------------------------------------------------------------
  // CATEGORY G: Installer Console Presentation
  // -------------------------------------------------------------------------
  assertTest(setup.includes('NEXORA SKILLS MANAGER INSTALLER'), 'Case G1: setup.ps1 contains clean Nexora branding header');
  assertTest(uninstall.includes('projects.json') && uninstall.includes('preserved'), 'Case G2: uninstall.ps1 explicitly states user projects are preserved');

  console.log(`\n=== Phase 9.3 Release Documentation Suite: ${passed} Passed, ${failed} Failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Fatal error running release documentation tests:', err);
  process.exit(1);
}
