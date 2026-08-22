/**
 * ui-screen-validation.js - Automated Test Suite for Phase 6.1A UI Screens
 */
if (typeof global !== 'undefined') {
  global.window = global.window || {};
  global.window.__NEXORA_MOCK_MODE__ = true;
}
import { BridgeService } from '../js/bridge/BridgeService.js';
import { NexoraAppShell } from '../js/components/NexoraAppShell.js';
import { ConfirmationDialog } from '../js/components/ConfirmationDialog.js';

// Screens
import { StartupScreen } from '../js/screens/StartupScreen.js';
import { DashboardScreen } from '../js/screens/DashboardScreen.js';
import { RecommendedSkillsScreen } from '../js/screens/RecommendedSkillsScreen.js';
import { ProjectAnalysisScreen } from '../js/screens/ProjectAnalysisScreen.js';
import { ActiveSkillsScreen } from '../js/screens/ActiveSkillsScreen.js';
import { SkillLibraryScreen } from '../js/screens/SkillLibraryScreen.js';
import { SkillDetailScreen } from '../js/screens/SkillDetailScreen.js';
import { CrossProjectUsageScreen } from '../js/screens/CrossProjectUsageScreen.js';
import { AddProjectScreen } from '../js/screens/AddProjectScreen.js';
import { PlatformSelectionScreen } from '../js/screens/PlatformSelectionScreen.js';
import { RecentActivityScreen } from '../js/screens/RecentActivityScreen.js';
import { SystemHealthScreen } from '../js/screens/SystemHealthScreen.js';
import { UpdateCenterScreen } from '../js/screens/UpdateCenterScreen.js';

console.log("=== Running Nexora Phase 6.1A UI Screen Validation Suite ===");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    totalFailed++;
  }
}

// 1. Shell Validation
const shellHtml = NexoraAppShell.render("dashboard");
assert(shellHtml.includes("240px") || shellHtml.includes("sidebar"), "Shell contains sidebar");
assert(shellHtml.includes("Nexora"), "Shell contains Nexora brand title");
assert(shellHtml.includes("v1.0.0"), "Shell contains v1.0.0 brand version");
assert(shellHtml.includes("Healthy | Up to date"), "Top bar contains Healthy | Up to date status");
assert(shellHtml.includes("Dashboard") && shellHtml.includes("Projects") && shellHtml.includes("Skills"), "Shell contains required navigation items");

// 2. Screen 1: Startup / Loading
const startupHtml = StartupScreen.render();
assert(startupHtml.includes("Initializing Nexora Desktop Core"), "Screen 1: Startup renders initialization state");
assert(startupHtml.includes("Enter Dashboard"), "Screen 1: Startup contains Enter Dashboard button");

// 3. Screen 2: Dashboard
const dashHtml = DashboardScreen.render(BridgeService);
assert(dashHtml.includes("Academic Day Hub"), "Screen 2: Dashboard contains Academic Day Hub");
assert(dashHtml.includes("96%"), "Screen 2: Dashboard contains 96% confidence score");
assert(dashHtml.includes("Total Active") && dashHtml.includes("6"), "Screen 2: Dashboard contains exactly 6 active skills");
assert(dashHtml.includes("Supabase") && dashHtml.includes("PostgreSQL"), "Screen 2: Dashboard contains detected Supabase & PostgreSQL stack");
assert(!dashHtml.includes("Firebase"), "Screen 2: Dashboard correctly excludes Firebase for sample");

// 4. Screen 3: Recommended Skills
const recHtml = RecommendedSkillsScreen.render(BridgeService);
assert(recHtml.includes("Recommended Skills for Academic Day Hub"), "Screen 3: Recommended Skills header rendered");
assert(recHtml.includes("flutter-build-responsive-layout"), "Screen 3: Recommended Skills contains responsive layout skill");
assert(recHtml.includes("Activate Selected"), "Screen 3: Contains Activate Selected CTA");

// 5. Screen 4: Project Analysis
const analysisHtml = ProjectAnalysisScreen.render(BridgeService);
assert(analysisHtml.includes("Project Analysis: Academic Day Hub"), "Screen 4: Project Analysis title rendered");
assert(analysisHtml.includes("Dart") && analysisHtml.includes("Flutter"), "Screen 4: Stack breakdown contains Dart/Flutter");
assert(analysisHtml.includes("pubspec.yaml"), "Screen 4: Markers found contains pubspec.yaml");

// 6. Screen 5: Active Skills
const activeHtml = ActiveSkillsScreen.render(BridgeService);
assert(activeHtml.includes("Showing 1–6 of 6 skills"), "Screen 5: Active Skills footer shows 1-6 of 6 skills");
assert(activeHtml.includes("Deactivate") && activeHtml.includes("View Details") && activeHtml.includes("Update"), "Screen 5: Active Skills table contains all 3 required actions");

