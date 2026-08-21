# Build-ReleasePackage.ps1 - Automated Release Packaging & SHA-256 Checksum Generator
param(
    [string]$Version = "1.0.0",
    [string]$OutputDir = $null
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not $OutputDir) {
    $OutputDir = Join-Path $RepoRoot "dist"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$ZipName = "Nexora-Skills-Manager-v$Version.zip"
$ZipPath = Join-Path $OutputDir $ZipName

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

$TempStage = Join-Path $env:TEMP ("nexora-stage-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempStage -Force | Out-Null

try {
    Write-Host "Staging release payload for v$Version..." -ForegroundColor Cyan

    $includeFolders = @("engine", "Loaders", "Frontend-Pro-Max", "Backend-Pro-Max", "QA-Debug-Pro-Max", "Fullstack-Extras", "Backend-Frameworks")
    foreach ($f in $includeFolders) {
        $src = Join-Path $RepoRoot $f
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $TempStage $f) -Recurse -Force
        }
    }

    $includeFiles = @("Start-Nexora-Skills-Manager.bat", "Start-Antigravity-Pro-Max.bat", "nexora-version.json", "agpm-version.json", "README.md", "LICENSE")
    foreach ($fl in $includeFiles) {
        $src = Join-Path $RepoRoot $fl
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $TempStage $fl) -Force
        }
    }

    Write-Host "Creating zip package: $ZipPath..." -ForegroundColor Cyan
    Compress-Archive -Path (Join-Path $TempStage "*") -DestinationPath $ZipPath -Force

    # Compute SHA-256
    $stream = [System.IO.File]::OpenRead($ZipPath)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha.ComputeHash($stream)
    $stream.Close()
    $hashHex = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToUpper()

    $manifest = [PSCustomObject]@{
        version     = $Version
        tag         = "v$Version"
        publishedAt = (Get-Date).ToString("o")
        assets      = @{
            zip = @{
                fileName = $ZipName
                sha256   = $hashHex
            }
        }
    }

    $manifestPath = Join-Path $OutputDir "release-manifest.json"
    $manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8

    Write-Host ""
    Write-Host "Release package generated successfully:" -ForegroundColor Green
    Write-Host "  ZIP    : $ZipPath" -ForegroundColor White
    Write-Host "  SHA256 : $hashHex" -ForegroundColor Yellow
    Write-Host "  Manifest: $manifestPath" -ForegroundColor White
    Write-Host ""
}
finally {
    if (Test-Path $TempStage) {
        Remove-Item -Path $TempStage -Recurse -Force -ErrorAction SilentlyContinue
    }
}
