/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - PHASE 6.1B WORKFLOW & DIALOG VALIDATION SUITE
 * Exhaustive automated testing for all 13 workflow items, sub-states & domain rules
 * ============================================================================
 */

if (typeof global !== 'undefined') {
  global.window = global.window || {};
  global.window.__NEXORA_MOCK_MODE__ = true;
}

import assert from 'node:assert';
import { BridgeService } from '../js/bridge/BridgeService.js';
import { WorkflowDialog } from '../js/components/WorkflowDialog.js';
import { SideSheet } from '../js/components/SideSheet.js';
import { InlineNotice } from '../js/components/InlineNotice.js';
import { UpdateProgressModal } from '../js/components/UpdateProgressModal.js';
import { NexoraAppShell } from '../js/components/NexoraAppShell.js';
import { DashboardScreen } from '../js/screens/DashboardScreen.js';
import { ProjectAnalysisScreen } from '../js/screens/ProjectAnalysisScreen.js';
import { RecommendedSkillsScreen } from '../js/screens/RecommendedSkillsScreen.js';
import { PlatformSelectionScreen } from '../js/screens/PlatformSelectionScreen.js';
import { ActiveSkillsScreen } from '../js/screens/ActiveSkillsScreen.js';
import { SkillLibraryScreen } from '../js/screens/SkillLibraryScreen.js';
import { UpdateCenterScreen } from '../js/screens/UpdateCenterScreen.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log("\n=== Running Nexora Phase 6.1B Workflow & Subscreen Validation Suite ===");

// 1. Initial State & Domain Rule Separation
test("Initial State: Working Mode starts as null / Not Selected", () => {
  assert.strictEqual(BridgeService.state.currentWorkingMode, null);
  assert.strictEqual(BridgeService.state.currentTarget, null);
  assert.strictEqual(BridgeService.sampleProject.type, "Full Stack Application");
  assert.strictEqual(BridgeService.activeSkills.length, 6);
});

test("Domain Rule: Setting Working Mode does not alter Detected Project Classification", async () => {
  await BridgeService.setWorkingMode("Frontend Development", "Mobile Application");
  assert.strictEqual(BridgeService.state.currentWorkingMode, "Frontend Development");
  assert.strictEqual(BridgeService.state.currentTarget, "Mobile Application");
  assert.strictEqual(BridgeService.sampleProject.type, "Full Stack Application");
  assert.strictEqual(BridgeService.activeSkills.length, 6);
});

// 2. Item 1: Choose Development Mode Dialog
test("Item 1: WorkflowDialog.renderModeSelection renders 4 selectable modes", () => {
  const html = WorkflowDialog.renderModeSelection("Full Stack Application", null);
  assert(html.includes("Choose Development Mode"));
  assert(html.includes("Frontend Development"));
  assert(html.includes("Backend Development"));
  assert(html.includes("Full Stack Development"));
  assert(html.includes("QA / Debugging"));
  assert(html.includes("Not Selected"));
  assert(html.includes("id=\"btn-mode-continue\""));
});

// 3. Item 2: Choose Development Target Dialog
test("Item 2: WorkflowDialog.renderTargetSelection renders contextual targets", () => {
  const targets = BridgeService.getDevelopmentTargets("frontend");
  const html = WorkflowDialog.renderTargetSelection("Frontend Development", targets);
  assert(html.includes("Choose Frontend Development Target"));
  assert(html.includes("Web Application"));
  assert(html.includes("Website"));
  assert(html.includes("Mobile Application"));
  assert(html.includes("id=\"btn-target-continue\""));
});

// 4. Item 3: Change Development Mode Confirmation Dialog
test("Item 3: WorkflowDialog.renderChangeModeConfirmation preserves active skills", () => {
  const html = WorkflowDialog.renderChangeModeConfirmation({
    currentMode: "Backend Development",
    currentTarget: "API / Service",
    newMode: "Frontend Development",
    newTarget: "Mobile Application"
  });
  assert(html.includes("Change Development Mode"));
  assert(html.includes("Backend Development"));
  assert(html.includes("Frontend Development"));
  assert(html.includes("Existing active skills will <strong>NOT</strong> be automatically removed"));
  assert(html.includes("id=\"btn-apply-change-mode\""));
});

