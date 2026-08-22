# Nexora Skills Manager — Structured Bridge Contract (Phase 6.1C Corrected)

This document specifies the communication architecture and API interface between the Nexora Desktop UI frontend and the Phase 5 PowerShell Application Engine.

---

## 1. Architectural Principles

1. **Structured JSON Communication Only**:
   - Zero parsing of raw terminal text output or ANSI escape sequences.
   - All interactions must pass through a strongly-typed JSON request/response envelope.
2. **Local-First & Non-Blocking**:
   - The UI communicates with a local engine process. Operations default to asynchronous promises with timeouts.
3. **Clean Add-Project Contract**:
   - The public desktop UI bridge exposes only `addProject(path: string)`.
   - Optional parameters (`name`, `autoAnalyze`) are internally derived from the leaf directory name and defaulted to `true` by the backend.
4. **Working Context Persistence Rule (`PROJECT_PERSISTED`)**:
   - Selected working mode and target are persisted in `.nexora/project.json` under `workingContext: { mode, target }`.
   - Survives application restarts without mutating `projectType`, `primaryType`, or `analysis.json`.
5. **Platform Preference vs. Confirmed Activation Rule**:
   - Platform preferences (`getProjectPlatformPreferences`, `setProjectPlatformPreferences`) store default pre-selections in `project.json`.
   - Skill activations (`activateSkills`) require explicitly confirmed platform IDs in the activation request.
6. **Update Workflow Separation**:
   - Lightweight, non-blocking update checks (`checkForUpdates`, `getUpdateStatus`) are completely separated from heavy download and installation operations (`downloadUpdate`, `verifyUpdate`, `scheduleInstallOnExit`, `restartAndUpdate`).

---

## 2. Bridge TypeScript Interface Definition

```typescript
export interface INexoraBridge {
  // === 1. Application Lifecycle ===
  startup(): Promise<ApplicationStatus>;
  getApplicationStatus(): Promise<ApplicationStatus>;
  
  // === 2. Project Registry & Management ===
  listProjects(): Promise<ProjectSummary[]>;
  validatePath(path: string): Promise<PathValidationResult>;
  addProject(path: string): Promise<AddProjectResult>; // Clean single-parameter contract
  removeProject(projectId: string): Promise<OperationResult>;
  getProjectProfile(projectId: string): Promise<ProjectProfile>;
  
  // === 3. Analysis & Working Context (PROJECT_PERSISTED) ===
  analyzeProject(projectId: string): Promise<ProjectAnalysisResult>;
  getWorkingContext(projectId: string): Promise<WorkingContext>;
  setWorkingContext(projectId: string, mode: string | null, target: string | null): Promise<WorkingContext>;
  
  // === 4. Recommendations ===
  getRecommendations(projectId: string, context?: WorkingContext): Promise<Recommendation[]>;
  
  // === 5. Skills Management & Lifecycle ===
  getSkillCatalog(): Promise<SkillSummary[]>;
  getSkillDetail(skillId: string): Promise<SkillDetail>;
  getActiveSkills(projectId: string): Promise<ActiveSkillItem[]>;
  activateSkills(projectId: string, skillIds: string[], platforms: string[]): Promise<SkillActivationResult>;
  deactivateSkill(projectId: string, skillId: string, platforms: string[]): Promise<SkillDeactivationResult>;
  
  // === 6. Multi-Project & Cross-Project Operations ===
  getSkillUsage(skillId: string): Promise<ProjectSummary[]>;
  previewGlobalRemoval(skillId: string): Promise<GlobalRemovalPreview>;
  confirmGlobalRemoval(skillId: string, token: string, platforms: string[]): Promise<GlobalRemovalResult>;
  
  // === 7. AI Platform Preferences & Deployment ===
  getPlatforms(): Promise<PlatformSummary[]>;
  getProjectPlatformPreferences(projectId: string): Promise<string[]>;
  setProjectPlatformPreferences(projectId: string, platforms: string[]): Promise<OperationResult>;
  
  // === 8. System Doctor & Maintenance (6 Mapped Categories) ===
  runDoctor(): Promise<DoctorResult>;
  repairDoctor(): Promise<DoctorRepairResult>;
  
  // === 9. Update & Sync Operations (Separated Tiers) ===
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(channel?: string): Promise<UpdateCheckResult>;
  syncSkillCatalog(): Promise<SkillSyncResult>;
  downloadUpdate(targetVersion?: string): Promise<UpdateDownloadProgress>;
  verifyUpdate(targetVersion?: string): Promise<OperationResult>;
  scheduleInstallOnExit(targetVersion?: string): Promise<OperationResult>;
  restartAndUpdate(targetVersion?: string): Promise<OperationResult>;
  
  // === 10. Global Aggregated Activity Feed ===
  getActivityLogs(projectId?: string, limit?: number): Promise<ActivityEntry[]>;
}
```

---

## 3. Global Activity Aggregation Specification

For `getActivityLogs(projectId?, limit = 50)`:
1. **Multi-Project Query**: If `projectId` is omitted, query all registered projects in `projects.json`.
2. **Graceful Degradation**: If a registered project directory is missing or inaccessible, skip it without crashing the global feed.
3. **Structured Mapping**:
   - `eventId`: `act_<sha256(projectId + timestamp + action).substring(0, 10)>`
   - `projectId`: Managed project ID or `"system"`
   - `projectName`: Project display name or `"Nexora System"`
   - `timestamp`: ISO-8601 string
   - `eventType`: `"PROJECTS" | "SKILLS" | "ANALYSIS" | "UPDATES" | "SYSTEM"`
   - `userSafeMessage`: Human-readable description (e.g. *"flutter-build-responsive-layout activated"*)
   - `source`: `"engine" | "cli" | "ui"`
   - `metadata`: Sanitized payload
4. **Deterministic Sorting**: Sort entries by `timestamp` descending. Break equal timestamp ties deterministically using `projectId` then `eventId`.
5. **Deduplication**: Filter out duplicate event IDs.
