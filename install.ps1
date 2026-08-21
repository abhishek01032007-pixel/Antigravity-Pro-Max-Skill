# install.ps1 - Local Direct Installer for Nexora Skills Manager
param(
    [string]$InstallPath = $null
)

$ErrorActionPreference = "Stop"

$LocalApp = $env:LOCALAPPDATA
if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }

if (-not $InstallPath) {
    if ($env:NEXORA_INSTALL_PATH) {
        $InstallPath = $env:NEXORA_INSTALL_PATH
    } else {
        $InstallPath = Join-Path $LocalApp "NexoraSkillsManager\runtime"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         NEXORA SKILLS MANAGER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Preparing installation directory..." -ForegroundColor Yellow
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}
Write-Host "      Target: $InstallPath" -ForegroundColor Green

Write-Host "[2/4] Installing Nexora Skills Manager..." -ForegroundColor Yellow
Get-ChildItem $PSScriptRoot -Force |
    Where-Object { $_.Name -notin @("install.ps1", ".git", ".nexora") } |
    ForEach-Object {
        Copy-Item $_.FullName $InstallPath -Recurse -Force
    }
Write-Host "      OK" -ForegroundColor Green

Write-Host "[3/4] Persisting metadata & environment..." -ForegroundColor Yellow
$metaDir = Join-Path $LocalApp "NexoraSkillsManager"
if (-not (Test-Path $metaDir)) { New-Item -ItemType Directory -Path $metaDir -Force | Out-Null }
$metaFile = Join-Path $metaDir "install.json"

$meta = [PSCustomObject]@{
    installPath   = $InstallPath
    version       = "1.0.0"
    engineEntry   = "engine\Core\NexoraEngine.ps1"
    launcherBatch = "Start-Nexora-Skills-Manager.bat"
    installedAt   = (Get-Date).ToString("o")
    installMethod = "local_direct"
    channel       = "stable"
}
$meta | ConvertTo-Json -Depth 4 | Set-Content -Path $metaFile -Encoding UTF8

[Environment]::SetEnvironmentVariable("NEXORA_INSTALL_PATH", $InstallPath, "User")

Write-Host "[4/4] Verifying installation..." -ForegroundColor Yellow
$required = @(
    "Frontend-Pro-Max",
    "Backend-Pro-Max",
    "Backend-Frameworks",
    "QA-Debug-Pro-Max",
    "Fullstack-Extras",
    "Loaders",
    "engine",
    "Start-Nexora-Skills-Manager.bat",
    "Start-Antigravity-Pro-Max.bat",
    "README.md"
)

$failed = $false
foreach ($item in $required) {
    $path = Join-Path $InstallPath $item
    if (-not (Test-Path $path)) {
        Write-Host "      MISSING: $item" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    throw "Installation verification failed."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   NEXORA SKILLS MANAGER INSTALLED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installed to: $InstallPath" -ForegroundColor Cyan
Write-Host ""
