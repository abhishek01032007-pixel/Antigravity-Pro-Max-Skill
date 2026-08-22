# Nexora Skills Manager — Multi-Repository Architecture Specification

## 1. Overview & Core Philosophy
To ensure clean modularity, focused CI pipelines, and independent component lifecycles while maintaining a single, cohesive Windows desktop experience, **Nexora Skills Manager** is organized into **EXACTLY FOUR** focused repositories:

1. **`Nexora-Skills`**: Curated skill packages, YAML frontmatter specifications, categories, and third-party open source attributions.
2. **`Nexora-Desktop`**: Electron main process host, preload scripts, IPC bridge integration, and responsive dark-mode UI shell.
3. **`Nexora-Engine`**: Core PowerShell application service, project intelligence, skill lifecycle manager, and AI platform adapters.
4. **`Nexora-Windows-Installer`**: Windows bootstrap installer (`setup.ps1`), transactional upgrade, repair, rollback, and product release assembly.

---

## 2. Single Product Containment Invariant
The user experience remains strictly unified:
- **One Product**: `Nexora Skills Manager`
- **One Executable**: `NexoraSkillsManager.exe`
- **One UI Shell**: Dashboard, Projects, Skills, Activity, Maintenance, Settings & About, Update Center.
- **One Unified CLI**: `nexora` (with backward-compatible `agpm` forwarder).
- **One Installation Directory**: `%LOCALAPPDATA%\Programs\NexoraSkillsManager` & `%LOCALAPPDATA%\NexoraSkillsManager`.

---

## 3. Cross-Repository Contracts & Manifests

| Manifest File | Owning Repository | Purpose | Key Contract Fields |
| :--- | :--- | :--- | :--- |
| `nexora-skills-manifest.json` | `Nexora-Skills` | Skill catalog & dependency contract | `schemaVersion: 1`, `skillsVersion: "1.0.0"`, `minimumEngineVersion: "1.0.0"` |
| `nexora-desktop-manifest.json` | `Nexora-Desktop` | UI & Host capabilities | `schemaVersion: 1`, `desktopVersion: "1.0.0"`, `requiredEngineApiVersion: 1` |
| `nexora-engine-manifest.json` | `Nexora-Engine` | Core API & lifecycle contract | `schemaVersion: 1`, `engineVersion: "1.0.0"`, `engineApiVersion: 1`, `bridgeOperationsCount: 29` |
| `nexora-installer-manifest.json` | `Nexora-Windows-Installer` | Packaging & deployment spec | `schemaVersion: 1`, `installerVersion: "1.0.0"`, `targetPlatform: "win32"` |
| `components.lock.json` | `Nexora-Windows-Installer` | Pinned assembly bill of materials | Pins exact tested version combination forming a release |

---

## 4. Assembly & Release Pipeline
The `Nexora-Windows-Installer` repository acts as the authoritative assembly host:
```text
Nexora-Skills ───► NexoraSkills-1.0.0.zip ──────┐
Nexora-Engine ───► NexoraEngine-1.0.0-win-x64.zip ┼──► Nexora-Windows-Installer ──► NexoraSkillsManager-1.0.0-win-x64.zip
Nexora-Desktop ──► NexoraDesktop-1.0.0-win-x64.zip ┘    (Build-NexoraProduct.ps1)     NexoraRuntime-1.0.0.zip
                                                                                       release-manifest.json
                                                                                       SHA256SUMS.txt
```
