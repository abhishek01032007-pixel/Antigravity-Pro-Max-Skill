# Changelog

All notable changes to **Nexora Skills Manager** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-22

### Added
- **Desktop Application Host**: Full Electron-based Windows desktop client with dark mode and responsive bento-grid layouts.
- **Project Intelligence Engine**: Automated stack detection and confidence scoring for Flutter, Node.js, Python, FastAPI, and more.
- **Curated Skill Catalog**: 48+ engineering skills categorized by domain (Frontend, Backend, QA/Diagnostics, Architecture, Mobile).
- **Multi-Platform Deployment**: Direct skill deployment to Google Antigravity (`.agents/skills/`), Cursor (`.cursor/rules/`), and GitHub Copilot (`.github/copilot-instructions.md`).
- **Unified Windows CLI**: `nexora` command for terminal-driven project analysis, skill listing, and health checks, with backward-compatible `agpm` forwarder.
- **System Health Diagnostics (Doctor)**: Multi-point verification of runtime engines, platform adapters, storage paths, and PATH registrations.
- **Secure Remote Update System**: User-initiated update checking, SHA-256 integrity verification, and transactional installation with rollback support.
- **Windows Bootstrap & Uninstaller**: One-command PowerShell setup (`setup.ps1`) and non-destructive uninstaller (`uninstall.ps1`) preserving user project directories.