// 7. Screen 6: Skill Library
const libraryHtml = SkillLibraryScreen.render(BridgeService);
assert(libraryHtml.includes("48 Skills Available"), "Screen 6: Skill Library contains 48 skills");
assert(libraryHtml.includes("Search skills"), "Screen 6: Skill Library contains search input");

// 8. Screen 7: Skill Detail View
const detailHtml = SkillDetailScreen.render(BridgeService, { skillId: "flutter-build-responsive-layout" });
assert(detailHtml.includes("Flutter Responsive Layout"), "Screen 7: Skill Detail title rendered");
assert(detailHtml.includes("Overview & Purpose"), "Screen 7: Contains Overview & Purpose");
assert(detailHtml.includes("Supported AI Platforms"), "Screen 7: Contains Supported AI Platforms");
assert(!detailHtml.includes("changelog") && !detailHtml.includes("triggers"), "Screen 7: Excludes invented backend fields");

// 9. Screen 8: Cross-Project Skill Usage
const crossHtml = CrossProjectUsageScreen.render(BridgeService);
assert(crossHtml.includes("Cross-Project Usage"), "Screen 8: Cross-Project title rendered");
assert(crossHtml.includes("Remove From All Projects"), "Screen 8: Contains Remove From All Projects trigger");

// 10. Screen 9: Deactivate Skill Confirmation
const deactModal = ConfirmationDialog.render({
  title: "Deactivate Skill",
  message: "Are you sure?",
  skillId: "flutter-build-responsive-layout",
  projectName: "Academic Day Hub",
  isDestructive: true
});
assert(deactModal.includes("Deactivate Skill"), "Screen 9: Modal title rendered");
assert(deactModal.includes("flutter-build-responsive-layout"), "Screen 9: Shows target skill ID");
assert(!deactModal.includes("snapshot_"), "Screen 9: Excludes raw snapshot IDs");

// 11. Screen 10: Remove Skill From All Projects Confirmation
const removeAllModal = ConfirmationDialog.render({
  title: "Remove Skill From All Projects",
  message: "Destructive action",
  skillId: "flutter-build-responsive-layout",
  projectCount: 3,
  projectList: BridgeService.allProjects,
  isDestructive: true
});
assert(removeAllModal.includes("Remove Skill From All Projects"), "Screen 10: Modal title rendered");
assert(removeAllModal.includes("Affected Projects (3)"), "Screen 10: Shows affected project count");
assert(!removeAllModal.includes("token"), "Screen 10: Excludes confirmation token display");

// 12. Screen 11: Add Project
const addHtml = AddProjectScreen.render();
assert(addHtml.includes("Add Project to Nexora"), "Screen 11: Add Project title rendered");
assert(addHtml.includes("D:\\Projects\\academic_day_hub"), "Screen 11: Contains default directory path");
assert(addHtml.includes("Add & Analyze Project"), "Screen 11: Contains Add & Analyze Project button");
assert(!addHtml.includes("custom project name"), "Screen 11: Excludes custom project name input");

// 13. Screen 12: AI Platform Selection
const platHtml = PlatformSelectionScreen.render(BridgeService);
assert(platHtml.includes("Google Antigravity"), "Screen 12: Contains Google Antigravity");
assert(platHtml.includes("Cursor") && platHtml.includes("GitHub Copilot"), "Screen 12: Contains Cursor and Copilot");
assert(!platHtml.includes("Flutter as platform"), "Screen 12: Excludes unsupported platforms");

// 14. Screen 13: Recent Activity
const actHtml = RecentActivityScreen.render(BridgeService);
assert(actHtml.includes("Recent Activity"), "Screen 13: Title rendered");
assert(actHtml.includes("Project added: Academic Day Hub"), "Screen 13: Contains human-readable project added log");
assert(actHtml.includes("Nexora Doctor completed"), "Screen 13: Contains human-readable doctor log");
assert(!actHtml.includes("SKILLS_ACTIVATED"), "Screen 13: Excludes raw event enums");

// 15. Screen 14: System Health / Maintenance / Doctor
const healthHtml = SystemHealthScreen.render(BridgeService);
assert(healthHtml.includes("System Health & Maintenance"), "Screen 14: Title rendered");
assert(healthHtml.includes("Core Engine") && healthHtml.includes("Platform Adapters"), "Screen 14: Contains required health checks");
assert(healthHtml.includes("Run Doctor") && healthHtml.includes("Repair") && healthHtml.includes("Refresh"), "Screen 14: Contains all 3 distinct action buttons");

// 16. Screen 15: Update Center
const updateHtml = UpdateCenterScreen.render(BridgeService);
assert(updateHtml.includes("Update Center"), "Screen 15: Title rendered");
assert(updateHtml.includes("Nexora Skills Manager v1.0.0"), "Screen 15: Shows current version");
assert(!updateHtml.includes("Channel: Stable"), "Screen 15: Excludes update channel selector");

console.log(`\n=== Validation Summary: ${totalPassed} Passed, ${totalFailed} Failed ===`);
if (totalFailed > 0) {
  process.exit(1);
}
