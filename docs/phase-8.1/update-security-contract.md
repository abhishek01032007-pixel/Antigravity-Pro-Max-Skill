# Nexora Skills Manager — Remote Update Security Contract (Phase 8.1)

## 1. Security Invariants & Guarantees

1. **Strict Transport Security**: All remote update communications (manifest checks, artifact downloads) MUST use HTTPS. Plain HTTP, FTP, file URLs, or non-HTTPS redirects are unconditionally rejected.
2. **Immutable Trust Root**: The renderer process has zero authority over download destinations, URLs, execution paths, or checksum overrides.
3. **Double Verification**: Downloaded archives must match expected byte sizes AND match authoritatively computed SHA-256 hashes before being staged for installation.
4. **Anti-SSRF Protection**: Destination URLs are strictly validated against a hardcoded trusted host allowlist. Private IPs, localhost, cloud metadata endpoints, and internal network ranges are blocked.
5. **Zip Slip Prevention**: Archives must not contain directory traversal sequences (`..`), drive letters, or absolute paths that could escape the designated staging folder.
6. **No Downgrade by Default**: The updater unconditionally rejects versions older than the installed version.
7. **Zero-Secret / Zero-Telemetry Design**: No API tokens or credentials are embedded or required for public release updates; no project code or telemetry is uploaded during update checks.

---

## 2. Trust Boundaries Matrix

| Boundary Layer | Trust Level | Capabilities | Restrictions |
| :--- | :--- | :--- | :--- |
| **Renderer (UI)** | **UNTRUSTED** | Displays update UI, sends generic user intent (Check, Download, Install, Cancel). | Cannot specify URLs, paths, commands, or checksums. Cannot access Node.js or OS APIs. |
| **Electron Preload** | **RESTRICTED** | Relays IPC messages via contextBridge. | Exposes only frozen `nexoraBridge` methods. Sanitizes incoming payloads. |
| **Main Process (Node.js)** | **TRUSTED** | Handles network requests, validates URLs against allowlist, streams downloads to `%TEMP%`, computes SHA-256. | Bound by strict host allowlists, size limits, and timeout constraints. |
| **PowerShell Worker** | **TRUSTED** | Resolves local installed version metadata, reports system health. | Line-buffered JSON IPC over stdio; no direct network requests. |
| **Update Helper & Phase 7 Engine** | **TRUSTED** | Executes transactional install, atomic backups, rollback, file replacement. | Runs as unprivileged standard user; only consumes verified staging directories. |

---

## 3. Network & Transport Security

### A. HTTPS & Host Allowlist
The updater connects exclusively to approved hosts for the official Nexora release repository:
- `github.com`
- `api.github.com`
- `objects.githubusercontent.com`
- `raw.githubusercontent.com`

Any request targeting other hostnames, IP addresses (e.g., `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `192.168.0.0/16`), or custom ports is rejected with error code `UPDATE_REMOTE_ERROR`.

### B. Redirect Policy
- Maximum allowed redirects: **5**.
- Scheme downgrade (HTTPS → HTTP) is strictly blocked.
- Redirect targets must reside on allowlisted hostnames.

### C. Defensive Size & Timeout Limits
- **Manifest Max Size**: 1 MB (1,048,576 bytes).
- **Manifest Request Timeout**: 10 seconds.
- **Artifact Connect Timeout**: 15 seconds.
- **Download Inactivity Timeout**: 30 seconds.

---

## 4. Artifact Integrity & Verification

### A. SHA-256 Hash Verification
- Before an archive is accepted for installation, its SHA-256 hash is computed via Node `crypto.createHash('sha256')`.
- The calculated hash is compared (case-insensitively) to the manifest value.
- If any byte differs, the file is immediately deleted, and the updater returns `UPDATE_CHECKSUM_MISMATCH`.

### B. Size Validation
- The downloaded file length must match `desktop.size` and `runtime.size` in the manifest.
- Mismatches return `UPDATE_ARTIFACT_SIZE_MISMATCH`.

### C. Archive Content Inspection
Before passing archives to the installer, the updater confirms expected archive structure:
- **Desktop Archive**: Must contain `NexoraSkillsManager.exe` and `resources/app.asar`.
- **Runtime Archive**: Must contain `runtime/engine`, `runtime/bridge/NexoraDesktopBridgeHost.ps1`, `runtime/skills`, `runtime/nexora-version.json`.
- Archives containing unexpected root executables, scripts, or path traversal elements are rejected with `UPDATE_ARTIFACT_INVALID`.

---

## 5. Downgrade & Version Precedence Policy

- **Strict SemVer Precedence**: Versions are parsed according to SemVer 2.0.0 rules (Major.Minor.Patch-Prerelease).
- **Installed Version Authority**: `$env:LOCALAPPDATA\NexoraSkillsManager\runtime\nexora-version.json` is the sole authority for installed version.
- **Downgrade Rejection**: If `remoteVersion < currentVersion`, the system sets `updateAvailable = false` and ignores the remote package.
- **Same Version**: If `remoteVersion == currentVersion`, `updateAvailable = false`.

---

## 6. Privacy & Telemetry Policy

- **Zero User Data Transmitted**: Update check requests send only standard HTTP headers (e.g., `User-Agent: NexoraSkillsManager/1.0.0 (Windows NT 10.0; Win64; x64)`).
- **No Identifiers**: No MAC addresses, machine GUIDs, usernames, project names, or skill configurations are included in queries.
- **Public Unauthenticated Access**: Public GitHub releases do not require authentication tokens or API keys.
