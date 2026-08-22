# Nexora Skills Manager — Multi-Repository Branch & Contribution Strategy

## 1. Branch Strategy across All Repositories
Every repository follows a standardized Git branching convention:

- **`main`**: Protected, stable production branch. No direct commits permitted.
- **Feature Branches**:
  - `Nexora-Skills`: `skills/<skill-name>`, `skills/metadata-v2`
  - `Nexora-Desktop`: `ui/<screen-name>`, `desktop/<feature-name>`
  - `Nexora-Engine`: `engine/<capability-name>`, `adapters/<platform-name>`
  - `Nexora-Windows-Installer`: `installer/<feature-name>`, `assembly/<pipeline-name>`
- **Bug Fix Branches**:
  - `bug-fixes/<issue-description>`

---

## 2. Review, Test & Merge Workflow
1. Branch from `main`.
2. Implement code changes with focused unit and regression tests.
3. Run component test suite locally.
4. Open Pull Request to `main`.
5. Require automated test pass and review approval before merge.
6. Trigger assembly testing in `Nexora-Windows-Installer` for cross-component changes.
