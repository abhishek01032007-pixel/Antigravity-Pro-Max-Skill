# Sync-WinGetManifests.ps1 - Generates development WinGet manifests for Nexora.NexoraSkillsManager
param(
    [string]$Version = "1.0.0",
    [string]$Sha256 = "88EDAE88834EF1E237291689045EF3B716E5D8D180228332E9790FB59312B773"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$ManifestBase = Join-Path $RepoRoot "winget-manifests\manifests\n\Nexora\NexoraSkillsManager\$Version"

if (-not (Test-Path $ManifestBase)) {
    New-Item -ItemType Directory -Path $ManifestBase -Force | Out-Null
}

# 1. Version manifest
$versionYaml = @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.version.1.9.0.schema.json

PackageIdentifier: Nexora.NexoraSkillsManager
PackageVersion: $Version
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.9.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.NexoraSkillsManager.yaml") -Value $versionYaml -Encoding UTF8

# 2. Installer manifest
$installerYaml = @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.installer.1.9.0.schema.json

PackageIdentifier: Nexora.NexoraSkillsManager
PackageVersion: $Version
InstallerLocale: en-US
InstallerType: zip
NestedInstallerType: portable
NestedInstallerFiles:
  - RelativeFilePath: NexoraSkillsManager.exe
    PortableCommandAlias: nexora
Commands:
  - nexora
  - agpm
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v$Version/NexoraSkillsManager-$Version-win-x64.zip
    InstallerSha256: $Sha256
    UpgradeBehavior: install
ManifestType: installer
ManifestVersion: 1.9.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.NexoraSkillsManager.installer.yaml") -Value $installerYaml -Encoding UTF8

# 3. Locale manifest
$localeYaml = @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.defaultLocale.1.9.0.schema.json

PackageIdentifier: Nexora.NexoraSkillsManager
PackageVersion: $Version
PackageLocale: en-US
Publisher: Nexora Skills Manager
PackageName: Nexora Skills Manager
PackageUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager
License: MIT
LicenseUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/blob/main/LICENSE
ShortDescription: Universal AI Skill Orchestration Platform for Windows
Description: Nexora Skills Manager provides automated stack detection, smart skill recommendation, and multi-platform AI context orchestration for Antigravity, Cursor, and Copilot.
Moniker: nexora
Tags:
  - ai
  - developer-tools
  - skills
  - antigravity
  - copilot
  - cursor
ReleaseNotesUrl: https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/tag/v$Version
ManifestType: defaultLocale
ManifestVersion: 1.9.0
"@
Set-Content -Path (Join-Path $ManifestBase "Nexora.NexoraSkillsManager.locale.en-US.yaml") -Value $localeYaml -Encoding UTF8

Write-Host "WinGet manifests successfully generated for Nexora.NexoraSkillsManager v$Version" -ForegroundColor Green
