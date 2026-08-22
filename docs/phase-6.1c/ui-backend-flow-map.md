# Nexora Skills Manager — 21 Backend Flows Integration Map (Phase 6.1C Corrected)

This document maps all 21 desktop application user flows from the UI trigger through the Bridge layer down to the underlying Phase 5 PowerShell engine services and back.

---

## Flow 1: Application Startup
- **UI Trigger**: User launches Nexora Desktop app (`StartupScreen.js`).
- **Bridge Operation**: `bridge.startup()`
- **Application Service Function**: `Initialize-NexoraApplicationState`
- **Underlying Service(s)**: `Resolve-NexoraInstalledRuntimePath`, `Get-NexoraManagedProjects`, `Get-NexoraApplicationUpdateStatus`, `StatusManager.ps1`
- **Structured Result**: `ApplicationStatus` object containing `engineStatus: "ready"`, `runtimePath`, `engineHealthy: true`, `projectCount`, `projects`, `updateStatus`.
- **UI Success State**: Transition to `DashboardScreen.js` with active project carousel.
- **UI Error State**: Display startup diagnostic warning overlay with Retry CTA.

---

## Flow 2: Application Initialization & Heartbeat
- **UI Trigger**: App lifecycle polling or status bar render.
- **Bridge Operation**: `bridge.getApplicationStatus()`
- **Application Service Function**: `Get-NexoraApplicationStatus`
- **Underlying Service(s)**: `StatusManager.ps1` (`Get-NexoraSystemStatus`)
- **Structured Result**: `{ engineStatus: "ready", operationState: "idle", currentProjectId, activeSkillsCount, lastError }`
- **UI Success State**: Top status bar displays `● Healthy | Up to date` (32px).
- **UI Error State**: Top status bar switches to `● Error` or `● Degraded`.

---

## Flow 3: Managed Project List Retrieval
- **UI Trigger**: Dashboard load, project carousel render, or project switcher click.
- **Bridge Operation**: `bridge.listProjects()`
- **Application Service Function**: `Get-NexoraApplicationProjects`
- **Underlying Service(s)**: `ProjectRegistryService.ps1` (`Get-NexoraManagedProjects`)
- **Structured Result**: Array of `ProjectSummary` `{ id, name, path, primaryType, developmentMode, pathExists, activeSkillCount }`.
- **UI Success State**: Project carousel cards populated; active card highlighted.
- **UI Error State**: Empty state card displayed with `+ Add Project` CTA.

---

## Flow 4: Add / Register Project
- **UI Trigger**: Click `Add & Analyze Project` in `AddProjectScreen.js`.
- **Bridge Operation**: `bridge.addProject(path)` *(Clean single-parameter contract; name and autoAnalyze are backend-defaulted)*
- **Application Service Function**: `Add-NexoraApplicationProject -Path $path -AutoAnalyze:$true`
- **Underlying Service(s)**: `ProjectRegistryService.ps1` (`Add-NexoraManagedProject`), `ProjectDetector.ps1`, `ProjectMemory.ps1`
- **Structured Result**: `{ success: true, projectId: "proj_...", project: { ... } }`
- **UI Success State**: Toast notification *"Project added and analyzed successfully"*; routes to `ProjectAnalysisScreen.js`.
- **UI Error State**: Displays Item 12 Edge Case modal (`Project Already Registered` or `Folder Inaccessible`).

---

## Flow 5: Project Folder Validation
- **UI Trigger**: Entering/pasting path or browsing folder in `AddProjectScreen.js`.
- **Bridge Operation**: `bridge.validatePath(path)`
- **Application Service Function**: `Get-NexoraCanonicalPath` + `Test-Path`
- **Underlying Service(s)**: `PathUtils.ps1`
- **Structured Result**: `{ valid: true, canonicalPath: "D:\\Projects\\...", exists: true }`
- **UI Success State**: Green check badge displayed in Project Preview card.
- **UI Error State**: Inline warning: *"This folder does not exist or is inaccessible."*

---

