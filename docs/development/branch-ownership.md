# Nexora Skills Manager — Branch Ownership & Contribution Model

## 1. Branch Strategy
To facilitate parallel development streams while maintaining strict release stability, the repository uses **five primary branches**:

| Branch | Domain / Focus Area | Permitted Changes | Merge Target |
| :--- | :--- | :--- | :--- |
| **`main`** | **Production Baseline** | Integrated, release-ready codebase. Direct commits prohibited. | Release Tags |
| **`skills`** | **Skill Packs & Metadata** | Built-in skills, SKILL.md specs, frontmatter, categories. | `main` via PR |
| **`ui`** | **Desktop UI & Presentation** | Screens, components, CSS styles, client routing, renderer tests. | `main` via PR |
| **`engine`** | **Core Engine & Adapters** | ApplicationService, detection, recommendation, adapters, CLI. | `main` via PR |
| **`installer`** | **Setup & Release Packaging** | `setup.ps1`, `uninstall.ps1`, `NexoraInstaller.ps1`, packaging scripts. | `main` via PR |

---

## 2. Feature & Fix Branch Conventions
Contributors and automated agents must branch off the corresponding workstream:

- **Skills Workstream**: `skills/<skill-name>`, `skills/metadata-update`
- **UI Workstream**: `ui/<screen-name>`, `ui/theme-refinements`
- **Engine Workstream**: `engine/<feature-name>`, `adapters/<platform-name>`
- **Installer Workstream**: `installer/<feature-name>`, `installer/repair-logic`
- **Cross-Cutting Fixes**: `bug-fixes/<issue-description>`

---

## 3. Promotion & Integration Lifecycle
```text
main (Protected)
  ▲
  │ (Full 1,204+ Regression Pass & Review Approval)
  ├── Workstream Branch (skills | ui | engine | installer)
  │     ▲
  │     │ (Local Unit Tests Pass)
  │     └── Feature / Fix Branch (e.g., ui/settings-polish)
```

No code enters `main` without:
1. All 25 JavaScript suites passing.
2. All 18 Pester backend suites passing.
3. Successful release package assembly.
4. Clean working tree and zero secret/path leaks.
