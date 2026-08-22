# Nexora Skills Manager — Phase 6.1C Contract-Gap Report (Corrected)

This document records the authoritative classification of capabilities, gaps, and readiness criteria for the upcoming Phase 6.2 live integration.

---

## 1. Executive Summary & Authoritative Reconciliation

The 24 evaluated capabilities are classified into three distinct statuses:

| Status | Count | Percentage | Definition |
| :--- | :---: | :---: | :--- |
| **SUPPORTED** | **17** | **70.8%** | Fully implemented in Phase 5 engine; directly consumable by Bridge layer. |
| **PARTIALLY_SUPPORTED** | **3** | **12.5%** | Core logic exists; requires parameter extensions or response mapping. |
| **GAP** | **4** | **16.7%** | Requires specific facade methods or storage attributes in Phase 6.2. |
| **Total** | **24** | **100.0%** | **Reconciled capability matrix total.** |

---

## 2. Core vs. Optional Gap Classification

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Phase 6.2 Gap Classifications                      │
├───────┬───────────────────────────────────────────┬────────────────────┤
│ Gap   │ Description                               │ Phase 6.2 Status   │
├───────┼───────────────────────────────────────────┼────────────────────┤
│ GAP 1 │ Working Mode & Target Context Persistence │ PHASE_6_2_REQUIRED │
│ GAP 2 │ Global Aggregated Activity Feed           │ PHASE_6_2_REQUIRED │
│ GAP 3 │ Doctor 6-Category UI Response Mapping     │ PHASE_6_2_REQUIRED │
│ GAP 4 │ Background Remote Update Manifest Check   │ OPTIONAL_FOLLOWUP  │
└───────┴───────────────────────────────────────────┴────────────────────┘
```

---

## 3. Detailed Gap Specifications

---

### GAP 1: Working Mode & Target Context Persistence & Recalculation
- **Classification**: `PHASE_6_2_REQUIRED`
- **Persistence Decision**: **`PROJECT_PERSISTED`**
- **Requirements**:
  1. Store `workingContext: { mode, target }` in `.nexora/project.json` so selected context survives application restarts.
  2. Keep `workingContext` completely decoupled from detected stack classification (`primaryType`, `projectType`, `analysis.json`).
  3. Pass `WorkingMode` and `Target` to `Get-NexoraSkillRecommendations` to boost relevant category match scores without triggering a full filesystem rescan.
- **Recommended Minimal Backend Changes**:
  - `RecommendationEngine.ps1`: Add optional `[string]$WorkingMode = $null` and `[string]$Target = $null` parameters to `Get-NexoraSkillRecommendations`.
  - `NexoraApplicationService.ps1`: Expose `Get-NexoraApplicationRecommendations` and `Set-NexoraProjectWorkingContext`.
  - `ProjectMemory.ps1`: Persist `workingContext` in `Save-NexoraProjectMetadata`.
- **Risk Level**: **Low** (Backward compatible; defaults to current behavior if omitted).

---

### GAP 2: Global Aggregated Activity Feed
- **Classification**: `PHASE_6_2_REQUIRED`
- **Requirements**:
  1. Aggregate `.nexora/history.json` entries from all registered projects in `projects.json`.
  2. Sort entries by `timestamp` descending, with deterministic tie-breaking.
  3. Gracefully skip missing or inaccessible project paths without failing the global feed.
  4. Emit clean `ActivityEntry` objects with sanitized metadata.
- **Recommended Minimal Backend Changes**:
  - `NexoraApplicationService.ps1`: Add `Get-NexoraApplicationActivityLogs -Limit 50`.
- **Risk Level**: **Low** (Read-only aggregation).

---

### GAP 3: Doctor 6-Category UI Response Mapping
- **Classification**: `PHASE_6_2_REQUIRED`
- **Mapping Strategy**: **Bridge/Facade Aggregation (No Core Engine Rewrites)**
- **Requirements**:
  1. Map engine diagnostic checks into the 6 frozen desktop categories:
     - `Core Engine` $\leftarrow$ Engine entrypoint check
     - `Skill Library` $\leftarrow$ Global registry count check
     - `CLI` $\leftarrow$ Command registration and PATH check
     - `Project Registry` $\leftarrow$ `projects.json` validation check
     - `Installation Metadata` $\leftarrow$ `install.json` validation check
     - `Platform Adapters` $\leftarrow$ Validation of adapter scripts presence
- **Recommended Minimal Backend Changes**:
  - `NexoraApplicationService.ps1`: In `Invoke-NexoraApplicationDoctor`, include explicit check items for `Project Registry` and `Platform Adapters`.
- **Risk Level**: **Low** (Expands check list array).

---

### GAP 4: Background Remote Update Check & Asset Flow
- **Classification**: `OPTIONAL_FOLLOWUP`
- **Requirements**:
  1. Lightweight, non-blocking check against cached release manifest or GitHub Releases API.
  2. Immediate offline fallback returning `updateStatus: "offline"` without blocking UI.
  3. Separate download/install execution from check status.
- **Why Optional for Core Phase 6.2**:
  - Core desktop application operations (project management, analysis, skill activation/deactivation, doctor, cross-project operations) are `LOCAL_ONLY` and fully operational without live remote update checks.
- **Risk Level**: **Medium** (Network timeout management).

---

## 4. Phase 6.2 Live Integration Readiness Matrix

| Area | Existing Phase 5 Capability | Required Gap | Phase 6.2 Blocker? | Recommended Step Order |
| :--- | :--- | :--- | :---: | :---: |
| **Startup / Shell** | `Initialize-NexoraApplicationState` | None | No | **Step 1** |
| **Project Registry** | `Get-NexoraManagedProjects`, `Add-NexoraManagedProject` | Clean bridge wrapper `addProject(path)` | No | **Step 2** |
| **Project Analysis** | `Invoke-NexoraApplicationAnalyze` | None | No | **Step 3** |
| **Working Context** | None (UI in-memory only) | GAP 1 (`PROJECT_PERSISTED`) | **YES** | **Step 4** |
| **Recommendations** | `Get-NexoraSkillRecommendations` | GAP 1 (Context scoring) | **YES** | **Step 5** |
| **Skill Library** | `Get-NexoraGlobalRegistry` (48 skills) | None | No | **Step 6** |
| **Active Skills** | `Get-NexoraApplicationActiveSkills` | None | No | **Step 7** |
| **Skill Activation** | `Invoke-NexoraApplicationActivateSkills` | Platform preference vs confirmed pass | No | **Step 8** |
| **Skill Deactivation** | `Invoke-NexoraApplicationDeactivateSkill` | None | No | **Step 9** |
| **Cross-Project Usage** | `Get-NexoraApplicationSkillUsage` | None | No | **Step 10** |
| **Global Removal** | `Get-NexoraApplicationGlobalRemovalPreview` | Token encapsulation | No | **Step 11** |
| **Platform Adapters** | `Deploy-NexoraSkillsToPlatforms` | Stable IDs (`antigravity`, `cursor`, `copilot`) | No | **Step 12** |
| **Doctor Diagnostics** | `Invoke-NexoraApplicationDoctor` | GAP 3 (6-category mapping) | **YES** | **Step 13** |
| **Doctor Repairs** | `Invoke-NexoraDoctorRepair` | None | No | **Step 14** |
| **Activity Feed** | `Get-NexoraProjectHistory` | GAP 2 (Global aggregator) | **YES** | **Step 15** |
| **Update Center** | `Get-NexoraApplicationUpdateStatus` | GAP 4 (Optional follow-up) | No | **Step 16** |
| **Offline Handling** | Core engine is local-first (`LOCAL_ONLY`) | None | No | **Step 17** |
| **Error Handling** | Structured exceptions | Common `BridgeError` envelope | No | **Step 18** |

---

## 5. Phase 6.2 Readiness Verdict

- **Core Phase 6.2 Readiness**: **READY**
- **Action Plan for Phase 6.2**:
  1. Address GAP 1 (Working Context Persistence & Contextual Scoring), GAP 2 (Global Activity Aggregator), and GAP 3 (Doctor 6-Category Check Mapping) in `engine/Application/NexoraApplicationService.ps1` and `engine/Recommendations/RecommendationEngine.ps1`.
  2. Implement the live structured bridge communication layer connecting UI `BridgeService` to `NexoraApplicationService.ps1`.
  3. Validate all 21 user flows against live PowerShell backend responses.