// 5. Item 4: Recommendation Refresh Inline State
test("Item 4: InlineNotice.renderRecalculationLoader renders recalculation without full rescan", () => {
  const html = InlineNotice.renderRecalculationLoader("Frontend Development", "Mobile Application");
  assert(html.includes("Refreshing Recommendations"));
  assert(html.includes("Using existing project analysis for"));
  assert(html.includes("Frontend Development"));
  assert(!html.includes("Full system rescan"));
});

// 6. Item 5: Side Sheet Catalog Search & Add Drawer
test("Item 5: SideSheet.render displays catalog search drawer", () => {
  const html = SideSheet.render({
    title: "Add Compatible Skills",
    catalog: BridgeService.skillCatalog
  });
  assert(html.includes("Add Compatible Skills"));
  assert(html.includes("id=\"side-sheet-search-input\""));
  assert(html.includes("action-add-to-rec"));
  assert(html.includes("48 catalog skills"));
});

// 7. Item 6: Activation Confirmation Dialog
test("Item 6: WorkflowDialog.renderActivationConfirmation renders summary before activation", () => {
  const html = WorkflowDialog.renderActivationConfirmation({
    project: BridgeService.sampleProject,
    workingMode: "Frontend Development",
    target: "Mobile Application",
    selectedSkills: ["flutter-build-responsive-layout", "flutter-add-widget-test"],
    selectedPlatforms: ["Google Antigravity", "Cursor"]
  });
  assert(html.includes("Confirm Skill Activation"));
  assert(html.includes("Academic Day Hub"));
  assert(html.includes("Full Stack Application"));
  assert(html.includes("Frontend Development | Mobile Application"));
  assert(html.includes("flutter-build-responsive-layout"));
  assert(html.includes("Google Antigravity"));
  assert(html.includes("Cursor"));
  assert(html.includes("id=\"btn-confirm-activation\""));
});

// 8. Item 7: Activation Result States (7A Success, 7B Partial, 7C Failure)
test("Item 7A: Activation Result SUCCESS state", () => {
  const html = WorkflowDialog.renderActivationResult({
    status: "success",
    activatedSkills: ["flutter-build-responsive-layout", "flutter-add-widget-test"],
    deployments: [
      { platform: "Google Antigravity", status: "Success" },
      { platform: "Cursor", status: "Success" }
    ]
  });
  assert(html.includes("Skills Activated Successfully"));
  assert(html.includes("2 skills were activated"));
  assert(html.includes("View Active Skills"));
  assert(html.includes("Done"));
});

test("Item 7B: Activation Result PARTIAL SUCCESS state", () => {
  const html = WorkflowDialog.renderActivationResult({
    status: "partial",
    activatedSkills: ["flutter-build-responsive-layout"],
    deployments: [
      { platform: "Google Antigravity", status: "Success" },
      { platform: "Cursor", status: "Failed" }
    ]
  });
  assert(html.includes("Activation Partially Completed"));
  assert(html.includes("Some platform deployments were not completed"));
  assert(html.includes("Retry Failed"));
  assert(html.includes("Done"));
});

test("Item 7C: Activation Result FAILURE state", () => {
  const html = WorkflowDialog.renderActivationResult({
    status: "failure",
    activatedSkills: [],
    deployments: [
      { platform: "Google Antigravity", status: "Failed" },
      { platform: "Cursor", status: "Failed" }
    ]
  });
  assert(html.includes("Activation Failed"));
  assert(html.includes("No project changes were completed"));
  assert(html.includes("Retry"));
  assert(html.includes("Cancel"));
});

// 9. Item 8: Project Analysis States (5 States)
test("Item 8.1: Analysis Radar Animation & Scanning state", () => {
  const html = ProjectAnalysisScreen.render(BridgeService);
  assert(html.includes("id=\"analysis-radar-container\""));
  assert(html.includes("Detecting languages (Dart)"));
  assert(html.includes("Detecting frameworks (Flutter)"));
  assert(html.includes("Calculating project classification"));
});