## Flow 6: Project Analysis & Scanning
- **UI Trigger**: Click `Analyze Project` or `Re-Scan Project` on `ProjectAnalysisScreen.js`.
- **Bridge Operation**: `bridge.analyzeProject(projectId)`
- **Application Service Function**: `Invoke-NexoraApplicationAnalyze`
- **Underlying Service(s)**: `ProjectDetector.ps1` (`Invoke-NexoraProjectScan`), `ProjectClassification.ps1`, `ProjectMemory.ps1` (`Save-NexoraAnalysis`)
- **Structured Result**: `{ success: true, projectRoot, projectId, analysis: { projectType, confidenceScores, languages, frontend, backend, database, qa, tooling, markersFound }, recommendations: [...] }`
- **UI Success State**: Analysis radar finishes; 96% confidence ring and tech pills updated.
- **UI Error State**: Displays Item 8 `Analysis Failed` modal with `Retry Analysis` CTA.

---

## Flow 7: Project Profile Retrieval
- **UI Trigger**: Navigating to `ProjectAnalysisScreen.js` or `DashboardScreen.js`.
- **Bridge Operation**: `bridge.getProjectProfile(projectId)`
- **Application Service Function**: `Get-NexoraApplicationProjectProfile`
- **Underlying Service(s)**: `ProjectMemory.ps1` (`project.json`, `analysis.json`, `skills.json`, `history.json`)
- **Structured Result**: `{ success: true, project, metadata, analysis, skills, history }`
- **UI Success State**: Project breakdown, active skill count, and filesystem markers rendered.
- **UI Error State**: Displays Item 12 `Registered Project Missing` modal (`Locate Project`, `Remove Registration`).

---

## Flow 8: Development Working-Mode Selection
- **UI Trigger**: Click `Choose Mode` / `Change Working Mode` in Dashboard / Analysis view.
- **Bridge Operation**: `bridge.setWorkingContext(projectId, modeTitle, null)`
- **Application Service Function**: `Set-NexoraProjectWorkingContext` *(Phase 6.2 Contract — `PROJECT_PERSISTED`)*
- **Underlying Service(s)**: `ProjectMemory.ps1` (`workingContext` in `.nexora/project.json`)
- **Structured Result**: `{ success: true, workingMode: "Frontend Development", target: null }`
- **UI Success State**: Advances wizard to Step 2 (Target Selection Dialog).
- **UI Error State**: Reverts mode selection and displays error toast.

---

## Flow 9: Development Target Selection
- **UI Trigger**: Select contextual target chip and click `Apply & Refresh Recommendations`.
- **Bridge Operation**: `bridge.setWorkingContext(projectId, modeTitle, targetName)`
- **Application Service Function**: `Set-NexoraProjectWorkingContext` *(Phase 6.2 Contract — `PROJECT_PERSISTED`)*
- **Underlying Service(s)**: `ProjectMemory.ps1` (`workingContext` in `.nexora/project.json`)
- **Structured Result**: `{ success: true, workingMode: "Frontend Development", target: "Mobile Application" }`
- **UI Success State**: Closes modal, renders inline recalculation overlay, routes to `RecommendedSkillsScreen.js`.
- **UI Error State**: Displays error notification and stays on target selection.

---

## Flow 10: Recommendation Refresh & Recalculation
- **UI Trigger**: Mode/target applied or manual `Refresh Recommendations` trigger.
- **Bridge Operation**: `bridge.getRecommendations(projectId, { workingMode, target })`
- **Application Service Function**: `Get-NexoraSkillRecommendations` *(Extended for context scoring)*
- **Underlying Service(s)**: `RecommendationEngine.ps1`, `GlobalSkillRegistry.ps1`
- **Structured Result**: Array of `Recommendation` objects `{ skillId, name, matchScore, reason, category, preselected }`.
- **UI Success State**: Recommended skill cards rendered with match scores and preselection flags.
- **UI Error State**: Displays empty recommendations fallback with `Add Compatible Skills` CTA.

---

