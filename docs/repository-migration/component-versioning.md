# Nexora Skills Manager — Component Versioning Specification

## 1. Product Version vs. Component Versions
Nexora decouples the public user-facing **Product Version** from independent **Component Versions**:

- **Product Version** (e.g. `v1.0.0`): The overall released distribution version installed by users.
- **Desktop Version** (e.g. `v1.0.0`): The Electron runtime, UI shell, and IPC bridge layer.
- **Engine Version** (e.g. `v1.0.0`): The core business logic, recommendation engine, and platform adapters.
- **Skills Version** (e.g. `v1.0.0`): The catalog of built-in skill packs and specifications.
- **Installer Version** (e.g. `v1.0.0`): The Windows installation, repair, and rollback system.

---

## 2. Compatibility Enforcements

1. **Engine API Version (`engineApiVersion`)**:
   - Monotonically increasing integer representing the IPC/Bridge contract.
   - Desktop specifies `requiredEngineApiVersion: 1`.
   - If Engine increments `engineApiVersion` (e.g. to `2`), Desktop must be updated to support it before standalone Engine deployment is permitted.

2. **Skills Minimum Engine Version (`minimumEngineVersion`)**:
   - Skills specify `minimumEngineVersion: "1.0.0"`.
   - Engine rejects skill pack activations if the installed engine does not satisfy the requirement.

3. **Pinned Bill of Materials (`components.lock.json`)**:
   - Authoritative lock file in `Nexora-Windows-Installer` ensuring deterministic builds of tested component combinations.
