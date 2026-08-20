# 🟢 Antigravity Pro Max Skill

> Project-scoped Frontend, Backend, QA/Debug and Full Stack skill packs for Google Antigravity.

Antigravity Pro Max Skill helps you enable only the advanced development skills needed for a specific project.

Instead of loading every skill globally, Pro Max copies the selected skills only into the project you choose.

---

## ⚡ One-Command Setup

Open **PowerShell** and paste this single command:

```powershell
$t=Join-Path $env:TEMP ("agpm-"+[guid]::NewGuid().ToString("N")); New-Item -ItemType Directory -Path $t -Force | Out-Null; $z=Join-Path $t "repo.zip"; Invoke-WebRequest "https://github.com/abhishek01032007-pixel/Antigravity-Pro-Max-Skill/archive/refs/heads/main.zip" -OutFile $z -UseBasicParsing; Expand-Archive $z -DestinationPath $t -Force; $r=Get-ChildItem $t -Directory | Where-Object Name -like "Antigravity-Pro-Max-Skill-*" | Select-Object -First 1; powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $r.FullName "install.ps1"); Remove-Item $t -Recurse -Force -ErrorAction SilentlyContinue
```

### What this command does

```text
Downloads the latest public repository
        ↓
Extracts it to a temporary folder
        ↓
Runs install.ps1
        ↓
Installs Antigravity Pro Max Skill
        ↓
Deletes the temporary download
```

No GitHub token, password, API key or private credential is required.

---

## 📍 Installation Location

Antigravity Pro Max Skill is installed to:

```text
C:\Antigravity Pro Max Skill
```

Installation does **not** automatically select or modify any Antigravity project.

---

## ▶️ Start Antigravity Pro Max

After installation, run:

```powershell
& "C:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat"
```

### What this command does

It opens the Antigravity Pro Max project selector.

You then:

```text
Select Project
      ↓
Select Mode
      ↓
Skills are applied only to that project
```

---

# 🧠 Available Modes

## 1. 🎨 Frontend Pro Max

Use Frontend mode for:

- Flutter applications
- Mobile UI
- Web frontend
- Responsive layouts
- Routing
- Localization
- Accessibility
- UI/UX implementation
- Widget architecture
- Frontend performance

After selecting Frontend mode, Pro Max can optionally add QA / Debug skills.

### Frontend behavior

```text
Frontend Pro Max
       +
Optional QA / Debug Pro Max
```

---

## 2. ⚙️ Backend Pro Max

Use Backend mode for:

- REST APIs
- Authentication
- Databases
- SQL
- Backend architecture
- Backend security
- Microservices
- Event-driven systems
- Workflow orchestration

Backend mode also supports optional framework-specific skills.

### Framework choices

```text
Generic Backend
Python / FastAPI
Node.js
```

### Backend behavior

```text
Backend Pro Max
       +
Optional QA / Debug Pro Max
       +
Optional Backend Framework
```

---

## 3. 🧪 QA / Debug Pro Max

Use QA / Debug mode for:

- Unit testing
- Widget testing
- Integration testing
- Static analysis
- Runtime debugging
- Code review
- Security auditing
- Regression prevention
- Test scaffolding

### QA mode behavior

```text
QA / Debug Pro Max only
```

---

## 4. 🧩 Full Stack Pro Max

Use Full Stack mode for complex projects that require frontend, backend and testing together.

It activates:

```text
Frontend Pro Max
       +
Backend Pro Max
       +
QA / Debug Pro Max
       +
Fullstack Extras
       +
Optional Backend Framework
```

---

## 5. 🟢 Default Antigravity

Default mode removes only the Pro Max-managed skills from the selected project.

It does not remove:

```text
Antigravity built-in skills
Unrelated project skills
User-created skills outside Pro Max management
```

---

## 6. 📊 Status

Status mode shows information about the selected project without changing it.

It reports:

```text
Selected Project
Current Mode
Active Packs
Backend Framework
Skill Count
Validation State
```

---

# 🎯 Project-Scoped Design

The Pro Max library itself is installed once:

```text
C:\Antigravity Pro Max Skill
```

But selected skills are copied only into:

```text
<your-project>\.agents\skills
```

This means:

```text
Simple Project
    ↓
Normal Antigravity

Large Frontend Project
    ↓
Frontend Pro Max

Backend Project
    ↓
Backend Pro Max

Complex Full Stack Project
    ↓
Full Stack Pro Max
```

This avoids loading every advanced skill into every project.

---