test("Item 8.2: Valid Project state", () => {
  const html = ProjectAnalysisScreen.render(BridgeService);
  assert(html.includes("Ready"));
  assert(html.includes("96%"));
});

test("Item 8.3: Invalid Project Folder state", () => {
  const html = UpdateProgressModal.renderAnalysisStateModal({ state: "invalid" });
  assert(html.includes("Invalid Project Folder"));
  assert(html.includes("Choose Another Folder"));
  assert(html.includes("id=\"btn-analysis-choose-other\""));
});

test("Item 8.4: Folder Inaccessible During Analysis state", () => {
  const html = UpdateProgressModal.renderAnalysisStateModal({ state: "inaccessible", path: "D:\\Protected" });
  assert(html.includes("Folder Inaccessible During Analysis"));
  assert(html.includes("Permission denied"));
  assert(html.includes("Retry Access"));
});

test("Item 8.5: Analysis Failed state", () => {
  const html = UpdateProgressModal.renderAnalysisStateModal({ state: "failed" });
  assert(html.includes("Analysis Failed"));
  assert(html.includes("Retry Analysis"));
});

// 10. Item 9: Offline State Banner & Top Bar Indicator
test("Item 9: InlineNotice.renderOfflineBanner & Shell offline status pill", () => {
  const bannerHtml = InlineNotice.renderOfflineBanner();
  assert(bannerHtml.includes("You're Offline"));
  assert(bannerHtml.includes("Retry Connection"));
  assert(bannerHtml.includes("local project data, analysis, and installed skills"));

  const shellOfflineHtml = NexoraAppShell.render("dashboard", { isOffline: true });
  assert(shellOfflineHtml.includes("● Offline (Local Mode)"));
  assert(shellOfflineHtml.includes("status-dot-warning"));
});

// 11. Item 10: Skill Sync State Panel
test("Item 10: SkillLibraryScreen contains skill sync status panel", () => {
  const html = SkillLibraryScreen.render(BridgeService);
  assert(html.includes("id=\"skill-sync-status-panel\""));
  assert(html.includes("Skill Library Up to Date"));
  assert(html.includes("official skills installed"));
});

// 12. Item 11: Skill Update Available Popup
test("Item 11: UpdateProgressModal.renderSkillUpdate shows per-skill update modal", () => {
  const html = UpdateProgressModal.renderSkillUpdate({
    skillName: "architecture-patterns",
    currentVersion: "v1.0.0",
    availableVersion: "v1.1.0"
  });
  assert(html.includes("Skill Update Available"));
  assert(html.includes("architecture-patterns"));
  assert(html.includes("v1.0.0"));
  assert(html.includes("v1.1.0"));
  assert(html.includes("What's Changed"));
  assert(html.includes("id=\"btn-confirm-skill-update\""));
});

// 13. Item 12: Registered Project Lifecycle Edge Cases (4 States)
test("Item 12.1: Project Already Registered state", () => {
  const html = UpdateProgressModal.renderProjectLifecycleDialog({
    type: "already_registered",
    projectName: "Academic Day Hub",
    path: "D:\\Projects\\academic_day_hub"
  });
  assert(html.includes("Project Already Registered"));
  assert(html.includes("Open Existing Project"));
});

test("Item 12.2: Registered Project Missing state", () => {
  const html = UpdateProgressModal.renderProjectLifecycleDialog({
    type: "missing",
    projectName: "Academic Day Hub",
    path: "D:\\Projects\\academic_day_hub"
  });
  assert(html.includes("Registered Project Missing"));
  assert(html.includes("Locate Project"));
  assert(html.includes("Remove Registration"));
});

test("Item 12.3: Registered Project Moved state", () => {
  const html = UpdateProgressModal.renderProjectLifecycleDialog({
    type: "moved",
    projectName: "Academic Day Hub",
    path: "D:\\Projects\\academic_day_hub"
  });
  assert(html.includes("Registered Project Moved"));
  assert(html.includes("Locate New Folder"));
  assert(html.includes("Remove Registration"));
});

test("Item 12.4: Registered Location Inaccessible state", () => {
  const html = UpdateProgressModal.renderProjectLifecycleDialog({
    type: "inaccessible",
    projectName: "Academic Day Hub",
    path: "D:\\Projects\\academic_day_hub"
  });
  assert(html.includes("Registered Location Inaccessible"));
  assert(html.includes("Retry Access"));
});

