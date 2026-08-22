# uninstall.ps1 - Safe Uninstaller for Nexora Skills Manager
# This script is also copied to the installed runtime at:
#   %LOCALAPPDATA%\NexoraSkillsManager\runtime\install\uninstall.ps1
# It can be run from either location.
param(
    [switch]$Force,
    [switch]$RemoveUserData
)

$ErrorActionPreference = "Stop"

# Resolve LocalAppData
$LocalApp = $env:LOCALAPPDATA
if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }

$StateRoot = Join-Path $LocalApp "NexoraSkillsManager"

# Determine if we are running from the installed runtime location.
# If so, copy self to TEMP and re-invoke from there to avoid self-deletion issues.
$installedUninstallDir = Join-Path $StateRoot "runtime\install"
$myDir = $PSScriptRoot
$myPath = $MyInvocation.MyCommand.Path

$isInstalledCopy = $false
if ($myDir -and $installedUninstallDir) {
    try {
        $normalizedMyDir = [System.IO.Path]::GetFullPath($myDir).TrimEnd('\', '/')
        $normalizedInstDir = [System.IO.Path]::GetFullPath($installedUninstallDir).TrimEnd('\', '/')
        if ($normalizedMyDir -eq $normalizedInstDir) { $isInstalledCopy = $true }
    } catch {}
}

if ($isInstalledCopy -and $myPath) {
    # We are running from inside the installation directory.
    # Copy self to TEMP and re-execute from there.
    $tempUninstall = Join-Path $env:TEMP "NexoraUninstall-$([guid]::NewGuid().ToString('N')).ps1"
    Copy-Item $myPath $tempUninstall -Force

    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $tempUninstall)
    if ($Force) { $args += "-Force" }
    if ($RemoveUserData) { $args += "-RemoveUserData" }
    $args += "-AlreadyRelocated"

    Start-Process powershell.exe -ArgumentList $args -NoNewWindow -Wait
    exit $LASTEXITCODE
}

# Load the installer module (try installed location first, then repo)
$installerPaths = @(
    (Join-Path $StateRoot "runtime\engine\Install\NexoraInstaller.ps1"),
    (Join-Path $PSScriptRoot "engine\Install\NexoraInstaller.ps1")
)
$installerModule = $null
foreach ($p in $installerPaths) {
    if (Test-Path $p) { $installerModule = $p; break }
}

# If we cannot load the module, perform a minimal manual uninstall
if (-not $installerModule) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "    NEXORA UNINSTALLER (MINIMAL MODE)" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installer module not found. Performing basic cleanup." -ForegroundColor DarkGray
    Write-Host ""

    if (-not $Force) {
        $choice = Read-Host "Are you sure you want to uninstall Nexora Skills Manager? (y/N)"
        if ($choice -notmatch "^[yY]") { Write-Host "Uninstall cancelled." -ForegroundColor Cyan; exit 0 }
    }

    # Runtime
    $runtimeDir = Join-Path $StateRoot "runtime"
    if (Test-Path $runtimeDir) { Remove-Item $runtimeDir -Recurse -Force -ErrorAction SilentlyContinue }

    # Desktop
    $desktopDir = Join-Path $LocalApp "Programs\NexoraSkillsManager"
    if (Test-Path $desktopDir) { Remove-Item $desktopDir -Recurse -Force -ErrorAction SilentlyContinue }

    # Bin
    $binDir = Join-Path $StateRoot "bin"
    if (Test-Path $binDir) { Remove-Item $binDir -Recurse -Force -ErrorAction SilentlyContinue }

    # install.json
    $metaFile = Join-Path $StateRoot "install.json"
    if (Test-Path $metaFile) { Remove-Item $metaFile -Force -ErrorAction SilentlyContinue }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "     NEXORA SKILLS MANAGER UNINSTALLED" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: PATH and Start Menu entries may need manual cleanup." -ForegroundColor Yellow
    Write-Host "User data (projects.json, custom skills, logs) preserved." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Full module-powered uninstall
. $installerModule

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "      NEXORA SKILLS MANAGER UNINSTALLER" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Read current metadata for display
$meta = Get-NexoraInstallMetadata -StateRoot $StateRoot
if ($meta) {
    Write-Host "Installed version: $($meta.version)" -ForegroundColor DarkGray
    Write-Host "Runtime:           $($meta.runtimeRoot)" -ForegroundColor DarkGray
    Write-Host "Desktop:           $($meta.desktopRoot)" -ForegroundColor DarkGray
} else {
    Write-Host "No formal installation metadata found." -ForegroundColor DarkGray
}
Write-Host ""

Write-Host "This will REMOVE:" -ForegroundColor Yellow
Write-Host "  - Nexora runtime engine" -ForegroundColor White
Write-Host "  - Desktop application" -ForegroundColor White
Write-Host "  - CLI commands (nexora, agpm)" -ForegroundColor White
Write-Host "  - PATH registration" -ForegroundColor White
Write-Host "  - Start Menu shortcut" -ForegroundColor White
Write-Host "  - Apps & Features entry" -ForegroundColor White
Write-Host ""
Write-Host "This will PRESERVE:" -ForegroundColor Green
Write-Host "  - projects.json (project registry)" -ForegroundColor Green
Write-Host "  - Custom user skills" -ForegroundColor Green
Write-Host "  - Log files" -ForegroundColor Green
Write-Host "  - All project directories and project-owned files" -ForegroundColor Green
Write-Host ""

if ($RemoveUserData) {
    Write-Host "-RemoveUserData specified. Will ADDITIONALLY remove:" -ForegroundColor Red
    Write-Host "  - Custom skills" -ForegroundColor Red
    Write-Host "  - Log files" -ForegroundColor Red
    Write-Host "  (projects.json and project directories still preserved)" -ForegroundColor Green
    Write-Host ""
}

if (-not $Force) {
    $choice = Read-Host "Are you sure you want to uninstall Nexora Skills Manager? (y/N)"
    if ($choice -notmatch "^[yY]") {
        Write-Host "Uninstall cancelled." -ForegroundColor Cyan
        exit 0
    }
}

try {
    $result = Uninstall-NexoraUnified -StateRoot $StateRoot -RemoveUserData:$RemoveUserData

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "     NEXORA SKILLS MANAGER UNINSTALLED" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Removed:    $($result.removed -join ', ')" -ForegroundColor White
    Write-Host "Preserved:  $($result.preserved -join ', ')" -ForegroundColor Green
    Write-Host ""
    Write-Host "To reinstall, run:" -ForegroundColor Yellow
    Write-Host "  irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "      UNINSTALL FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