## Flow 11: Available Universal Skills Retrieval
- **UI Trigger**: Navigating to `SkillLibraryScreen.js` or opening `SideSheet.js` drawer.
- **Bridge Operation**: `bridge.getSkillCatalog()`
- **Application Service Function**: `Get-NexoraApplicationAvailableSkills`
- **Underlying Service(s)**: `GlobalSkillRegistry.ps1` (`Get-NexoraGlobalRegistry`)
- **Structured Result**: Array of 48 skill items `{ id, name, category, version, path, pack }`.
- **UI Success State**: 48-skill 3-column grid and category filters rendered.
- **UI Error State**: Displays *"Skill library unavailable; run Doctor to verify catalog integrity."*

---

## Flow 12: Active Skills Retrieval
- **UI Trigger**: Navigating to `ActiveSkillsScreen.js` or loading dashboard active count.
- **Bridge Operation**: `bridge.getActiveSkills(projectId)`
- **Application Service Function**: `Get-NexoraApplicationActiveSkills`
- **Underlying Service(s)**: `ProjectMemory.ps1` (`Get-NexoraProjectSkills`)
- **Structured Result**: Array of active skill descriptors with versions and deployed platforms.
- **UI Success State**: Active skills table populated (`Showing 1–6 of 6 skills`).
- **UI Error State**: Empty state message: *"No active skills configured for this project."*

---

## Flow 13: Skill Activation
- **UI Trigger**: Confirming activation in `WorkflowDialog.renderActivationConfirmation`.
- **Bridge Operation**: `bridge.activateSkills(projectId, skillIds, platforms)` *(Carries explicitly confirmed platforms)*
- **Application Service Function**: `Invoke-NexoraApplicationActivateSkills`
- **Underlying Service(s)**: `SkillActivationService.ps1`, `PlatformAdapter.ps1`, `ProjectMemory.ps1`
- **Structured Result**: `{ success: true, status: "success|partial|failure", activatedCount, deployedSkills, deployments: [{ platform, status, errors }] }`
- **UI Success State**: Displays Item 7 `Skills Activated Successfully` modal; routes to `ActiveSkillsScreen.js`.
- **UI Error State**: Displays Item 7 `Activation Failed` or `Activation Partially Completed` modal with `Retry Failed`.

---

## Flow 14: Skill Deactivation
- **UI Trigger**: Confirming deactivation in `ConfirmationDialog.js`.
- **Bridge Operation**: `bridge.deactivateSkill(projectId, skillId, platforms)`
- **Application Service Function**: `Invoke-NexoraApplicationDeactivateSkill`
- **Underlying Service(s)**: `SkillRemovalService.ps1`, `PlatformAdapter.ps1`, `ProjectMemory.ps1` (`snapshots/`, `history.json`)
- **Structured Result**: `{ success: true, skillId, snapshotPath, undeployments: [...] }`
- **UI Success State**: Table row removed with toast: *"Skill '...' deactivated from Academic Day Hub"*.
- **UI Error State**: Destructive error toast with *"Deactivation rollback restored."*

---

## Flow 15: Cross-Project Skill Usage Matrix
- **UI Trigger**: Navigating to `CrossProjectUsageScreen.js` or inspecting shared skill.
- **Bridge Operation**: `bridge.getSkillUsage(skillId)`
- **Application Service Function**: `Get-NexoraApplicationSkillUsage`
- **Underlying Service(s)**: `MultiProjectOrchestrator.ps1` (`Get-NexoraCrossProjectSkillUsage`)
- **Structured Result**: Array of projects `{ id, name, path }` currently using the skill.
- **UI Success State**: Matrix grid populated with project badges and global removal button.
- **UI Error State**: Displays *"No active project associations found."*

---

## Flow 16: Remove Skill From All Projects (Global Protected Removal)
- **UI Trigger**: Confirming global removal in `ConfirmationDialog.render` (Screen 10).
- **Bridge Operation**:
  1. `bridge.previewGlobalRemoval(skillId)` $\to$ returns internal token + affected list.
  2. `bridge.confirmGlobalRemoval(skillId, token, platforms)` $\to$ executes batch removal.
