<p align="center">
  <br>
  <strong>⚡</strong>
</p>

<h1 align="center">
  ANTIGRAVITY PRO MAX SKILL
</h1>

<h3 align="center">
  Professional Skill Packs for Google Antigravity
</h3>

<p align="center">
  🎨 Frontend &nbsp;&nbsp; • &nbsp;&nbsp;
  ⚙️ Backend &nbsp;&nbsp; • &nbsp;&nbsp;
  🧪 QA / Debug &nbsp;&nbsp; • &nbsp;&nbsp;
  🔗 Full Stack
</p>

<p align="center">
  <strong>One setup. One command. Project-scoped skills.</strong>
</p>

<p align="center">
  A portable Windows skill-pack manager designed to give each
  Antigravity project the right development skills without replacing
  Antigravity's built-in skills.
</p>

---



# 🚀 What Is Antigravity Pro Max?

**Antigravity Pro Max Skill** is a project-scoped development skill manager for Google Antigravity.

It organizes specialized development skills into focused packs so that a project can receive only the tools required for its current type of work.

Instead of manually managing dozens of skills, you can run:

```text
agpm
```

and choose the development mode you need.

Antigravity Pro Max currently supports:

- 🎨 Frontend development
- ⚙️ Backend development
- 🧪 QA and debugging
- 🔗 Full-stack development
- 🐍 Python / FastAPI backend support
- 🟩 Node.js backend support
- 📱 Flutter and mobile development
- 🌐 Web development
- 🔐 Backend security
- 🧪 Testing and static analysis
- 🏗 Architecture and optimization

---
# ⚡ One-Command Setup

Open **Windows PowerShell** and run:

```powershell
irm https://raw.githubusercontent.com/abhishek01032007-pixel/Antigravity-Pro-Max-Skill/main/setup.ps1 | iex
```

> Copy the command above, paste it into PowerShell, and press **Enter**.

The installer automatically downloads, prepares, installs, and verifies the Antigravity Pro Max runtime.

No project is selected or modified during installation.

---

# 📍 Where Antigravity Pro Max Is Installed

The Antigravity Pro Max runtime is installed by default at:

```text
C:\Antigravity Pro Max Skill
```

The runtime contains the main development skill packs and loader system.

```text
C:\Antigravity Pro Max Skill
│
├── Backend-Frameworks
├── Backend-Pro-Max
├── Frontend-Pro-Max
├── Fullstack-Extras
├── Loaders
├── QA-Debug-Pro-Max
└── Start-Antigravity-Pro-Max.bat
```

The permanent `agpm` launcher is registered separately for the current Windows user at:

```text
%LOCALAPPDATA%\AntigravityProMax\bin
```

For example, Windows automatically resolves `%LOCALAPPDATA%` for each user.

No personal Windows username is hardcoded into the project.

---

# ▶️ Start Antigravity Pro Max

After installation, open PowerShell and type:

```powershell
agpm
```

This opens the Antigravity Pro Max project selector.

You do not need to type the complete installation path.

---

# 🧠 How It Works

```text
                    INSTALL
                       │
                       ▼
           Antigravity Pro Max Runtime
                       │
                       ▼
                    agpm
                       │
                       ▼
              Select Your Project
                       │
                       ▼
               Select Work Mode
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
 🎨 FRONTEND       ⚙️ BACKEND      🧪 QA / DEBUG
   PRO MAX           PRO MAX          PRO MAX
       │               │               │
       └───────────────┼───────────────┘
                       │
                       ▼
                 🔗 FULL STACK
                    PRO MAX
                       │
                       ▼
             Project Skill Folder
                       │
                       ▼
               .agents\skills
```

Installation and project activation are separate operations.

The installer prepares Antigravity Pro Max.

The `agpm` command is what you use later when you want to configure a project.

---

# 🎨 Frontend Pro Max

Frontend Pro Max is designed for user-facing application development.

It includes skills focused on:

- Flutter development
- Mobile application development
- Web frontend development
- UI/UX design
- Responsive layouts
- Flutter widgets
- Navigation and routing
- Localization
- JSON serialization
- HTTP integration
- Frontend architecture
- UI enhancement
- Web performance optimization

