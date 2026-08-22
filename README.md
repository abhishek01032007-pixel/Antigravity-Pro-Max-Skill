<p align="center">
  <br>
  <img src="https://img.shields.io/badge/NEXORA-SKILLS%20MANAGER-0B1020?style=for-the-badge&labelColor=2563EB&color=111827" alt="Nexora Skills Manager" />
</p>

<h1 align="center">⚡ NEXORA SKILLS MANAGER</h1>

<h3 align="center">Local-first developer skill management and orchestration for supported AI coding platforms.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20x64-0078D4?style=flat-square" alt="Platform: Windows x64" />
  <img src="https://img.shields.io/badge/Release-v1.0.0-2563EB?style=flat-square" alt="Release: v1.0.0" />
  <img src="https://img.shields.io/badge/CLI-nexora-0F766E?style=flat-square" alt="CLI: nexora" />
  <img src="https://img.shields.io/badge/Legacy%20Alias-agpm-6B7280?style=flat-square" alt="Legacy: agpm" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT" />
</p>

<p align="center">
  <strong>One setup. Native Desktop host. Local-first AI agent skill orchestration.</strong>
</p>

---

## 🌟 Overview

**Nexora Skills Manager** is a local-first desktop application and unified command-line tool for managing, customizing, and deploying engineering skills to modern AI coding assistants.

Nexora manages project analysis, skill state, and platform deployment locally. Outbound network access is used strictly for initial installation and explicit user-initiated update checks and downloads.

---

## 🤖 Supported AI Platforms

Nexora formats and deploys active engineering skills to standard workspace configurations across supported AI coding platforms:

| Platform | Integration Target | Format / Standard |
| :--- | :--- | :--- |
| **Google Antigravity** | `.agents/skills/<skill>/` | Standard `SKILL.md` with YAML frontmatter |
| **Cursor** | `.cursor/rules/<skill>.mdc` | MDC structured instructions |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Workspace instructions specification |

*Note: Nexora Skills Manager is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Google, Cursor, or GitHub.*

---

## ⚡ Installation (Windows x64)

### One-Command PowerShell Setup

Open **Windows PowerShell** (PowerShell 5.1+) and run:

```powershell
irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex
```

### What the Installer Does

1. Downloads and extracts the verified release payload.
2. Deploys the shared runtime engine and skill packs to `%LOCALAPPDATA%\NexoraSkillsManager\runtime\`.
3. Installs the packaged Desktop host to `%LOCALAPPDATA%\Programs\NexoraSkillsManager\`.
4. Registers the primary **`nexora`** command in your User `PATH` (`%LOCALAPPDATA%\NexoraSkillsManager\bin\`).
5. Configures the backward-compatible **`agpm`** forwarder.
6. Creates Start Menu shortcuts and registers Windows Apps & Features entries.

> **Windows SmartScreen Note**: Initial unsigned v1.0.0 release builds may display a standard Windows Defender SmartScreen notice ("Windows protected your PC") because Authenticode certificate signing is not yet enabled. Click **More info** → **Run anyway** to proceed.

---

## 🖥️ Desktop Application Features

Nexora Desktop provides a modern, dark-mode visual interface for managing your developer workspace:

- **Dashboard**: View registered projects, detected tech stacks, active skill counts, and real-time health indicators.
- **Projects & Analysis**: Inspect project frameworks, markers (e.g. `pubspec.yaml`, `package.json`, `requirements.txt`), and architecture profiles.
- **Curated Skill Library**: Browse 48+ domain-specific skills across Frontend, Backend, QA/Diagnostics, Architecture, and Mobile engineering.
- **Activity Log**: Inspect chronological records of skill activations, deactivations, project scans, and maintenance tasks.
- **Maintenance & System Health**: Run on-demand diagnostic suites verifying runtime engines, platform adapters, and directory health.
- **Settings & About**: Configure AI platform targets (Antigravity, Cursor, Copilot), inspect runtime paths, and view version details.
- **Update Center**: Perform explicit remote update checks, download verified update packages with progress tracking, and install updates with automated rollback safety.

---

## 🔄 Core Product Workflow

```text
Add / Select Local Project
         │
         ▼
