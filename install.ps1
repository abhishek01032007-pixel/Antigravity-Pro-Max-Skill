# install.ps1 - Local Direct Unified Installer for Nexora Skills Manager
param(
    [string]$InstallPath = $null,
    [string]$StateRoot = $null,
    [string]$DesktopRoot = $null,
    [string]$BinDir = $null,
    [string]$SourceDir = $null,
    [string]$DesktopSourceDir = $null,
    [switch]$SkipPathRegistration,
    [switch]$SkipShortcut
)

$ErrorActionPreference = "Stop"

$installerModule = Join-Path $PSScriptRoot "engine\Install\NexoraInstaller.ps1"
if (-not (Test-Path $installerModule)) {
    throw "Installer module missing at: $installerModule"
}

. $installerModule

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     NEXORA SKILLS MANAGER INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$installParams = @{
    InstallRoot        = $InstallPath
    StateRoot          = $StateRoot
    DesktopRoot        = $DesktopRoot
    BinDir             = $BinDir
    SourceDir          = $(if ($SourceDir) { $SourceDir } else { $PSScriptRoot })
    DesktopSourceDir   = $DesktopSourceDir
    SkipPathRegistration = $SkipPathRegistration
    SkipShortcut       = $SkipShortcut
}

$result = Install-NexoraUnified @installParams

Write-Host "[OK] Shared Runtime:      $($result.runtimeRoot)" -ForegroundColor Green
Write-Host "[OK] Desktop Application: $($result.desktopExecutable)" -ForegroundColor Green
Write-Host "[OK] CLI Shim:            $($result.cliShim)" -ForegroundColor Green
Write-Host "[OK] Version:             $($result.version)" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   NEXORA SKILLS MANAGER INSTALLED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
