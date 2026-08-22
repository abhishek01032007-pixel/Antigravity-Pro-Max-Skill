# Nexora Skills Manager — Phase 9.1 Product Identity, Branding & Release Polish Audit

## 1. Executive Summary
Phase 9.1 conducts an exhaustive release-readiness audit across Nexora Skills Manager's visible product identity, executable branding, icon assets, package metadata, versioning authorities, installer presentation, CLI aliases, and public release claims.

---

## 2. Product Identity Matrix

| Identity Field | Canonical Authority | Verified Current Value | Compliance Status |
| :--- | :--- | :--- | :---: |
| **Visible Product Name** | `nexora-version.json` / Docs | `Nexora Skills Manager` | **EXACT MATCH** |
| **Windows Executable** | `desktop/electron-builder.yml` | `NexoraSkillsManager.exe` | **EXACT MATCH** |
| **Application ID** | `desktop/electron-builder.yml` | `com.nexora.skillsmanager` | **EXACT MATCH** |
| **Primary CLI Command** | `engine/Install/NexoraInstaller.ps1` | `nexora` (`nexora.cmd`) | **EXACT MATCH** |
| **Legacy CLI Alias** | `engine/Install/NexoraInstaller.ps1` | `agpm` (`agpm.cmd` with migration notice) | **EXACT MATCH** |
| **Production Version** | `nexora-version.json` | `1.0.0` | **EXACT MATCH** |
| **Package Version** | `desktop/package.json` | `1.0.0` | **EXACT MATCH** |
| **Publisher / Vendor** | Corporate Policy | Unset / TBD (Zero fabricated company names) | **POLICY COMPLIANT** |
| **Target OS & Arch** | Packaging Target | Windows x64 (Platform: `win32`, Arch: `x64`) | **ACCURATE & CANONICAL** |
| **Supported AI Tools** | Product Domain | Google Antigravity, Cursor, GitHub Copilot | **ACCURATE** |

---

## 3. Detailed Component Audits

### 3.1 Executable, Packaging & ASAR Module Inventory
- **Executable**: Built as `NexoraSkillsManager.exe` into `desktop/dist/win-unpacked/` and zipped as `NexoraSkillsManager-1.0.0-win-x64.zip`.
- **Process & Task Manager**: Displays `Nexora Skills Manager` with description `Nexora Skills Manager Desktop Host`.
- **Window Title**: Both `BrowserWindow.title` and `<title>` tag in `ui/index.html` render `Nexora Skills Manager`.
- **Preload Isolation**: Strictly exposes only `window.nexoraBridge`. Zero nodeIntegration or arbitrary IPC.
- **ASAR Inventory Audit**: Verified all 8 production updater modules are packaged directly inside `resources/app.asar`:
  - `\updates\SemVer.js`
  - `\updates\TrustedUrlPolicy.js`
  - `\updates\UpdateDownloadService.js`
  - `\updates\UpdateHttpClient.js`
  - `\updates\UpdateInstallService.js`
  - `\updates\UpdateManifestClient.js`
  - `\updates\UpdateService.js`
  - `\updates\ZipValidator.js`
  - `\ui\js\updates\UpdateErrorMapper.js`

### 3.2 Release Manifest Contract Reconciliation
- **Canonical Platform Identifier**: **`win32`** (standard Node.js `process.platform` identifier).
- **Manifest Generator**: `scripts/Build-ReleaseArtifacts.ps1` emits `platform: "win32"` and `arch: "x64"` in both `desktop` and `runtime` descriptors.
- **Manifest Validator**: `desktop/updates/UpdateManifestClient.js` validates `platform: "win32"` and `arch: "x64"`.
- **Contract Verification**: `update-security-final.test.js` (Cases S1–S7) verifies that the actual generated `release/release-manifest.json` passes production validation without fixture transformations.

### 3.3 Privacy & Data Safety Technical Wording
- **Technical Policy**: Nexora does not transmit project contents or telemetry as part of its implemented update workflow. Outbound network activity is initiated strictly upon explicit user request and connects exclusively to trusted GitHub endpoints for manifest checking and release artifact downloads.

