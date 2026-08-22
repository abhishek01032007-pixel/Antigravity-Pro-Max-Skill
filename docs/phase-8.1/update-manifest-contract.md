# Nexora Skills Manager — Remote Release Manifest Contract (Phase 8.1)

## 1. Release Manifest Schema (v1.0.0)

The remote release manifest provides the single source of truth for available product versions, distribution artifacts, integrity checksums, and update compatibility constraints.

```json
{
  "$schema": "https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/docs/schemas/release-manifest-v1.json",
  "schemaVersion": 1,
  "product": "Nexora Skills Manager",
  "version": "1.0.1",
  "channel": "stable",
  "minimumSupportedVersion": "1.0.0",
  "publishedAt": "2026-08-22T12:00:00.000Z",
  "releaseNotesUrl": "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/tag/v1.0.1",
  "desktop": {
    "file": "NexoraSkillsManager-1.0.1-win-x64.zip",
    "url": "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/NexoraSkillsManager-1.0.1-win-x64.zip",
    "sha256": "6dc3ff1495b527014a148c0f2b9d67bfcacb3c2e73e851aa0c81292843617e08",
    "size": 111241430,
    "platform": "win32",
    "arch": "x64"
  },
  "runtime": {
    "file": "NexoraRuntime-1.0.1.zip",
    "url": "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/NexoraRuntime-1.0.1.zip",
    "sha256": "bb387e8556d141e80b96aeb0e4ccadffa9dc49e9ea6511cdab040f6ca739a4e7",
    "size": 776868,
    "platform": "win32",
    "arch": "x64"
  }
}
```

---

## 2. Field Specifications & Validations

| Field | Type | Required | Description & Validation Rules |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `integer` | **YES** | Manifest schema version. Must be integer `1`. Unsupported values trigger `UPDATE_MANIFEST_UNSUPPORTED`. |
| `product` | `string` | **YES** | Product identifier. Must exactly equal `"Nexora Skills Manager"`. |
| `version` | `string` | **YES** | Canonical SemVer 2.0.0 string (e.g. `1.0.1`). |
| `channel` | `string` | **YES** | Release channel. Allowed values: `"stable"`, `"beta"`. Default is `"stable"`. |
| `minimumSupportedVersion` | `string` | **NO** | Lowest client version capable of upgrading directly. If client is older, returns `UPDATE_CLIENT_TOO_OLD`. |
| `publishedAt` | `string` | **YES** | ISO 8601 UTC timestamp of release publication. |
| `releaseNotesUrl` | `string` | **NO** | Valid HTTPS URL to release notes page. Opens externally. |
| `desktop.file` | `string` | **YES** | Sanitized filename of the Desktop package. No path traversal characters. |
| `desktop.url` | `string` | **YES** | Full HTTPS download URL for the Desktop ZIP archive. |
| `desktop.sha256` | `string` | **YES** | Exactly 64 hex characters representing the SHA-256 hash. |
| `desktop.size` | `integer` | **YES** | Positive integer representing expected byte length of Desktop archive. |
| `desktop.platform` | `string` | **YES** | Target platform (`"win32"`). |
| `desktop.arch` | `string` | **YES** | Target architecture (`"x64"`). |
| `runtime.file` | `string` | **YES** | Sanitized filename of the Shared Runtime package. |
| `runtime.url` | `string` | **YES** | Full HTTPS download URL for the Runtime ZIP archive. |
| `runtime.sha256` | `string` | **YES** | Exactly 64 hex characters representing the SHA-256 hash. |
| `runtime.size` | `integer` | **YES** | Positive integer representing expected byte length of Runtime archive. |
| `runtime.platform` | `string` | **YES** | Target platform (`"win32"`). |
| `runtime.arch` | `string` | **YES** | Target architecture (`"x64"`). |

---

## 3. Version Comparison & Precedence (SemVer 2.0.0)

Version comparison uses standard 3-tier precedence rules:
1. `Major.Minor.Patch` numeric comparison (e.g., `1.10.0 > 1.9.0`, `2.0.0 > 1.99.99`).
2. Prerelease tags have lower precedence than the normal release (`1.0.1-beta.1 < 1.0.1`).
3. Build metadata is ignored for precedence comparisons.

### Examples:
- Installed `1.0.0` vs Remote `1.0.1` -> `updateAvailable = true`
- Installed `1.0.1` vs Remote `1.0.1` -> `updateAvailable = false` (Up to date)
- Installed `1.1.0` vs Remote `1.0.9` -> `updateAvailable = false` (Downgrade blocked)
- Installed `1.0.0` vs Remote `2.0.0` -> `updateAvailable = true` (Major upgrade)

---

## 4. Release Discovery Strategy: Option Comparison

| Discovery Strategy | Rate Limit Impact | Latency | Reliability | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: GitHub Releases API** (`/repos/.../releases/latest`) | 60 req/hr unauthenticated IP limit. | Fast. | High; returns rich tag metadata and attached assets. | **Recommended for dynamic release resolution.** |
| **Option B: Static Manifest via raw.githubusercontent.com** | CDN cached; no API rate limits. | Very Fast. | High, but requires branch commit per release. | Alternative static fallback. |
| **Option C: Asset Attached Manifest** | Consumes 1 API request + 1 asset fetch. | Moderate. | Best immutability per release tag. | **Primary manifest download method.** |

### Recommendation:
Query `api.github.com/repos/abhishek01032007-pixel/Nexora-Skills-Manager/releases/latest` to retrieve the latest release metadata and release-manifest.json asset download URL.