Deep Project Stack Analysis (Detected Classification)
         │
         ▼
Select Current Working Mode (Frontend, Backend, QA/Debug, Fullstack)
         │
         ▼
Select Development Target (e.g. Flutter UI, REST API, Testing Suite)
         │
         ▼
Review Recommendations ──► Select Specific Skills
                                     │
                                     ▼
Select AI Platform Targets (Antigravity, Cursor, Copilot)
                                     │
                                     ▼
Activate Skills ──► Adapters Deploy Scoped Workspace Files
```

### Critical Concept Distinctions

- **Detected Project Classification**: The objective tech stack discovered on disk (e.g. Flutter/Dart frontend, Node.js backend).
- **Current Working Mode**: Your active task focus (Frontend, Backend, QA/Debug, Fullstack).
- **Development Target**: The immediate objective you are building (e.g. Responsive Layouts, Unit Tests).
- **Recommended vs Selected vs Active**: Recommendations are suggestions based on stack analysis; selection is your explicit choice; active skills are currently deployed in workspace files.

---

## 💻 CLI Commands

### Primary Command: `nexora`

```powershell
# Open interactive CLI / view status
nexora

# View help and available arguments
nexora --help

# Display installed version
nexora --version

# Run full runtime and environment diagnostics
nexora doctor

# List available skills in catalog
nexora skills

# Scan and analyze active project
nexora scan
```

### Backward Compatibility Alias: `agpm`

For existing workflows, the `agpm` command is preserved as a lightweight compatibility forwarder to `nexora`:

```powershell
agpm
```

---

## 🔒 Security, Local-First Execution & Updates

### Privacy & Data Safety

- **Local Execution**: All project scanning, code classification, and skill deployments execute 100% locally on your machine.
- **Zero Telemetry**: Nexora does not transmit project contents or telemetry as part of its implemented update workflow.
- **Zero Credentials**: Nexora never requests or stores private API keys, GitHub tokens, or account passwords.

### Secure Remote Updates

- **Explicit Checks**: Nexora never silently installs updates or downloads binaries in the background. All checks and installations require explicit user confirmation.
- **Cryptographic Verification**: Release manifests and ZIP archives are verified via SHA-256 hashes against trusted GitHub endpoints before execution.
- **Transactional Rollback**: If an update installation encounters an issue, the helper script automatically rolls back to the previous stable version.

---

## 🛠️ Maintenance, Repair & Uninstallation

### Repairing an Installation

If runtime files are damaged or deleted, navigate to **Settings & About** → **System Health** in the Desktop app, or re-run `setup.ps1` to restore runtime components without altering project files.

### Clean Uninstallation

Run the uninstaller via **Windows Settings → Installed Apps → Nexora Skills Manager → Uninstall**, or execute:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\NexoraSkillsManager\runtime\install\uninstall.ps1"
```

**What is removed**:
- Desktop application, runtime engine, CLI shims, Start Menu shortcuts, and PATH entries.

**What is strictly preserved**:
- All your project source directories and workspaces.
- Registered project list (`projects.json`) and custom user skills.

---

## 🧑‍💻 Developer Setup & Building from Source

To run or build Nexora Skills Manager from source:

```powershell
# 1. Clone repository
git clone https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager.git
cd Nexora-Skills-Manager

# 2. Install desktop dependencies
cd desktop
npm install

# 3. Launch Desktop in development mode
npm start

# 4. Build release artifacts
powershell -ExecutionPolicy Bypass -File ..\scripts\Build-ReleaseArtifacts.ps1
```

---

## 📜 License & Notices

Nexora Skills Manager is distributed under the [MIT License](file:///d:/Nexora%20Skills%20Manager%20GitHub/LICENSE).

For third-party dependencies, open-source attributions, and licenses, see [THIRD_PARTY_NOTICES.md](file:///d:/Nexora%20Skills%20Manager%20GitHub/THIRD_PARTY_NOTICES.md).
