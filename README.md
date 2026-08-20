<p align="center">
  <br>
  <img src="https://img.shields.io/badge/NEXORA-SKILLS%20MANAGER-0B1020?style=for-the-badge&labelColor=2563EB&color=111827" alt="Nexora Skills Manager" />
</p>

<h1 align="center">⚡ NEXORA SKILLS MANAGER</h1>

<h3 align="center">Next-Generation Modular Skill & Agent Orchestration for AI-Assisted Development</h3>

<p align="center">
  <img src="https://img.shields.io/badge/⌘%20FRONTEND-F59E0B?style=for-the-badge&labelColor=FDBA74&color=EA580C" alt="Frontend" />
  <img src="https://img.shields.io/badge/🧩%20BACKEND-8B5CF6?style=for-the-badge&labelColor=C4B5FD&color=7C3AED" alt="Backend" />
  <img src="https://img.shields.io/badge/🐞%20QA%20%2F%20DEBUG-10B981?style=for-the-badge&labelColor=6EE7B7&color=059669" alt="QA Debug" />
  <img src="https://img.shields.io/badge/🔗%20FULL%20STACK-2563EB?style=for-the-badge&labelColor=93C5FD&color=1D4ED8" alt="Full Stack" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/One%20Setup-374151?style=flat-square" alt="One Setup" />
  <img src="https://img.shields.io/badge/Command-nexora-0F766E?style=flat-square" alt="Command nexora" />
  <img src="https://img.shields.io/badge/Legacy%20Support-agpm-6B7280?style=flat-square" alt="Legacy agpm" />
  <img src="https://img.shields.io/badge/Project--Scoped-4B5563?style=flat-square" alt="Project Scoped" />
  <img src="https://img.shields.io/badge/Skills-Modular-2563EB?style=flat-square" alt="Modular Skills" />
  <img src="https://img.shields.io/badge/Windows-Compatible-059669?style=flat-square" alt="Windows Compatible" />
</p>

<p align="center">
  <strong>One setup. Unified CLI. Project-scoped agent intelligence.</strong>
</p>

<p align="center">
  Nexora Skills Manager (formerly <em>Antigravity-Pro-Max-Skill</em>) is a high-performance, project-scoped skill manager for Google Antigravity and modern agentic development environments on Windows. It delivers curated, role-specific engineering skills directly to your project without polluting global environments or overriding built-in agent capabilities.
</p>

---

## 🌟 Product Vision

Modern software engineering with AI agents requires context-aware specialization. Generic prompts fail on complex stacks, while global skill bloat slows agents down and degrades accuracy.

**Nexora Skills Manager** solves this by introducing dynamic, project-scoped skill injection:
- **Zero Global Pollution**: Skills attach exclusively to active project workspaces under `.agents/skills`.
- **Role-Based Modes**: Instantly activate dedicated profiles for Frontend, Backend, QA/Debugging, or Full Stack workflows.
- **Framework Precision**: Granular framework packs for Flutter, FastAPI, Node.js, and modern cloud architectures.
- **Safe Lifecycle**: Switch modes cleanly, monitor active skills with health checks, or reset to baseline with zero footprint.

---

## 🏗 What Nexora Solves

| Challenge | Without Nexora | With Nexora Skills Manager |
|---|---|---|
| **Skill Management** | Manual copying of Markdown prompts and fragmented repos | Single CLI command (`nexora`) to manage and activate packs |
| **Context Pollution** | Hundreds of unneeded skills injected globally into the agent | Strictly scoped to `<project>/.agents/skills` based on active task mode |
| **Workflow Friction** | Reconfiguring IDEs and agent settings for different projects | Switch modes (Frontend, Backend, QA, Fullstack) in seconds |
| **Framework Depth** | Surface-level code generation | Deep architectural patterns (CQRS, TDD, Clean Architecture, Security Auditing) |

---

## 🧭 Architecture & How It Works

