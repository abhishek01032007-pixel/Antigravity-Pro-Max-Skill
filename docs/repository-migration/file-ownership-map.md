# Nexora Skills Manager — Repository File Ownership Map

## 1. Ownership Classification Matrix

| Monorepo Path / Component | Target Repository | Target Path in Repository | Notes |
| :--- | :--- | :--- | :--- |
| `Frontend-Pro-Max/` | `Nexora-Skills` | `skills/Frontend-Pro-Max/` | Built-in UI/Flutter/Design skill packs |
| `Backend-Pro-Max/` | `Nexora-Skills` | `skills/Backend-Pro-Max/` | Built-in API/Security/Clean Arch skill packs |
| `QA-Debug-Pro-Max/` | `Nexora-Skills` | `skills/QA-Debug-Pro-Max/` | Built-in Testing/Debugging skill packs |
| `Fullstack-Extras/` | `Nexora-Skills` | `skills/Fullstack-Extras/` | Cross-stack automation skill packs |
| `Backend-Frameworks/` | `Nexora-Skills` | `skills/Backend-Frameworks/` | FastAPI, Node.js framework skill packs |
| `third-party-licenses/` | `Nexora-Skills` | `third-party-licenses/` | Open source license texts & attributions |
| `desktop/` | `Nexora-Desktop` | `desktop/` | Electron main process, preload, IPC bridge, packaging |
| `ui/` | `Nexora-Desktop` | `ui/` | HTML, CSS, JavaScript screens & components |
| `engine/` | `Nexora-Engine` | `engine/` | ApplicationService, Detection, Recommendations, Lifecycle |
| `nexora-version.json` | `Nexora-Engine` | `nexora-version.json` | Core engine version authority |
| `agpm-version.json` | `Nexora-Engine` | `agpm-version.json` | Backward-compatibility version manifest |
| `setup.ps1` | `Nexora-Windows-Installer` | `setup.ps1` | Universal bootstrap installer |
| `install.ps1` | `Nexora-Windows-Installer` | `install.ps1` | Local deployment script |
| `uninstall.ps1` | `Nexora-Windows-Installer` | `uninstall.ps1` | Safe uninstaller preserving project data |
| `engine/Install/NexoraInstaller.ps1` | `Nexora-Windows-Installer` | `engine/Install/NexoraInstaller.ps1` | Core transactional install engine |
| `scripts/` | `Nexora-Windows-Installer` | `scripts/` | Assembly pipelines & packaging scripts |
| `README.md`, `RELEASE_NOTES.md` | `Nexora-Skills-Manager` | Root directory | Retained as historical integration reference |
