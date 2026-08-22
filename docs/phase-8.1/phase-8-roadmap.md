# Nexora Skills Manager — Phase 8 Remote Update Roadmap (Phase 8.1–8.7)

## 1. Phase Structure & Milestones

| Phase | Milestone Name | Primary Objectives & Deliverables | Expected Gate Test Count |
| :---: | :--- | :--- | :---: |
| **8.1** | **Remote Update Architecture & Security Contract** *(CURRENT)* | Architecture design, trust boundaries, manifest schema, SemVer rules, IPC expansion proposal, roadmap. | Documentation only |
| **8.2** | **Remote Manifest + Update Check Engine** | Implement trusted HTTPS manifest client, SemVer comparator, channel filtering, offline detection, mock test suite. | +25 automated assertions |
| **8.3** | **Secure Artifact Download & Verification** | Streaming HTTPS download engine, progress events, size validation, SHA-256 calculation, Zip Slip verification, cancellation. | +30 automated assertions |
| **8.4** | **Installer Handoff + Update Execution** | `NexoraUpdateHelper.ps1`, parent process exit detection, Phase 7 transactional installer invocation, atomic backup/rollback, relaunch. | +35 automated assertions |
| **8.5** | **Desktop Update Center Live UI Integration** | Update Center UI state machine integration, progress bars, download/install triggers, truthful offline/up-to-date rendering. | +25 automated assertions |
| **8.6** | **Failure Recovery, Offline & Security Testing** | Chaos testing (broken downloads, checksum tampering, power loss simulation, rollback verification, SSRF blocking). | +30 automated assertions |
| **8.7** | **Final Regression + Git Closure** | Cumulative regression (719 + ~145 = ~864 assertions), clean release packaging, commit, tag, push, remote verification. | ~864 total assertions |

---

## 2. Technical Prerequisites & Dependencies
1. **Node.js HTTPS Client**: Uses native Node `https` and `crypto` modules with streaming support; zero external npm packages required.
2. **Phase 7 Installer Engine**: `engine/Install/NexoraInstaller.ps1` remains the sole transactional installer engine.
3. **Mock HTTP Server for Automated Testing**: All automated test suites will run against a local mock HTTP/HTTPS fixture to guarantee 100% offline testability.

---

## 3. Test Categories & Verification Matrix

| Category | Description | Verification Method |
| :--- | :--- | :--- |
| **Manifest Parsing** | Valid JSON, invalid JSON, missing fields, schemaVersion validation | Automated unit tests (Node & Pester) |
| **SemVer Logic** | Precedence comparison, prerelease tags, downgrade rejection | Automated unit tests |
| **Network & Security** | HTTPS enforcement, host allowlist, redirect limits, SSRF blocking | Automated network unit tests |
| **Integrity Checks** | SHA-256 verification, size validation, corrupted archive rejection | Automated unit tests |
| **Installer Handoff** | Staging validation, helper process spawn, in-use file lock handling | Automated integration tests |
| **Rollback Safety** | Mid-install failure, corrupt payload, user state preservation | Automated lifecycle tests |
| **UI Integration** | State transitions, progress reporting, button disablement | UI component & bridge tests |