# 📦 Repository Structure

```text
Antigravity-Pro-Max-Skill/
│
├── Backend-Frameworks/
│   ├── Python/
│   └── NodeJS/
│
├── Backend-Pro-Max/
├── Frontend-Pro-Max/
├── Fullstack-Extras/
├── Loaders/
├── QA-Debug-Pro-Max/
├── third-party-licenses/
│
├── .gitignore
├── install.ps1
├── LICENSE
├── README.md
├── Start-Antigravity-Pro-Max.bat
└── THIRD_PARTY_NOTICES.md
```

---

# 🛠️ Useful Commands

## Open the installed folder

```powershell
explorer "C:\Antigravity Pro Max Skill"
```

### What it does

Opens the installed Antigravity Pro Max folder in Windows File Explorer.

---

## Start Pro Max

```powershell
& "C:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat"
```

### What it does

Starts the project selector and mode-selection interface.

---

## Check whether Pro Max is installed

```powershell
Test-Path "C:\Antigravity Pro Max Skill"
```

### Expected result

```text
True
```

`True` means the installation folder exists.

---

## View installed files

```powershell
Get-ChildItem "C:\Antigravity Pro Max Skill"
```

### What it does

Lists the folders and files installed by Antigravity Pro Max.

---

## Check the launcher

```powershell
Test-Path "C:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat"
```

### Expected result

```text
True
```

---

## Check Frontend Pro Max

```powershell
Test-Path "C:\Antigravity Pro Max Skill\Frontend-Pro-Max"
```

---

## Check Backend Pro Max

```powershell
Test-Path "C:\Antigravity Pro Max Skill\Backend-Pro-Max"
```

---

## Check QA / Debug Pro Max

```powershell
Test-Path "C:\Antigravity Pro Max Skill\QA-Debug-Pro-Max"
```

---

## Check Backend Frameworks

```powershell
Test-Path "C:\Antigravity Pro Max Skill\Backend-Frameworks"
```

---

# 🔄 Update / Reinstall

To download the latest public version again, run the same one-command installer:

```powershell
$t=Join-Path $env:TEMP ("agpm-"+[guid]::NewGuid().ToString("N")); New-Item -ItemType Directory -Path $t -Force | Out-Null; $z=Join-Path $t "repo.zip"; Invoke-WebRequest "https://github.com/abhishek01032007-pixel/Antigravity-Pro-Max-Skill/archive/refs/heads/main.zip" -OutFile $z -UseBasicParsing; Expand-Archive $z -DestinationPath $t -Force; $r=Get-ChildItem $t -Directory | Where-Object Name -like "Antigravity-Pro-Max-Skill-*" | Select-Object -First 1; powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $r.FullName "install.ps1"); Remove-Item $t -Recurse -Force -ErrorAction SilentlyContinue
```

The installer handles installation into:

```text
C:\Antigravity Pro Max Skill
```

It does not automatically change any Antigravity project.

---

# 🔐 Security

Antigravity Pro Max is designed to keep installation and project activation separate.

The installer:

```text
✓ Downloads only from this public repository
✓ Does not require a GitHub token
✓ Does not ask for passwords
✓ Does not request API keys
✓ Does not modify Antigravity built-in skills
✓ Does not automatically select a project
✓ Does not automatically modify a project
✓ Removes temporary download files
```

The following are public routing information, not secrets:

```text
GitHub username
Repository name
Branch name
Public GitHub URL
```

Never store these inside skill files:

```text
API keys
Passwords
GitHub PATs
Private keys
Service-role secrets
Access tokens
Credentials
```

---

# 🛡️ Safe Project Switching

When switching Pro Max modes, the loader manages only the skill folders controlled by Antigravity Pro Max.

The intended behavior is:

```text
Current Pro Max Mode
        ↓
Remove managed Pro Max skills
        ↓
Install newly selected Pro Max skills
        ↓
Leave unrelated skills untouched
```

Antigravity built-in skills must not be removed.

---

# 📜 License

Original Antigravity Pro Max components such as the:

```text
Skill-pack manager
Loader
Installer
Launcher
Project organization
Documentation structure
```

are covered by this repository's `LICENSE`.

Third-party skill content remains under its original upstream licenses.

See:

```text
THIRD_PARTY_NOTICES.md
third-party-licenses/
```

---

# 🟢 Antigravity Pro Max Skill

### Powerful skills when you need them.  
### Normal Antigravity when you don't.

If this project helps your workflow, consider giving the repository a ⭐.
