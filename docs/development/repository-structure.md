# Nexora Skills Manager — Repository Structure & Organization Guide

## 1. Top-Level Directory Organization
The authoritative single repository for Nexora Skills Manager is structured as follows:

```text
Nexora-Skills-Manager/
├── desktop/                  # Electron main process, preload, IPC bridge host, and update transport
│   ├── bridge/               # Child process bridge host and stdio communications
│   ├── ipc/                  # Electron IPC channel bindings
│   ├── registry/             # 29 frozen public bridge operation schemas
│   ├── updates/              # Phase 8 secure update transport and manifest client
│   ├── tests/                # Electron, security, and packaging test suites
│   ├── package.json          # Desktop dependencies and metadata
│   └── electron-builder.yml  # Production ASAR and Windows packaging configuration
│
├── ui/                       # Frontend application (Vanilla ES Modules + Bento-Grid CSS)
│   ├── js/
│   │   ├── components/       # Reusable UI widgets (Header, Topbar, Modals, Badges)
│   │   ├── screens/          # Dashboard, Projects, Skills, Activity, Maintenance, Settings, Update Center
│   │   ├── bridge/           # LiveBridgeAdapter & MockBridgeAdapter
│   │   └── updates/          # Update error mapper and formatting utilities
│   ├── css/                  # Styling, theme tokens, and typography
│   ├── tests/                # UI and screen unit test suites
│   └── index.html            # Main desktop window HTML host
│
├── engine/                   # Core PowerShell Application Engine
│   ├── Adapters/             # Antigravity, Cursor, and GitHub Copilot deployment adapters
│   ├── Application/          # ApplicationService, ProjectRegistryService, StatusManager
│   ├── CLI/                  # `nexora` and `agpm` command router and parsers
│   ├── Core/                 # Engine lifecycle and EventBus
│   ├── Detection/            # Stack detection and confidence scoring
│   ├── Install/              # Core NexoraInstaller.ps1 engine
│   ├── Lifecycle/            # Skill recommendation, selection, activation, and removal
│   ├── Metadata/             # SKILL.md YAML frontmatter parser
│   ├── Recommendations/      # Mode-based skill recommendation heuristics
│   ├── Storage/              # ProjectMemory, GlobalSkillRegistry, SkillRegistry
│   ├── Tests/                # Pester unit and regression test suites
│   ├── Update/               # External update helper (NexoraUpdateHelper.ps1)
│   ├── Updates/              # UpdateService.ps1 (manifest validation, download, verification)
│   └── Utils/                # PathUtils, OutputUtils, ProcessUtils
│
├── Frontend-Pro-Max/         # Curated skill pack: Flutter, Dart, Responsive Web, UI/UX Design System
├── Backend-Pro-Max/          # Curated skill pack: Clean Architecture, API Design, Security, DB
├── QA-Debug-Pro-Max/         # Curated skill pack: Testing, Scientific Debugging, Test Mocking
├── Fullstack-Extras/         # Curated skill pack: Cross-stack automation & feature workflows
├── Backend-Frameworks/       # Curated skill pack: FastAPI, Node.js microservices
├── third-party-licenses/     # Upstream open-source attribution license texts
│
├── scripts/                  # Release build, version sync, and validation utilities
│   ├── Build-ReleaseArtifacts.ps1
│   ├── Build-ReleasePackage.ps1
│   ├── Sync-Version.ps1
│   ├── Sync-WinGetManifests.ps1
│   └── Validate-CleanMachineReleaseCandidate.ps1
│
├── assets/
│   └── branding/             # Destination for canonical NexoraSkillsManager.ico
│
├── docs/                     # Technical specifications, phase reports, and development workflows
│   ├── development/          # Branch ownership, workflow, and structure guides
│   ├── repository-migration/ # Multi-repo architectural blueprints and component specifications
│   └── phase-*/              # Phase audit logs and verified deliverables
│
├── setup.ps1                 # Canonical single-command public installer
├── install.ps1               # Local runtime installation script
├── uninstall.ps1             # Safe uninstaller with project data preservation
├── nexora-version.json       # Core product version authority (1.0.0)
├── agpm-version.json         # Backward compatibility version manifest
├── README.md                 # Public documentation and quick-start guide
├── RELEASE_NOTES.md          # Official v1.0.0 release notes
├── CHANGELOG.md              # Keep a Changelog compliant history
├── LICENSE                   # MIT License
└── THIRD_PARTY_NOTICES.md    # Third-party software notices
```

---

## 2. Area Ownership & Encapsulation Rules
1. **Desktop Host (`desktop/`)**: Owns the Electron runtime, packaging boundary, and process lifecycle. It invokes `engine/` only through the stdio bridge protocol.
2. **User Interface (`ui/`)**: Pure renderer process. Zero direct Node.js or OS access; interacts exclusively via `window.nexoraBridge`.
3. **Core Engine (`engine/`)**: Self-contained PowerShell service. Exposes commands to the CLI and JSON-RPC bridge.
4. **Skill Packs (`*-Pro-Max/`, `*-Extras/`, `*-Frameworks/`)**: Pure declarative markdown instructions and YAML metadata consumed dynamically by the engine.
5. **Installer & Scripts (`setup.ps1`, `scripts/`)**: Handles release packaging, atomic deployments, repair, and rollback.
