# Nexora Skills Manager — Local-First & Update Architecture Contract (Phase 6.1C)

This document establishes the local-first execution model, offline operational guarantees, and release distribution architecture for Nexora Skills Manager.

---

## 1. Local-First Operational Classification

Every engine operation is strictly classified into one of three network tiers:

| Network Tier | Definition | Examples |
| :--- | :--- | :--- |
| **`LOCAL_ONLY`** | 100% executable without internet connection. Operates purely on local project files, `.nexora/` metadata, and local skill packages. | Application startup, project registry, project scanning, local recommendation generation, skill activation/deactivation, platform adapter deployment, Doctor diagnostics, activity logging, and mode/target switching. |
| **`REMOTE_OPTIONAL`** | Executes locally with graceful degradation if offline. Queries remote services only when available. | Periodic background update checks, skill catalog sync checks, and changelog fetching. |
| **`REMOTE_REQUIRED`** | Requires an active internet connection to download remote release assets. | Downloading new application installers from GitHub Releases, downloading newly published skill packs not present in the local registry. |

---

## 2. Local-First Guarantees

1. **Non-Blocking Startup**:
   - Application startup and dashboard loading **never block** on network I/O.
   - If an update check is scheduled, it runs asynchronously in a lightweight background task without degrading UI responsiveness.
2. **Offline Mode UI State**:
   - When offline, the top status bar displays `● Offline (Local Mode)`.
   - A non-blocking banner informs the user that local project analysis and skill management remain fully operational.
   - Offline update checks display a dismissible notice (`Unable to Check for Updates: You're currently offline`) with a `Retry` action.

---

## 3. Separation of Update Tiers

Update operations are divided into 4 modular tiers to prevent unnecessary full application reinstallations:

```
┌────────────────────────────────────────────────────────┐
│               Nexora Update Tiers                      │
├─────────────────────────┬──────────────────────────────┤
│ 1. Core Desktop App     │ Inno Setup Windows Package   │
│    (Electron / Shell)   │ (v1.0.0 → v1.1.0)            │
├─────────────────────────┼──────────────────────────────┤
│ 2. Core Runtime Engine  │ PowerShell Backend & CLI     │
│    (engine/)            │ (Sync-Version / Engine Patch)│
├─────────────────────────┼──────────────────────────────┤
│ 3. Skill Library        │ 48+ Universal Skill Packs    │
│    (Frontend/Backend/QA)│ (Sync-Version / Skill Patch) │
├─────────────────────────┼──────────────────────────────┤
│ 4. Platform Adapters    │ Antigravity / Cursor / Copilot│
│    (engine/Adapters/)   │ Adapter definition updates   │
└─────────────────────────┴──────────────────────────────┘
```

- **Skill Library Updates** update markdown rules and templates without requiring a restart or reinstall of the desktop shell.
- **Application Updates** follow the verified download, verification, install-on-exit or restart workflow.

---

## 4. Release Distribution Principle

$$\text{Git Push} \neq \text{End-User Application Update}$$

Updates are released to end users strictly through verified release builds and signed GitHub Releases:

```
Developer Commits & Pushes Code
              │
              ▼
Automated Regression & Skill Validation Test Suite
              │
              ▼
Version Bump & Release Tagging (vX.Y.Z)
              │
              ▼
Build-ReleasePackage.ps1 (Generates Nexora-Skills-Manager-Setup.exe & Manifests)
              │
              ▼
GitHub Release Published (Asset Binaries + SHA-256 Checksums)
              │
              ▼
Installed Nexora Desktop Instances Detect New Verified Release Tag
```