### Recommended for

```text
Flutter Apps
Mobile Applications
Web Interfaces
Dashboards
Responsive Websites
Frontend UI/UX Work
```

---

# ⚙️ Backend Pro Max

Backend Pro Max provides architecture, API, data, workflow, and security-focused development skills.

It includes support for:

- API design
- Backend architecture
- Authentication
- Authorization patterns
- Backend security
- Database workflows
- SQL optimization
- Error handling
- Microservices
- CQRS
- Event stores
- Saga orchestration
- Workflow orchestration
- Backend documentation

### Backend Framework Support

Antigravity Pro Max also contains optional framework skills for:

```text
🐍 Python / FastAPI
🟩 Node.js
```

These framework skills can be selected when they are relevant to the backend project.

---

# 🧪 QA / Debug Pro Max

QA / Debug Pro Max is focused on software quality, testing, debugging, code review, and regression prevention.

It includes skills for:

- Unit testing
- Flutter widget testing
- Flutter integration testing
- Test mocks
- Runtime debugging
- Static analysis
- Layout issue debugging
- Package conflict resolution
- Code review
- Security auditing
- Test scaffolding
- E2E testing patterns
- Codebase optimization

### Recommended for

```text
Bug Fixing
Regression Testing
Flutter Testing
Static Analysis
Security Review
Code Quality Validation
Runtime Error Investigation
```

---

# 🔗 Full Stack Pro Max

Full Stack Pro Max is designed for projects that require frontend, backend, testing, and orchestration together.

It combines the major Antigravity Pro Max development capabilities:

```text
🎨 Frontend Pro Max
        +
⚙️ Backend Pro Max
        +
🧪 QA / Debug Pro Max
        +
🔗 Fullstack Extras
```

Full Stack mode is useful for complete product development where multiple parts of the application need to be handled together.

---

# 📦 Project-Scoped Skill Management

Antigravity Pro Max does not need to load every skill globally.

When you select a project, the required managed skills are placed under:

```text
<Your Project>\.agents\skills
```

Example:

```text
MyProject
│
├── lib
├── test
├── assets
│
└── .agents
    └── skills
        ├── ...
        ├── ...
        └── ...
```

This keeps the active skill environment connected to the project you selected.

---

# 🛡️ Safe Installation Design

Antigravity Pro Max is designed to avoid unnecessary changes during setup.

### During installation

The installer:

```text
✓ Downloads the runtime
✓ Verifies required files
✓ Installs the skill packs
✓ Creates the AGPM launcher
✓ Registers the AGPM command
✓ Cleans temporary installation files
```

The installer does **not**:

```text
✗ Select an Antigravity project
✗ Automatically activate a project mode
✗ Replace Antigravity built-in skills
✗ Require a hardcoded Windows username
✗ Store GitHub passwords or access tokens
```

---

# ⚡ Simple Workflow

Using Antigravity Pro Max is designed to stay simple.

### 1. Install once

Run the setup command at the top of this README.

### 2. Start when needed

```powershell
agpm
```

### 3. Select a project

Choose the project folder you want Antigravity Pro Max to manage.

### 4. Select your mode

Choose the development environment required for the project.

```text
Frontend Pro Max
Backend Pro Max
QA / Debug Pro Max
Full Stack Pro Max
Default Antigravity
Status
```

### 5. Continue development

The appropriate managed skills are prepared for that project.

---

# 🖥️ Example

For a Flutter UI project:

```text
agpm
  ↓
Select Flutter Project
  ↓
Frontend Pro Max
  ↓
Optional QA / Debug support
  ↓
Frontend skills ready
```

For a backend API:

```text
agpm
  ↓
Select Backend Project
  ↓
Backend Pro Max
  ↓
Select backend framework when required
  ↓
Optional QA / Debug support
  ↓
Backend skills ready
```

For a complete application:

```text
agpm
  ↓
Select Project
  ↓
Full Stack Pro Max
  ↓
Frontend + Backend + QA + Fullstack skills
```

---

# 🧩 Skill Architecture

