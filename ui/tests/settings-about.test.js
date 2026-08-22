/**
 * settings-about.test.js - Phase 9.2 Settings & About UI Polish Test Suite
 *
 * Validates unified Settings & About screen rendering, dynamic version resolution,
 * platform preferences management, external navigation security, menu suppression,
 * shell mock-toggle isolation, and zero-leakage invariants across 42+ test cases.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { SettingsAboutScreen } = require('../js/screens/SettingsAboutScreen');
const { NexoraAppShell } = require('../js/components/NexoraAppShell');
const { UpdateProgressModal } = require('../js/components/UpdateProgressModal');
const { OPERATIONS } = require('../../desktop/registry/operations');

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

console.log('=== Running Phase 9.2 Settings, About & UI Polish Tests ===\n');

async function runTests() {
  try {
    // -------------------------------------------------------------------------
    // CATEGORY A: Product Identity & Version Rendering
    // -------------------------------------------------------------------------
    const mockLiveContext = {
      isLiveMode: true,
      state: {
        installedVersion: '1.0.0',
        currentVersion: '1.0.0',
        engineHealthy: true,
        selectedPlatforms: ['antigravity', 'cursor'],
        runtimeRoot: 'C:\\Users\\Test\\AppData\\Local\\NexoraSkillsManager\\runtime',
        stateRoot: 'C:\\Users\\Test\\AppData\\Local\\NexoraSkillsManager'
      }
    };

    const renderedHtml = SettingsAboutScreen.render(mockLiveContext);

    assertTest(renderedHtml.includes('Nexora Skills Manager'), 'Case B: Product name renders Nexora Skills Manager');
    assertTest(renderedHtml.includes('v1.0.0') && renderedHtml.includes('settings-version-badge'), 'Case C: Version dynamically rendered from live state');
    assertTest(renderedHtml.includes('Stable') && renderedHtml.includes('badge-primary'), 'Case D: Channel renders Stable');
    assertTest(renderedHtml.includes('Windows x64'), 'Case E: Platform & Architecture displays Windows x64');
    assertTest(renderedHtml.includes('Local-First (Sandboxed)'), 'Case E2: Execution model displays Local-First (Sandboxed)');

    // -------------------------------------------------------------------------
    // CATEGORY B: AI Platform Integration & Persistence
    // -------------------------------------------------------------------------
    assertTest(renderedHtml.includes('Google Antigravity'), 'Case G: Antigravity platform card rendered');
    assertTest(renderedHtml.includes('Cursor'), 'Case H: Cursor platform card rendered');
    assertTest(renderedHtml.includes('GitHub Copilot'), 'Case I: GitHub Copilot platform card rendered');
    assertTest(renderedHtml.includes('Save Preferences'), 'Case F: Platform preferences save button present');
    assertTest(renderedHtml.includes('btn-save-settings-platforms'), 'Case J: Save button has unique accessible ID');

    // -------------------------------------------------------------------------
    // CATEGORY C: Installation & Runtime Details
    // -------------------------------------------------------------------------
    assertTest(renderedHtml.includes('Installation & Runtime'), 'Case N: Installation & Runtime section rendered');
    assertTest(renderedHtml.includes('Runtime Healthy'), 'Case O: Runtime status badge displays Runtime Healthy');
    assertTest(renderedHtml.includes('nexora') && renderedHtml.includes('Primary CLI'), 'Case P: Primary CLI command nexora shown');
    assertTest(renderedHtml.includes('agpm') && renderedHtml.includes('Compatibility forwarder'), 'Case Q: Legacy alias agpm labeled as compatibility forwarder');
    assertTest(renderedHtml.includes('Advanced Technical Details'), 'Case N2: Collapsible advanced technical details present');
    assertTest(renderedHtml.includes('btn-open-health-details'), 'Case N3: Diagnostics action button present');

    // -------------------------------------------------------------------------
    // CATEGORY D: About Section & Open Source Links
    // -------------------------------------------------------------------------
    assertTest(renderedHtml.includes('About Nexora Skills Manager'), 'Case R1: About heading rendered');
    assertTest(renderedHtml.toLowerCase().includes('local-first developer skill management and orchestration'), 'Case R2: About description rendered accurately');
    assertTest(!renderedHtml.includes('official partner') && !renderedHtml.includes('endorsed by Google'), 'Case S: Zero false partnership claims');
    assertTest(renderedHtml.includes('https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager'), 'Case T: Trusted GitHub repository link present');
    assertTest(renderedHtml.includes('https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/blob/main/LICENSE'), 'Case U: Trusted MIT license link present');
    assertTest(renderedHtml.includes('https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases'), 'Case V: Trusted release notes link present');
    assertTest(renderedHtml.includes('btn-settings-health'), 'Case W: Open System Health navigation button present');
    assertTest(renderedHtml.includes('btn-settings-updates'), 'Case X: Open Update Center navigation button present');
    assertTest(!renderedHtml.includes('Nexora Inc.') && !renderedHtml.includes('Nexora Technologies'), 'Case Y: Zero fabricated publisher claims');
    assertTest(!renderedHtml.includes('TBD') && !renderedHtml.includes('TODO'), 'Case Z: Zero placeholder TBD or TODO text');

    // -------------------------------------------------------------------------
    // CATEGORY E: Topbar & Shell Mock Control Isolation
    // -------------------------------------------------------------------------
    const liveShellHtml = NexoraAppShell.render('settings', { isOffline: false, hasUpdate: false, showDevControls: false });
    assertTest(!liveShellHtml.includes('btn-topbar-offline-toggle'), 'Case AF: Zero mock toggle button in LIVE production shell');
    assertTest(liveShellHtml.includes('● Healthy | Up to date'), 'Case AF2: Live topbar renders healthy status pill');
    assertTest(liveShellHtml.includes('data-nav="settings"'), 'Case AF3: Topbar settings button present');

    const devShellHtml = NexoraAppShell.render('settings', { isOffline: false, hasUpdate: false, showDevControls: true });
    assertTest(devShellHtml.includes('btn-topbar-offline-toggle'), 'Case AG: Mock toggle button available when showDevControls is true');

    // -------------------------------------------------------------------------
    // CATEGORY F: Navigation & Routing Integrity
    // -------------------------------------------------------------------------
    const appSrc = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
    assertTest(appSrc.includes('"settings": SettingsAboutScreen'), 'Case A: Settings route maps to SettingsAboutScreen in app.js');
    assertTest(appSrc.includes('import { SettingsAboutScreen }'), 'Case AJ: SettingsAboutScreen imported in app.js');
    assertTest(appSrc.includes('showDevControls: !this.data.isLiveMode'), 'Case AJ2: App shell hides dev controls in live mode');
    assertTest(appSrc.includes("btn.addEventListener('click', () => this.navigate('settings'))"), 'Case AJ3: Topbar and sidebar settings buttons route to settings');

    // -------------------------------------------------------------------------
    // CATEGORY G: Desktop Menu & Main Process Hardening
    // -------------------------------------------------------------------------
    const mainSrc = fs.readFileSync(path.resolve(__dirname, '../../desktop/main.js'), 'utf8');
    assertTest(mainSrc.includes('Menu.setApplicationMenu(null)'), 'Case AO: Menu.setApplicationMenu(null) suppresses default menu');
    assertTest(mainSrc.includes('app.isPackaged') && mainSrc.includes("input.key === 'F12'"), 'Case AO2: Packaged mode intercepts and blocks F12 DevTools');
    assertTest(mainSrc.includes("startsWith('/abhishek01032007-pixel/Nexora-Skills-Manager')"), 'Case AO3: setWindowOpenHandler allows repository and release links');
    assertTest(mainSrc.includes("nodeIntegration: false"), 'Case AO4: nodeIntegration disabled in main.js');
    assertTest(mainSrc.includes("contextIsolation: true"), 'Case AO5: contextIsolation enabled in main.js');
    assertTest(mainSrc.includes("sandbox: true"), 'Case AO6: sandbox enabled in main.js');

    // -------------------------------------------------------------------------
    // CATEGORY H: UpdateProgressModal Default Parameter Sanitization
    // -------------------------------------------------------------------------
    const modalHtml = UpdateProgressModal.renderProjectLifecycleDialog();
    assertTest(!modalHtml.includes('Academic Day Hub'), 'Case AP1: UpdateProgressModal default renders zero mock project names');
    assertTest(!modalHtml.includes('D:\\Projects\\academic_day_hub'), 'Case AP2: UpdateProgressModal default renders zero hardcoded mock paths');

    // -------------------------------------------------------------------------
    // CATEGORY I: Bridge Security & Architecture Invariants
    // -------------------------------------------------------------------------
    assertTest(Object.keys(OPERATIONS).length === 29, 'Case AL: Bridge operations count strictly frozen at 29');
    assertTest(!renderedHtml.includes('require(') && !renderedHtml.includes('process.'), 'Case AM: Zero raw Node/system APIs in renderer');
    assertTest(!renderedHtml.includes('shell.openExternal'), 'Case AN: Zero shell.openExternal calls exposed directly in renderer templates');

    // -------------------------------------------------------------------------
    // CATEGORY J: Graceful Error & Fallback Rendering
    // -------------------------------------------------------------------------
    const emptyContext = { isLiveMode: false, state: null };
    const emptyHtml = SettingsAboutScreen.render(emptyContext);
    assertTest(emptyHtml.includes('Nexora Skills Manager') && emptyHtml.includes('v1.0.0'), 'Case AA: Settings renders gracefully with fallback context');

    // -------------------------------------------------------------------------
    // CATEGORY K: Legacy Brand Absence & Domain Language
    // -------------------------------------------------------------------------
    assertTest(!renderedHtml.includes('Antigravity Pro Max Skill'), 'Case AH: Zero legacy full product brand name in UI');
    assertTest(renderedHtml.includes('Google Antigravity') && renderedHtml.includes('Cursor') && renderedHtml.includes('GitHub Copilot'), 'Case AI: Exact three supported AI platform names rendered');

    console.log(`\n=== Phase 9.2 Settings & About Suite: ${passed} Passed, ${failed} Failed ===\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running Settings & About tests:', err);
    process.exit(1);
  }
}

runTests();