```text
                        ┌────────────────────────┐
                        │     nexora (CLI)       │
                        │ (agpm legacy fallback) │
                        └───────────┬────────────┘
                                    │
                                    ▼
                         [Select Target Project]
                                    │
                                    ▼
                         [Select Workspace Mode]
                                    │
        ┌───────────────────┼───────────────────┬───────────────────┐
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
  🎨 FRONTEND          ⚙️ BACKEND         🧪 QA / DEBUG       🔗 FULL STACK
    • Flutter / UI       • API Design        • Unit / Widget     • End-to-End
    • Web / Mobile       • FastApi / Node    • Static Analysis   • All Skill Packs
    • Design Systems     • Security / DB     • Code Review       • Architecture
        │                   │                   │                   │
        └───────────────────┴───────────────────┴───────────────────┘
                                    │
                                    ▼
                    Target Project Workspace Directory
                        <project>/.agents/skills/
                                    │
                                    ▼
                      AI Agent Workflows Activated
```

---

## 📦 Curated Skill Library

Nexora organizes over 50+ specialized engineering skills across dedicated functional domains:

```text
NEXORA SKILLS MANAGER
│
├── 🎨 Frontend-Pro-Max
│   ├── Flutter, Dart, & Native interop
│   ├── Mobile & Responsive Web layouts
│   ├── UI/UX Design Systems & Micro-animations
│   └── Frontend Performance Optimization
│
├── ⚙️ Backend-Pro-Max
│   ├── API Design (REST, GraphQL, gRPC)
│   ├── Clean Architecture & Microservices (CQRS, Event Sourcing)
│   ├── Backend Security & Authentication (OAuth2, OIDC)
│   ├── Database Workflows & SQL Query Optimization
│   └── Resilient Error Handling Patterns
│
├── 🧪 QA-Debug-Pro-Max
│   ├── Unit, Widget, and Integration Testing
│   ├── Runtime Debugging & Crash Diagnostics
│   ├── Static Analysis & Lint Auto-fixing
│   ├── Architecture & Security Auditing
│   └── E2E Testing Patterns
│
├── 🔗 Fullstack-Extras
│   └── Cross-stack feature orchestration & workflow automation
│
├── 🧩 Backend-Frameworks
│   ├── Python (FastAPI, Async Architectures)
│   └── NodeJS (Modern Backend APIs, Microservices)
│
└── 🧭 Loaders
    └── Dynamic interactive project selection, mode switching, & status reporting
```

---

## 🤖 Supported AI Platforms

Nexora Skills Manager adheres to standard agent customization formats (`SKILL.md` specifications with YAML frontmatter):

- 🪐 **Google Antigravity (AGY)**: Native support with project-level `.agents/skills` discovery.
- 💻 **Antigravity IDE & 2.0 Agents**: Seamless hot-reload and task orchestration.
- ⚡ **Claude Code / Anthropic Agent Ecosystems**: Standard YAML frontmatter compliance.
- 🛠 **Cursor, Copilot, & Custom Agent Toolchains**: Compatible with workspace-level skill repositories.

---

## ⚡ Installation

### Option 1: One-Command Setup (PowerShell)

Open **Windows PowerShell** and run:

```powershell
irm agpm.dev/install | iex
```

The installer will:
1. Download and verify the Nexora Skills Manager runtime.
2. Install all skill packs and loaders to the local runtime path (`C:\Antigravity Pro Max Skill`).
3. Register the primary **`nexora`** command in your User `PATH`.
4. Register the backward-compatible **`agpm`** alias.

### Option 2: Manual / Local Installation

Clone or download this repository, then run from an elevated PowerShell terminal:

```powershell
.\install.ps1
```

---

## 💻 CLI Commands

### Primary Command: `nexora`

Launch the interactive project selector and mode manager:

```powershell
nexora
```

