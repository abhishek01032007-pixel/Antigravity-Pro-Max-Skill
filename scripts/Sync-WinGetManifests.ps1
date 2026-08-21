# Sync-WinGetManifests.ps1 - Generates development WinGet manifests for Nexora.SkillsManager
param(
    [string]$Version = "1.0.0",
    [string]$Sha256 = "162DDA7369F9A31BD86E2CC722137DBD01EA327190B1619105D4FD7163CF9963"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$ManifestBase = Join-Path $RepoRoot "winget-manifests\manifests\n\Nexora\SkillsManager\$Version"

if (-not (Test-Path $ManifestBase)) {
    New-Item -ItemType Directory -Path $ManifestBase -Force | Out-Null
}

# 1. Version manifest
$versionYaml = @"
PackageIdentifier: Nexora.SkillsManager
PackageVersion: $Version
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.12.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.SkillsManager.yaml") -Value $versionYaml -Encoding UTF8

# 2. Installer manifest
$installerYaml = @"
PackageIdentifier: Nexora.SkillsManager
PackageVersion: $Version
InstallerType: inno
Scope: user
InstallerSwitches:
  Silent: /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-
  SilentWithProgress: /SILENT /SUPPRESSMSGBOXES /NORESTART /SP-
UpgradeBehavior: install
Commands:
- nexora
- agpm
Installers:
- Architecture: x64
  InstallerUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v$Version/Nexora-Skills-Manager-Setup-$Version.exe
  InstallerSha256: $Sha256
ManifestType: installer
ManifestVersion: 1.12.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.SkillsManager.installer.yaml") -Value $installerYaml -Encoding UTF8

# 3. Locale manifest
$localeYaml = @"
PackageIdentifier: Nexora.SkillsManager
PackageVersion: $Version
PackageLocale: en-US
Publisher: Nexora Skills Manager
PackageName: Nexora Skills Manager
PackageUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager
License: Apache-2.0
ShortDescription: Universal AI Skill Orchestration Platform for Windows
Description: Nexora Skills Manager provides automated stack detection, smart skill recommendation, and multi-platform AI context orchestration for Antigravity, Cursor, and Copilot.
Tags:
- ai
- developer-tools
- skills
- antigravity
- copilot
- cursor
ManifestType: defaultLocale
ManifestVersion: 1.12.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.SkillsManager.locale.en-US.yaml") -Value $localeYaml -Encoding UTF8

Write-Host "WinGet manifests generated for Nexora.SkillsManager v$Version" -ForegroundColor Green
