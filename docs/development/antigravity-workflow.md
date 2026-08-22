# Nexora Skills Manager — Antigravity Agent Workflow & Startup Protocol

## 1. Mandatory Agent Startup Procedure
Whenever an AI agent or pair programmer begins work on this repository, execute the following protocol:

```powershell
# 1. Inspect repository state
git status

# 2. Check current active branch
git branch --show-current

# 3. Synchronize with remote
git pull --ff-only

# 4. Switch to the relevant domain workstream branch
# For Skill tasks:
git checkout skills
# For UI/Renderer tasks:
git checkout ui
# For Backend/Engine tasks:
git checkout engine
# For Packaging/Installer tasks:
git checkout installer
```

---

## 2. Workstream Mapping & Domain Guidelines

- **Skills Tasks**: Confined strictly to `Frontend-Pro-Max/`, `Backend-Pro-Max/`, `QA-Debug-Pro-Max/`, `Fullstack-Extras/`, `Backend-Frameworks/`.
- **UI Tasks**: Confined strictly to `ui/` and UI test suites.
- **Engine Tasks**: Confined strictly to `engine/` and Pester test suites.
- **Installer Tasks**: Confined strictly to `setup.ps1`, `install.ps1`, `uninstall.ps1`, `scripts/`, `engine/Install/`.

---

## 3. Pre-Commit Verification Checklist
Before proposing or merging any change:
- [ ] Run domain-specific unit tests.
- [ ] Run full JS test aggregator: `node scratch/run-all-js-tests.js`.
- [ ] Run backend Pester suite: `powershell -ExecutionPolicy Bypass -File scratch/run-pester.ps1`.
- [ ] Verify zero hardcoded developer paths or embedded credentials.
- [ ] Verify `git diff --check` passes with zero whitespace or line-ending errors.