```text
ANTIGRAVITY PRO MAX
│
├── 🎨 Frontend-Pro-Max
│   ├── Flutter
│   ├── Mobile
│   ├── Web
│   ├── UI / UX
│   └── Performance
│
├── ⚙️ Backend-Pro-Max
│   ├── APIs
│   ├── Architecture
│   ├── Authentication
│   ├── Security
│   ├── Databases
│   └── Workflows
│
├── 🧪 QA-Debug-Pro-Max
│   ├── Unit Tests
│   ├── Widget Tests
│   ├── Integration Tests
│   ├── Debugging
│   ├── Static Analysis
│   └── Security Audit
│
├── 🔗 Fullstack-Extras
│   └── Cross-stack orchestration
│
├── 🐍 Backend-Frameworks
│   ├── Python
│   │   ├── Async Python
│   │   └── FastAPI
│   │
│   └── NodeJS
│       └── Node.js Backend Patterns
│
└── 🧭 Loaders
    ├── Project Selection
    ├── Mode Selection
    └── Skill Activation
```

---

# 💻 Requirements

Antigravity Pro Max currently targets:

```text
Operating System : Windows
Shell            : Windows PowerShell
Platform         : Google Antigravity
Internet         : Required during installation
```

The installer downloads the required runtime directly from this public GitHub repository.

---

# 🔄 Reinstall / Update

Running the same setup command again allows the installer to refresh the Antigravity Pro Max runtime using the current repository version.

The installer first detects an existing runtime and then refreshes the managed runtime components.

Your project is not automatically selected during this process.

---

# 📁 Repository Structure

```text
Antigravity-Pro-Max-Skill
│
├── Backend-Frameworks
│   ├── NodeJS
│   └── Python
│
├── Backend-Pro-Max
├── Frontend-Pro-Max
├── Fullstack-Extras
├── Loaders
├── QA-Debug-Pro-Max
│
├── third-party-licenses
│
├── Start-Antigravity-Pro-Max.bat
├── setup.ps1
├── install.ps1
├── THIRD_PARTY_NOTICES.md
├── LICENSE
└── README.md
```

---

# 🔐 Security

Antigravity Pro Max is designed so that public installation does not require users to provide:

```text
GitHub Personal Access Tokens
API Keys
Passwords
Private Keys
Project Secrets
```

The installation script uses the public repository to retrieve the runtime.

Application secrets should always remain inside the appropriate secure backend or environment configuration and should never be placed inside frontend skill instructions.

---

# 📜 Open-Source Attribution

Antigravity Pro Max includes and organizes open-source skill material from multiple projects.

Third-party notices and applicable licenses are maintained in:

```text
THIRD_PARTY_NOTICES.md
```

and:

```text
third-party-licenses/
```

Please review those files for detailed attribution and licensing information.

---

# ⚠️ Disclaimer

Antigravity Pro Max Skill is a community development project.

It is **not an official Google or Google Antigravity product**.

Google, Antigravity, Flutter, Dart, Node.js, Python, FastAPI, and other referenced names belong to their respective owners.

---

# ✅ Current Status

| Component | Status |
|---|---|
| ⚡ Setup Installer | ✅ Working |
| 🎨 Frontend Pro Max | ✅ Available |
| ⚙️ Backend Pro Max | ✅ Available |
| 🧪 QA / Debug Pro Max | ✅ Available |
| 🔗 Full Stack Pro Max | ✅ Available |
| 🐍 Python / FastAPI | ✅ Available |
| 🟩 Node.js | ✅ Available |
| 🧭 Project Selector | ✅ Working |
| ⚡ `agpm` Command | ✅ Working |
| 📦 Project-Scoped Activation | ✅ Supported |

---

<p align="center">
  <br>
  <strong>⚡ ANTIGRAVITY PRO MAX SKILL</strong>
</p>

<p align="center">
  <strong>
    Frontend • Backend • QA / Debug • Full Stack
  </strong>
</p>

<p align="center">
  One setup. One command. The right skills for every project.
</p>

<p align="center">
  Built for a cleaner Google Antigravity development workflow.
</p>