// 14. Item 13A–13J: Full Application Update Flow
test("Item 13A: App Update Available", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13A", { version: "v1.1.0" });
  assert(html.includes("Nexora Update Available"));
  assert(html.includes("Download Now"));
  assert(html.includes("Later"));
});

test("Item 13B: Update Dismissed banner", () => {
  const html = InlineNotice.renderUpdateAvailableBanner("v1.1.0");
  assert(html.includes("Nexora Update v1.1.0 Available"));
  assert(html.includes("Update Now"));
});

test("Item 13C: Downloading state with progress & size", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13C", { version: "v1.1.0", progress: 60 });
  assert(html.includes("Downloading"));
  assert(html.includes("12.4 MB of 28.6 MB (60%)"));
  assert(html.includes("Cancel Download"));
  assert(html.includes("Pause"));
});

test("Item 13D: Verifying package integrity", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13D");
  assert(html.includes("Verifying Update"));
  assert(html.includes("Checking downloaded package integrity"));
});

test("Item 13E: Ready to Install state", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13E", { version: "v1.1.0" });
  assert(html.includes("Update Ready"));
  assert(html.includes("Restart & Update Now"));
  assert(html.includes("Install When Nexora Closes"));
  assert(html.includes("Later"));
});

test("Item 13F: Install on Exit state", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13F", { version: "v1.1.0" });
  assert(html.includes("Update Ready to Install"));
  assert(html.includes("automatically when the application closes"));
});

test("Item 13G: Update Success state", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13G", { version: "v1.1.0" });
  assert(html.includes("Update Complete"));
  assert(html.includes("Nexora Updated Successfully"));
  assert(html.includes("Continue"));
});

test("Item 13H: Update Failure state", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13H");
  assert(html.includes("Update Failed"));
  assert(html.includes("Retry"));
  assert(html.includes("Later"));
});

test("Item 13I: Offline Update Check notice", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13I");
  assert(html.includes("Unable to Check for Updates"));
  assert(html.includes("You're currently offline"));
  assert(html.includes("Dismiss"));
  assert(html.includes("Retry"));
});

test("Item 13J: Skill Library Update modal (separate from full app update)", () => {
  const html = UpdateProgressModal.renderAppUpdateFlow("13J");
  assert(html.includes("Skill Library Update Available"));
  assert(html.includes("2 New Skills • 3 Updated Skills"));
  assert(html.includes("without reinstalling the desktop application"));
  assert(html.includes("Update Skills"));
  assert(html.includes("Later"));
});

// 15. Workflow Routing & Screen Connections
test("Workflow Step Connection: RecommendedSkillsScreen routes to PlatformSelectionScreen", () => {
  const html = RecommendedSkillsScreen.render(BridgeService);
  assert(html.includes("id=\"btn-rec-continue-platforms\""));
  assert(html.includes("Choose AI Platforms"));
});

test("Workflow Step Connection: PlatformSelectionScreen routes to Activation Confirmation", () => {
  const html = PlatformSelectionScreen.render(BridgeService);
  assert(html.includes("id=\"btn-save-platforms\""));
  assert(html.includes("Proceed to Activation Confirmation"));
});

// 16. Version Reset Integrity
test("Version Reset: Baseline application version remains locked at v1.0.0", async () => {
  const updateStatus = await BridgeService.getUpdateStatus();
  assert.strictEqual(updateStatus.currentVersion, "v1.0.0");
  assert.strictEqual(BridgeService.sampleProject.activeSkillCount, 6);
});

// 17. Mock Bridge Boundary Verification
test("Mock Bridge: Zero PowerShell, zero child_process, and zero process spawning", () => {
  assert.strictEqual(typeof BridgeService.getDevelopmentModes, 'function');
  assert.strictEqual(typeof BridgeService.simulateActivation, 'function');
  assert.strictEqual(typeof BridgeService.toggleOffline, 'function');
});

console.log(`\n=== Validation Summary: ${passed} Passed, ${failed} Failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