- **Application Service Function**: `Get-NexoraApplicationGlobalRemovalPreview` $\to$ `Invoke-NexoraApplicationGlobalRemoval`
- **Underlying Service(s)**: `MultiProjectOrchestrator.ps1` (Token validation, project set fingerprint, TTL, isolated rollback snapshots)
- **Structured Result**: `{ success: true, affectedCount: 3, successCount: 3, failureCount: 0 }`
- **UI Success State**: Toast notification: *"Skill '...' removed from all 3 projects"*; routes to `SkillLibraryScreen.js`.
- **UI Error State**: Error modal with per-project failure breakdown and retry options.

---

## Flow 17: AI Platform Selection & Platform Preferences
- **UI Trigger**: Modifying platform checkboxes in `PlatformSelectionScreen.js`.
- **Bridge Operation**: `bridge.setProjectPlatformPreferences(projectId, platformIds)`
- **Application Service Function**: `Save-NexoraProjectMetadata`
- **Underlying Service(s)**: `ProjectMemory.ps1` (`targetPlatforms` in `project.json`)
- **Structured Result**: `{ success: true, platforms: ["antigravity", "cursor"] }`
- **UI Success State**: Advances workflow to Activation Confirmation Dialog.
- **UI Error State**: Platform validation alert.

---

## Flow 18: System Health Diagnostics (Doctor)
- **UI Trigger**: Click `Run Doctor` on `SystemHealthScreen.js`.
- **Bridge Operation**: `bridge.runDoctor()`
- **Application Service Function**: `Invoke-NexoraApplicationDoctor -Repair:$false`
- **Underlying Service(s)**: `NexoraApplicationService.ps1` (Maps into 6 user-facing categories)
- **Structured Result**: `{ healthy: true, checks: [{ name, status: "OK|WARN|FAIL", detail }], runtimePath }`
- **UI Success State**: 6 health check rows updated with status badges.
- **UI Error State**: Amber/Red warnings highlighted with `Repair System` CTA.

---

## Flow 19: System Repair Execution
- **UI Trigger**: Click `Repair System` on `SystemHealthScreen.js`.
- **Bridge Operation**: `bridge.repairDoctor()`
- **Application Service Function**: `Invoke-NexoraApplicationDoctor -Repair:$true`
- **Underlying Service(s)**: `DoctorRepair.ps1` (`Invoke-NexoraDoctorRepair`)
- **Structured Result**: `{ healthy: true, repairsApplied: [...], unresolved: [...] }`
- **UI Success State**: Success banner: *"Repairs applied successfully. System is healthy."*
- **UI Error State**: Warning: *"Some issues could not be automatically repaired."*

---

## Flow 20: Update Status & Skill Catalog Synchronization
- **UI Trigger**: Navigating to `UpdateCenterScreen.js` or clicking `Sync Library` in `SkillLibraryScreen.js`.
- **Bridge Operation**: `bridge.getUpdateStatus()` / `bridge.syncSkillCatalog()`
- **Application Service Function**: `Get-NexoraApplicationUpdateStatus`
- **Underlying Service(s)**: Version file inspector (`nexora-version.json`, `install.json`)
- **Structured Result**: `{ currentVersion: "1.0.0", latestVersion: "1.0.0", updateAvailable: false, modules: [...] }`
- **UI Success State**: Update Center displays `Up to date` status chips.
- **UI Error State**: Offline notice or update failed notification.

---

## Flow 21: Global Aggregated Activity Feed
- **UI Trigger**: Navigating to `RecentActivityScreen.js` or opening notifications drawer.
- **Bridge Operation**: `bridge.getActivityLogs(projectId?, limit = 50)`
- **Application Service Function**: `Get-NexoraApplicationActivityLogs` *(Phase 6.2 Global Aggregator)*
- **Underlying Service(s)**: `ProjectMemory.ps1` (`history.json` across registered projects)
- **Structured Result**: Array of human-readable activity entries `{ eventId, projectId, projectName, timestamp, eventType, userSafeMessage, source, metadata }`.
- **UI Success State**: Filterable timeline rendered (All Activity, Projects, Skills, Analysis, Updates, System).
- **UI Error State**: Empty state timeline with *"No recent activity logged."*
