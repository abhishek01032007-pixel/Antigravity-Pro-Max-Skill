# Nexora Skills Manager v1.0.0 — Release Notes

Nexora Skills Manager v1.0.0 introduces a local-first desktop application and unified CLI for managing, customizing, and deploying engineering skills across Google Antigravity, Cursor, and GitHub Copilot.

---

## 🚀 Highlights

- **Native Windows Desktop Host**: Electron-based control center with dark mode, real-time health indicators, and high-contrast responsive layouts.
- **Deep Project Intelligence**: Scans and identifies frameworks, languages, and architecture markers without transmitting source code off-machine.
- **Role-Based Working Modes**: Dedicated engineering modes (Frontend, Backend, QA/Debug, Fullstack) with contextual development targets.
- **Curated Engineering Library**: 48 role-specific skills spanning Flutter, FastAPI, Node.js, Clean Architecture, Security, and Testing.
- **Multi-Platform Skill Deployment**: Automatically outputs structured skill instructions to Google Antigravity (`.agents/skills/`), Cursor (`.cursor/rules/`), and GitHub Copilot (`.github/copilot-instructions.md`).
- **Unified Windows CLI (`nexora`)**: Instant terminal access for interactive skill management, scanning, and runtime health diagnostics with legacy `agpm` forwarder.
- **Secure Remote Update System**: Cryptographic SHA-256 verification, HTTPS downloads from trusted GitHub releases, parameterless bridge invocations, and automatic rollback on installation fault.
- **Transactional Installation**: Self-contained Windows installation with user PATH configuration, Start Menu integration, and project-preserving uninstaller.

---

## 🖥️ Desktop Experience

- **Dashboard**: Centralized hub presenting project summaries, confidence scores, detected tech stacks, and active skill statuses.
- **Project Analysis**: Deep stack inspection detecting markers like `pubspec.yaml`, `package.json`, and `requirements.txt`.
- **Skill Library & Detail Views**: Search, filter, and inspect skill overviews, guidelines, and target platform compatibilities.
- **Cross-Project Usage**: Monitor which skills are shared across active workspaces and manage multi-project skill assignments.
- **Activity Log**: Chronological auditing of skill activations, deactivations, project scans, and maintenance actions.
- **System Health (Doctor)**: Multi-category diagnostics evaluating runtime engine status, platform adapters, CLI shims, and storage health.
- **Settings & About**: Live version resolution, AI platform toggle preferences, runtime path inspection, and open-source licensing access.
- **Update Center**: Explicit update checking, progress-tracked downloads, cancellation support, and restart workflows.

---

## 🤖 AI Platform Support

Nexora formats and deploys active engineering skills to standard workspace configurations:

- **Google Antigravity**: Native project-level `.agents/skills/<skill>/SKILL.md` with YAML frontmatter.
- **Cursor**: Structured MDC rules in `.cursor/rules/<skill>.mdc`.
- **GitHub Copilot**: Consolidated workspace instructions in `.github/copilot-instructions.md`.

---

## 🔒 Safety, Reliability & Privacy

- **100% Local Processing**: All project scanning and skill deployments occur locally on your machine.
- **Zero Telemetry**: Nexora does not transmit project contents, source code, or telemetry.
- **Zero Credential Requests**: Never requests private API keys, passwords, or tokens.
- **Non-Destructive Operations**: Uninstaller and updater workflows strictly preserve user project folders, workspaces, and custom skills.

---

## ⚠️ Known Limitations

- **Platform Target**: Currently available for Windows 10 and Windows 11 (x64) systems.
- **Code Signing**: Initial v1.0.0 builds are not Authenticode-signed and may display a standard Windows Defender SmartScreen notice during first launch.
