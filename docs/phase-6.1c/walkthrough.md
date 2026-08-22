# Nexora Skills Manager — Phase 6.1C Integration Contract Walkthrough (Authoritative)

---

## 1. Phase 6.1C Executive Summary

**Phase 6.1C** designed and froze the integration contract between the **Nexora Desktop UI** (Phase 6.1A/6.1B) and the **Phase 5 PowerShell Engine** (`NexoraApplicationService.ps1`).

### Authoritative Deliverables in `docs/phase-6.1c/`:
1. `backend-capability-audit.md`: Systematic audit of 24 backend capabilities.
2. `ui-backend-flow-map.md`: End-to-end mapping of all 21 desktop user flows.
3. `bridge-contract.md`: TypeScript/JavaScript interface definitions, structured JSON request/response envelopes, and clean contracts.
4. `data-contracts.md`: Concrete JSON schemas with `schemaVersion: "1.0.0"` for all data models.
5. `offline-update-contract.md`: Local-first classification (`LOCAL_ONLY`, `REMOTE_OPTIONAL`, `REMOTE_REQUIRED`), 4-tier update separation, and release distribution architecture.
6. `contract-gap-report.md`: Formal assessment of capabilities, gaps, and Phase 6.2 readiness matrix.

---

## 2. Reconciled Capability Breakdown (24 Total)

| Status | Count | Percentage | Description |
| :--- | :---: | :---: | :--- |
| **SUPPORTED** | **17** | **70.8%** | Fully implemented in Phase 5 engine; ready for live bridge consumption. |
| **PARTIALLY_SUPPORTED** | **3** | **12.5%** | Core logic exists; requires parameter extensions or response mapping. |
| **GAP** | **4** | **16.7%** | Requires specific facade methods or storage attributes in Phase 6.2. |
| **Total** | **24** | **100.0%** | **Authoritative reconciliation.** |

---

## 3. Core vs. Optional Gap Classifications

| Gap Reference | Description | Phase 6.2 Classification |
| :--- | :--- | :---: |
| **GAP 1** | **Working Mode & Target Context Persistence (`PROJECT_PERSISTED`)** | `PHASE_6_2_REQUIRED` |
| **GAP 2** | **Global Aggregated Activity Feed** | `PHASE_6_2_REQUIRED` |
| **GAP 3** | **Doctor 6-Category UI Response Mapping** | `PHASE_6_2_REQUIRED` |
| **GAP 4** | **Background Remote Update Check & Asset Flow** | `OPTIONAL_FOLLOWUP` |

---

## 4. Key Architectural Decisions

1. **Working Context Persistence (`PROJECT_PERSISTED`)**:
   - Selected working mode and target are persisted in `.nexora/project.json` under `workingContext: { mode, target }`.
   - Survives application restarts without mutating `projectType`, `primaryType`, or `analysis.json`.
2. **Clean Add-Project Bridge Contract**:
   - Public Desktop Bridge signature is simply `addProject(path: string)`.
   - Project name is internally derived from the folder leaf and `autoAnalyze: true` is defaulted on the backend.
3. **Platform Preferences vs. Confirmed Activation**:
   - Preferences (`getProjectPlatformPreferences`, `setProjectPlatformPreferences`) store defaults in `project.json`.
   - Skill activation (`activateSkills`) requires explicitly confirmed platform IDs.
4. **Update Workflow Separation**:
   - Lightweight, non-blocking update checks (`checkForUpdates`, `getUpdateStatus`) are completely separated from heavy download and installation operations (`downloadUpdate`, `verifyUpdate`, `scheduleInstallOnExit`, `restartAndUpdate`).
5. **Global Activity Aggregation**:
   - Merges entries from registered projects, sorts newest-first with deterministic tie-breaking, deduplicates, and gracefully skips missing project paths.
6. **Doctor UI Mapping**:
   - Maps backend diagnostic results into the 6 frozen desktop categories: `Core Engine`, `Skill Library`, `CLI`, `Project Registry`, `Installation Metadata`, `Platform Adapters`.

---

## 5. Verification Status

- **Engine Code**: 0 modifications to `engine/`, `scripts/`, `Loaders/`, `install.ps1`, `setup.ps1`, or `.ps1` files.
- **UI Code**: 0 modifications to `ui/` runtime logic.
- **Git Status**: Clean working tree outside documentation files in `docs/phase-6.1c/`.
