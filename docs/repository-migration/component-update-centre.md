# Nexora Skills Manager — Component Update Centre Architecture

## 1. Unified Update Experience
Update Centre remains a single logical feature accessed via the Desktop UI. Its responsibilities are distributed cleanly across components:

- **Desktop UI**: Renders component version indicators, status badges, progress bars, and restart prompts.
- **Engine**: Performs manifest validation, cryptographic hash checks, compatibility evaluation, and update decisions.
- **Installer**: Executes transactional file replacements, shadow staging, rollback on failure, and helper coordination.
- **Skills**: Provides self-contained skill packages with YAML metadata and schema validation.

---

## 2. Independent Component Updates vs. Full Product Update
When a component update is published:
1. **Engine-Only Update**: If a bug fix is released in `Nexora-Engine` that satisfies `engineApiVersion` compatibility with the installed Desktop UI, Update Centre offers **Update Engine** without requiring full Desktop application reinstallation.
2. **Skills-Only Update**: If new skills or prompt improvements are released, Update Centre offers **Update Skills** with zero restart required.
3. **Full Product Fallback**: If an update introduces breaking API changes or couples Desktop + Engine updates, Update Centre seamlessly presents **Nexora Product Update**, orchestrating the full Phase 8 transactional installer.

---

## 3. Manifest Evolution: Schema v1 to Schema v2
- **v1.0.0 Baseline (Schema v1)**: Stable, proven Phase 8 release manifest format (`desktop` + `runtime` objects).
- **Future Component Manifest (Schema v2)**: Extends Schema v1 with granular `components` dictionary (`desktop`, `engine`, `skills`, `installer`) for component-level delta deliveries.
