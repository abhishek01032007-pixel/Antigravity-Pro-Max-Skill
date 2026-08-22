# Nexora Skills Manager — Backend Capability Audit (Phase 6.1C Corrected)

This document provides a systematic audit of the existing Phase 5 backend (`engine/`) against the requirements of the Nexora Desktop UI (Phase 6.1A/6.1B).

---

## 1. Capability Audit Matrix (24 Total Capabilities)

| # | UI Requirement | Existing Backend Service | Existing Backend Function | Input Parameters | Output Shape | Mutation / Read Only | Network Tier | Contract Status | Gap Reference |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | **Application Initialization** | `NexoraApplicationService.ps1` | `Initialize-NexoraApplicationState` | None | `PSCustomObject@{ success, engineStatus, runtimePath, engineHealthy, projectCount, projects, updateStatus, status, initializedAt }` | Read / Memory | `LOCAL_ONLY` | **SUPPORTED** | — |
| **2** | **System Status Query** | `StatusManager.ps1` | `Get-NexoraSystemStatus` | None | `PSCustomObject@{ engineStatus, currentProjectId, currentProjectName, operationState, lastOperation, activeSkillsCount, updateStatus, lastError, lastActivity, initializedAt }` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **3** | **Managed Project List** | `ProjectRegistryService.ps1` | `Get-NexoraManagedProjects` | None | `Array[PSCustomObject@{ id, name, path, primaryType, developmentMode, pathExists, activeSkillCount }]` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **4** | **Add / Register Project** | `ProjectRegistryService.ps1` | `Add-NexoraManagedProject` | `Path` (string), `Name` (opt) | `PSCustomObject@{ success, message, projectId, project }` | Mutation (`projects.json`) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **5** | **Project Folder Validation** | `ProjectRegistryService.ps1` / `PathUtils.ps1` | `Test-Path`, `Get-NexoraCanonicalPath` | `Path` (string) | `Boolean` / `String` (Canonical Path) | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **6** | **Project Scan & Analysis** | `ProjectDetector.ps1` / `ProjectClassification.ps1` | `Invoke-NexoraProjectScan` / `Invoke-NexoraApplicationAnalyze` | `Path` (string) | `PSCustomObject@{ success, projectRoot, projectId, analysis, recommendations }` | Mutation (`.nexora/analysis.json`, `projects.json`) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **7** | **Project Profile Retrieval** | `NexoraApplicationService.ps1` | `Get-NexoraApplicationProjectProfile` | `ProjectId` (string) | `PSCustomObject@{ success, project, metadata, analysis, skills, history }` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **8** | **Working Context Persistence** | *None (Memory state in UI)* | *None* | `ProjectId`, `WorkingMode`, `Target` | `WorkingContext` | Mutation (`.nexora/project.json`) | `LOCAL_ONLY` | **GAP** | **GAP 1** |
| **9** | **Contextual Recommendation Scoring** | `RecommendationEngine.ps1` | `Get-NexoraSkillRecommendations` | `Analysis` (psobject), `AvailableSkills` (array) | `List[PSCustomObject@{ SkillId, Name, MatchScore, Reason, Category }]` | Read Only | `LOCAL_ONLY` | **PARTIALLY SUPPORTED** | **GAP 1** |
| **10** | **Available Catalog Retrieval** | `GlobalSkillRegistry.ps1` | `Get-NexoraGlobalRegistry` | `LibraryRoot` (string, opt) | `Array[PSCustomObject@{ Id, Name, Category, Version, Path, Pack }]` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **11** | **Active Skills Retrieval** | `ProjectMemory.ps1` | `Get-NexoraProjectSkills` / `Get-NexoraApplicationActiveSkills` | `ProjectId` (string) | `Array[String]` (Active Skill IDs) | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **12** | **Skill Activation** | `SkillLifecycleManager.ps1` | `Invoke-NexoraApplicationActivateSkills` | `ProjectId`, `SkillIds` (string[]), `Platforms` (string[]) | `PSCustomObject@{ Success, ActivatedCount, DeployedSkills, Deployments, Errors }` | Mutation (Filesystem, `.nexora/skills.json`) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **13** | **Skill Deactivation** | `SkillRemovalService.ps1` | `Invoke-NexoraApplicationDeactivateSkill` | `ProjectId`, `SkillId`, `Platforms` (string[]) | `PSCustomObject@{ Success, DeactivatedSkills, Undeployments, SnapshotPath }` | Mutation (Filesystem, `.nexora/skills.json`) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **14** | **Cross-Project Skill Usage** | `MultiProjectOrchestrator.ps1` | `Get-NexoraApplicationSkillUsage` | `SkillId` (string) | `Array[PSCustomObject@{ id, name, path }]` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **15** | **Global Removal Preview** | `MultiProjectOrchestrator.ps1` | `Get-NexoraApplicationGlobalRemovalPreview` | `SkillId` (string) | `PSCustomObject@{ operation, skillId, affectedProjects, affectedCount, destructive, requiresConfirmation, confirmationToken, expiresAt }` | Memory (Token generation) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **16** | **Global Removal Execution** | `MultiProjectOrchestrator.ps1` | `Invoke-NexoraApplicationGlobalRemoval` | `SkillId`, `ConfirmationToken`, `Platforms` | `PSCustomObject@{ success, skillId, affectedCount, successCount, failureCount, results }` | Mutation (All affected projects) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **17** | **Platform Adapters Deployment** | `PlatformAdapter.ps1` | `Deploy-NexoraSkillsToPlatforms` / `Undeploy-NexoraSkillsFromPlatforms` | `ProjectRoot`, `SkillObjects`, `Platforms` | `Array[PSCustomObject@{ Platform, Success, DeployedFiles, Errors }]` | Mutation | `LOCAL_ONLY` | **SUPPORTED** | — |
| **18** | **Platform Preferences Management** | `ProjectMemory.ps1` | `Get-NexoraProjectMetadata` / `Save-NexoraProjectMetadata` | `ProjectRoot`, `Platforms` | `Array[String]` (`targetPlatforms`) | Mutation (`.nexora/project.json`) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **19** | **Doctor Diagnostic Checks Mapping** | `NexoraApplicationService.ps1` | `Invoke-NexoraApplicationDoctor` | `Repair` (switch) | `PSCustomObject@{ healthy, runtimePath, checks, repairsApplied }` | Read Only | `LOCAL_ONLY` | **PARTIALLY SUPPORTED** | **GAP 3** |
| **20** | **Doctor Repairs Execution** | `DoctorRepair.ps1` | `Invoke-NexoraDoctorRepair` | `Checks` (array) | `PSCustomObject@{ repairsApplied, unresolved }` | Mutation (System PATH, bin) | `LOCAL_ONLY` | **SUPPORTED** | — |
| **21** | **Update Status Check (Lightweight)** | `NexoraApplicationService.ps1` | `Get-NexoraApplicationUpdateStatus` | None | `PSCustomObject@{ currentVersion, latestVersion, updateAvailable, channel, checkedAt }` | Read Only | `REMOTE_OPTIONAL` | **PARTIALLY SUPPORTED** | **GAP 4** |
| **22** | **Update Package Download & Install** | *None (External Installer)* | *None* | `TargetVersion`, `Channel` | *None* | Mutation | `REMOTE_REQUIRED` | **GAP** | **GAP 4** |
| **23** | **Project-Level Activity History** | `ProjectMemory.ps1` | `Get-NexoraProjectHistory` | `ProjectRoot` (string) | `Array[PSCustomObject@{ timestamp, action, details }]` | Read Only | `LOCAL_ONLY` | **SUPPORTED** | — |
| **24** | **Global Aggregated Activity Log** | *None (Per-project only)* | *None* | None | *None* | Read Only | `LOCAL_ONLY` | **GAP** | **GAP 2** |

---

## 2. Reconciled Capability Breakdown

| Status | Count | Percentage | Description |
| :--- | :---: | :---: | :--- |
| **SUPPORTED** | **17** | **70.8%** | Fully implemented in Phase 5 engine; ready for live bridge consumption. |
| **PARTIALLY_SUPPORTED** | **3** | **12.5%** | Core logic exists; requires parameter extension or response field mapping. |
| **GAP** | **4** | **16.7%** | Requires new facade function or storage field in Phase 6.2. |
| **Total** | **24** | **100.0%** | Authoritative reconciliation. |

---

## 3. Gap Reference Index

1. **GAP 1**: Working Mode / Target Context Persistence & Scoring (`PHASE_6_2_REQUIRED`) — Capabilities #8, #9.
2. **GAP 2**: Global Aggregated Activity History (`PHASE_6_2_REQUIRED`) — Capability #24.
3. **GAP 3**: Doctor 6-Category UI Mapping (`PHASE_6_2_REQUIRED`) — Capability #19.
4. **GAP 4**: Background Remote Update Check & Asset Flow (`OPTIONAL_FOLLOWUP`) — Capabilities #21, #22.
