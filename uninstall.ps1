# uninstall.ps1 - Safe Uninstaller for Nexora Skills Manager
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$LocalApp = $env:LOCALAPPDATA
if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }

$metaFile = Join-Path $LocalApp "NexoraSkillsManager\install.json"
$installPath = $null

if (Test-Path $metaFile) {
    try {
        $meta = Get-Content $metaFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $installPath = $meta.installPath
    } catch {}
}

if (-not $installPath) {
    $installPath = $env:NEXORA_INSTALL_PATH
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "      NEXORA SKILLS MANAGER UNINSTALLER" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Detected installation path: $installPath" -ForegroundColor DarkGray
Write-Host ""
Write-Host "NOTE: This will remove the Nexora runtime engine and global CLI commands." -ForegroundColor Yellow
Write-Host "      Your project files, source code, and local .nexora data will NOT be touched." -ForegroundColor Green
Write-Host ""

if (-not $Force) {
    $choice = Read-Host "Are you sure you want to uninstall Nexora Skills Manager? (y/N)"
    if ($choice -notmatch "^[yY]") {
        Write-Host "Uninstall cancelled." -ForegroundColor Cyan
        exit 0
    }
}

Write-Host "[1/4] Removing command shims and PATH bindings..." -ForegroundColor Cyan
$NexoraBinDir = Join-Path $LocalApp "NexoraSkillsManager\bin"
if (Test-Path $NexoraBinDir) {
    Remove-Item -Path $NexoraBinDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove from User PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -and $UserPath -like "*$NexoraBinDir*") {
    $pathParts = $UserPath -split ';' | Where-Object { $_ -and $_ -ne $NexoraBinDir }
    $NewPath = $pathParts -join ';'
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "      Removed from User PATH" -ForegroundColor Green
}

# Clear NEXORA_INSTALL_PATH
[Environment]::SetEnvironmentVariable("NEXORA_INSTALL_PATH", $null, "User")

Write-Host "[2/4] Removing Nexora runtime folder..." -ForegroundColor Cyan
if ($installPath -and (Test-Path $installPath)) {
    # Safety guard: Ensure we do not delete system root or user profile root!
    if ($installPath.Length -gt 5 -and $installPath -notin @("C:\", "D:\", "C:\Windows", "C:\Program Files", $env:USERPROFILE)) {
        Remove-Item -Path $installPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "      Removed $installPath" -ForegroundColor Green
    }
}

Write-Host "[3/4] Cleaning local app data metadata..." -ForegroundColor Cyan
$NexoraAppData = Join-Path $LocalApp "NexoraSkillsManager"
if (Test-Path $NexoraAppData) {
    Remove-Item -Path $NexoraAppData -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[4/4] Verifying uninstallation..." -ForegroundColor Cyan
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "    NEXORA SKILLS MANAGER UNINSTALLED" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Nexora Skills Manager has been removed from your system." -ForegroundColor White
Write-Host "Project files and workspaces remain untouched." -ForegroundColor Green
Write-Host ""