#### Planned CLI Capabilities (Roadmap):
- `nexora scan` — Inspect the current project and detect missing or unlinked skills.
- `nexora skills` — List all available skill packs and framework modules.
- `nexora update` — Check for skill pack and core updates from GitHub.
- `nexora doctor` — Verify agent runtime environment, paths, and skill validity.

### Backward Compatibility: `agpm`

For existing workflows and muscle memory, the `agpm` command is fully preserved:

```powershell
agpm
```

*When executed, `agpm` presents a brief migration notice and seamlessly forwards all arguments to the `nexora` engine.*

---

## 🧭 Available Modes

When running `nexora`, you can select:

| Mode | Key Included Skills | Best Used For |
|---|---|---|
| **[1] Frontend Pro Max** | Flutter, Mobile, Web, UI/UX, Responsive Design | Mobile apps, web frontends, component design |
| **[2] Backend Pro Max** | APIs, Clean Architecture, Security, FastAPI/Node | REST/GraphQL backends, microservices, databases |
| **[3] QA / Debug Pro Max** | Unit tests, Mocking, Diagnostics, Auditing | Bug reproduction, test coverage, code reviews |
| **[4] Full Stack Pro Max** | All Frontend + Backend + QA + Orchestration | End-to-end full stack product development |
| **[5] Default Mode** | Cleans all managed skills from project | Returning workspace to default state |
| **[6] Status** | Diagnostic report on active skills and health | Checking current mode and skill counts |

---

## 🔢 Version System

Nexora tracks versioning via dual synchronized manifests:
- **`nexora-version.json`** *(Primary)*
- **`agpm-version.json`** *(Compatibility)*

```json
{
  "coreVersion": "1.0.0",
  "skillPackVersion": "1.0.0"
}
```

Repository scripts automatically synchronize version changes across installer definitions (`Antigravity-Pro-Max-Setup.iss`) and manifests via:

```powershell
powershell -File .\scripts\Sync-Version.ps1
```

---

## 🗺 Roadmap

- [x] **Phase 0: Brand Migration**
  - Establish Nexora Skills Manager identity.
  - Introduce `nexora` CLI command with `agpm` backward compatibility.
  - Dual version synchronization and installer updates.
- [ ] **Phase 1: CLI Expansion**
  - Implement standalone CLI subcommands (`scan`, `skills`, `update`, `doctor`).
  - Add non-interactive flag support (e.g. `nexora --mode fullstack --project .`).
- [ ] **Phase 2: Expanded Framework Ecosystem**
  - Add Go, Rust, and Next.js / React 19 framework packs.
  - Custom user skill registry and import support.
- [ ] **Phase 3: Multi-Platform Installer & Cross-Platform Support**
  - Native installer enhancements (WinGet / MSIX).
  - macOS and Linux compatibility runners.

---

## 🛡 Safe Installation & Security

Nexora Skills Manager is built with security-first principles:
- **Zero Credential Requests**: Never requests GitHub tokens, passwords, or private API keys.
- **Local Isolation**: All skill actions take place locally within your chosen project folder.
- **Non-Destructive**: Never deletes user source code. Skills are installed into `.agents/skills` and can be reset at any time with Mode `[5]`.

---

## 📜 Open-Source Attribution & Notices

Nexora Skills Manager packages and coordinates high-quality open-source skill content from various upstream sources.
For full licensing terms and attribution details, see [THIRD_PARTY_NOTICES.md](file:///d:/Nexora%20Skills%20Manager%20GitHub/THIRD_PARTY_NOTICES.md) and the [third-party-licenses](file:///d:/Nexora%20Skills%20Manager%20GitHub/third-party-licenses) directory.

---

## ⚠️ Disclaimer

Nexora Skills Manager is an independent community project and is not affiliated with or endorsed by Google. All trademarks belong to their respective owners.

<p align="center">
  <br>
  <strong>⚡ NEXORA SKILLS MANAGER</strong>
  <br>
  <em>Next-Generation Modular Skill Orchestration</em>
</p>