### 3.2 Icon & Visual Assets Audit
- **Current State**: Windows branded `.ico` asset is **`ASSET_REQUIRED`**.
- **Current Behavior**: `electron-builder.yml` and `main.js` currently omit explicit icon paths, causing Windows and Electron to fall back to the default Electron application icon.
- **Affected Fallback Locations**:
  1. `NexoraSkillsManager.exe` embedded PE application icon.
  2. Windows Taskbar and BrowserWindow frame icon.
  3. Start Menu shortcut (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Nexora Skills Manager.lnk`).
  4. Desktop shortcut.
  5. Windows Apps & Features (`DisplayIcon` pointing to `NexoraSkillsManager.exe`).
- **Recommended Canonical Path**: `assets/branding/NexoraSkillsManager.ico` (256x256 multi-resolution ICO including 16, 32, 48, 64, 128, 256px frames).

### 3.3 Apps & Features and Shortcut Registry
- **Registry Key**: `HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\NexoraSkillsManager`
  - `DisplayName`: `"Nexora Skills Manager"`
  - `DisplayVersion`: `"1.0.0"`
  - `InstallLocation`: `%LOCALAPPDATA%\Programs\NexoraSkillsManager`
  - `UninstallString`: `powershell.exe -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\NexoraSkillsManager\runtime\install\uninstall.ps1"`
  - `Publisher`: Omitted (compliant with TBD publisher policy).
- **Start Menu**: Installs shortcut named `Nexora Skills Manager.lnk` targeting `NexoraSkillsManager.exe`.

### 3.4 CLI & Legacy Compatibility Audit
- **Primary Command (`nexora`)**: Points to `engine/CLI/NexoraCLI.ps1` via `nexora.cmd`.
- **Compatibility Command (`agpm`)**: Displays notice `[NOTICE] The 'agpm' command has transitioned to 'nexora' (Nexora Skills Manager).` and passes all arguments to `nexora.cmd`.
- **Batch Launchers**: `Start-Nexora-Skills-Manager.bat` is the primary root launcher; `Start-Antigravity-Pro-Max.bat` preserved as compatibility forwarder.
- **Legacy Version File**: `agpm-version.json` maintained as synced compatibility mirror; `nexora-version.json` is sole canonical authority.

### 3.5 UI / UX Polish & Navigation Findings
1. **Sidebar Navigation & Settings**: Clicking "Settings" currently routes to `PlatformSelectionScreen.js`. Phase 9.2 should introduce a unified Settings & About screen that displays version details, runtime paths, AI platform toggles, license links, and updater status.
2. **Topbar Mock Toggle**: `btn-topbar-offline-toggle` ("Toggle Mock Offline State") in `NexoraAppShell.js` is a development fixture that should be hidden or removed in production mode.
3. **Application Menu**: `desktop/main.js` does not call `Menu.setApplicationMenu(null)`, allowing the default Electron menu bar to render on Windows.
4. **Mock Data Isolation**: Live mode is 100% isolated from mock data. `UpdateProgressModal.js` line 129 contains developer default parameters (`Academic Day Hub`) that should be sanitized to generic fallbacks.

### 3.6 Documentation & Release Claims Audit
1. **Canonical Install Command**:
   - `setup.ps1` URL: `irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex`
   - `README.md` line 151 currently contains placeholder `irm agpm.dev/install | iex` and line 156 mentions `C:\Antigravity Pro Max Skill`. These will be corrected in Phase 9.3.
2. **Code Signing & SmartScreen**: Authenticode signing is deferred. Release documentation must transparently explain that Windows Defender SmartScreen warnings may appear on unsigned releases.

---

## 4. Release Blocker & Polish Classification

### Release Blockers (0)
- *None.* (All core functionality, security contracts, and architecture requirements are satisfied).

### High Polish Items (Phase 9.2)
1. Delivery and integration of branded `.ico` asset (`ASSET_REQUIRED`).
2. Implement dedicated Settings & About screen with live version, runtime info, and license notices.
3. Suppress default Electron application menu bar (`Menu.setApplicationMenu(null)`).
4. Remove/hide topbar mock offline toggle button in production mode.
5. Add `updates/**/*.js` to `desktop/electron-builder.yml` files list.

### Medium Polish Items (Phase 9.2 & 9.3)
1. Update `README.md` with canonical `setup.ps1` command and modern `%LOCALAPPDATA%` paths.
2. Sanitize default parameter values in `UpdateProgressModal.js`.
3. Add controlled release notes link and GitHub repository links to About screen.

### Optional / Deferred Items
- Commercial Authenticode Code Signing (`DEFERRED`).
- WinGet / Chocolatey distribution packages (`DEFERRED`).
