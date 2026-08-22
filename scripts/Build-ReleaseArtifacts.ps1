# Build-ReleaseArtifacts.ps1 - Production Release Packaging Tool for Nexora Skills Manager
# Packages Desktop ZIP, Shared Runtime ZIP, SHA-256 checksums, and release-manifest.json.

param(
    [string]$OutputDir = $null,
    [switch]$SkipDesktopBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not $OutputDir) {
    $OutputDir = Join-Path $RepoRoot "release"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 1. Read master version from nexora-version.json
$verFile = Join-Path $RepoRoot "nexora-version.json"
if (-not (Test-Path $verFile)) {
    throw "nexora-version.json missing at: $verFile"
}
$verObj = Get-Content $verFile -Raw | ConvertFrom-Json
$version = if ($verObj.coreVersion) { $verObj.coreVersion } else { "1.0.0" }

Write-Host "=== Building Nexora Skills Manager v$version Release Artifacts ===" -ForegroundColor Cyan

# 2. Build Desktop package if not skipped
$desktopDir = Join-Path $RepoRoot "desktop"
$desktopDist = Join-Path $desktopDir "dist"
$desktopZipName = "NexoraSkillsManager-$version-win-x64.zip"
$desktopZipTarget = Join-Path $OutputDir $desktopZipName

if (-not $SkipDesktopBuild) {
    Write-Host "[1/4] Building Desktop Package (dir + zip)..." -ForegroundColor Yellow
    Push-Location $desktopDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Desktop build failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
}

# Copy or move Desktop ZIP to release output
$builtDesktopZip = Join-Path $desktopDist $desktopZipName
if (-not (Test-Path $builtDesktopZip)) {
    # Fallback to any matching zip in desktop dist
    $candidate = Get-ChildItem $desktopDist -Filter "*.zip" | Select-Object -First 1
    if ($candidate) {
        Copy-Item $candidate.FullName $desktopZipTarget -Force
    } else {
        throw "Desktop zip artifact not found in $desktopDist"
    }
} else {
    Copy-Item $builtDesktopZip $desktopZipTarget -Force
}
Write-Host "      Desktop Package: $desktopZipTarget" -ForegroundColor Green

# 3. Build Shared Runtime Archive
Write-Host "[2/4] Packaging Shared Runtime Archive..." -ForegroundColor Yellow
$runtimeZipName = "NexoraRuntime-$version.zip"
$runtimeZipTarget = Join-Path $OutputDir $runtimeZipName

$stagingRoot = Join-Path $env:TEMP ("NexoraRuntimeStaging-" + [guid]::NewGuid().ToString("N"))
$runtimeStaging = Join-Path $stagingRoot "runtime"
New-Item -ItemType Directory -Path $runtimeStaging -Force | Out-Null

try {
    # 3a. Copy engine (exclude Tests)
    $engineSrc = Join-Path $RepoRoot "engine"
    $engineDst = Join-Path $runtimeStaging "engine"
    New-Item -ItemType Directory -Path $engineDst -Force | Out-Null
    Get-ChildItem $engineSrc -Force | Where-Object { $_.Name -ne "Tests" } | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $engineDst $_.Name) -Recurse -Force
    }

    # 3b. Copy bridge host
    $bridgeDst = Join-Path $runtimeStaging "bridge"
    New-Item -ItemType Directory -Path $bridgeDst -Force | Out-Null
    Copy-Item (Join-Path $RepoRoot "desktop\bridge\NexoraDesktopBridgeHost.ps1") (Join-Path $bridgeDst "NexoraDesktopBridgeHost.ps1") -Force

    # 3c. Copy canonical skill packs
    $skillsDst = Join-Path $runtimeStaging "skills"
    New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
    $skillPacks = @("Frontend-Pro-Max", "Backend-Pro-Max", "Backend-Frameworks", "QA-Debug-Pro-Max", "Fullstack-Extras")
    foreach ($pack in $skillPacks) {
        $srcP = Join-Path $RepoRoot $pack
        if (Test-Path $srcP) {
            Copy-Item $srcP (Join-Path $runtimeStaging $pack) -Recurse -Force
            # Also mirror into skills root for flat discovery
            Copy-Item $srcP (Join-Path $skillsDst $pack) -Recurse -Force
        }
    }

    # 3d. Copy Loaders, version, and batch scripts
    Copy-Item (Join-Path $RepoRoot "Loaders") (Join-Path $runtimeStaging "Loaders") -Recurse -Force
    Copy-Item (Join-Path $RepoRoot "nexora-version.json") (Join-Path $runtimeStaging "nexora-version.json") -Force
    Copy-Item (Join-Path $RepoRoot "Start-Nexora-Skills-Manager.bat") (Join-Path $runtimeStaging "Start-Nexora-Skills-Manager.bat") -Force
    Copy-Item (Join-Path $RepoRoot "Start-Antigravity-Pro-Max.bat") (Join-Path $runtimeStaging "Start-Antigravity-Pro-Max.bat") -Force

    # 3e. Copy Update Helper
    $updateDst = Join-Path $runtimeStaging "update"
    New-Item -ItemType Directory -Path $updateDst -Force | Out-Null
    $helperSrc = Join-Path $RepoRoot "engine\Update\NexoraUpdateHelper.ps1"
    if (Test-Path $helperSrc) {
        Copy-Item $helperSrc (Join-Path $updateDst "NexoraUpdateHelper.ps1") -Force
    }

    # Normalize timestamps for deterministic checksums
    Get-ChildItem -Path $stagingRoot -Recurse | ForEach-Object {
        $_.LastWriteTime = [datetime]"2026-01-01T00:00:00"
        $_.CreationTime = [datetime]"2026-01-01T00:00:00"
        $_.LastAccessTime = [datetime]"2026-01-01T00:00:00"
    }

    # Compress runtime staging deterministically via Python zipfile
    if (Test-Path $runtimeZipTarget) { Remove-Item $runtimeZipTarget -Force }
    $pyScript = @"
import os, zipfile
staging = r'$stagingRoot'
target = r'$runtimeZipTarget'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(staging):
        dirs.sort()
        for file in sorted(files):
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, staging)
            zinfo = zipfile.ZipInfo(rel_path, date_time=(2026, 1, 1, 0, 0, 0))
            with open(full_path, 'rb') as src:
                zf.writestr(zinfo, src.read(), compress_type=zipfile.ZIP_DEFLATED)
"@
    python -c "$pyScript"
}
finally {
    if (Test-Path $stagingRoot) {
        Remove-Item $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "      Runtime Package: $runtimeZipTarget" -ForegroundColor Green

# 4. Compile Windows Installer Bootstrapper EXE
Write-Host "[3/5] Compiling Windows Installer Bootstrapper..." -ForegroundColor Yellow
$installerExeName = "NexoraSkillsManager-Setup-$version.exe"
$installerExeTarget = Join-Path $OutputDir $installerExeName
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$bootstrapperCs = Join-Path $RepoRoot "scripts\installer\NexoraInstallerBootstrapper.cs"

if (Test-Path $cscPath) {
    $icoPath = Join-Path $RepoRoot "assets\branding\NexoraSkillsManager.ico"
    $iconArg = if (Test-Path $icoPath) { "/win32icon:`"$icoPath`"" } else { "" }
    & $cscPath /target:winexe /out:"$installerExeTarget" $iconArg /r:"System.IO.Compression.FileSystem.dll" /optimize+ "$bootstrapperCs" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to compile installer bootstrapper executable. Exit code: $LASTEXITCODE"
    } else {
        Write-Host "      Installer Executable: $installerExeTarget" -ForegroundColor Green
    }
} else {
    Write-Warning "C# compiler not found at $cscPath. Skipping installer executable compilation."
}

# 5. Generate SHA-256 Checksums
Write-Host "[4/5] Generating SHA-256 Checksums..." -ForegroundColor Yellow
$desktopHash = (Get-FileHash -Path $desktopZipTarget -Algorithm SHA256).Hash.ToLowerInvariant()
$runtimeHash = (Get-FileHash -Path $runtimeZipTarget -Algorithm SHA256).Hash.ToLowerInvariant()
$installerHash = if (Test-Path $installerExeTarget) { (Get-FileHash -Path $installerExeTarget -Algorithm SHA256).Hash.ToLowerInvariant() } else { "" }

$checksumContent = @"
$desktopHash  $desktopZipName
$runtimeHash  $runtimeZipName
"@
if ($installerHash) {
    $checksumContent += "`n$installerHash  $installerExeName"
}
Set-Content -Path (Join-Path $OutputDir "SHA256SUMS.txt") -Value $checksumContent.Trim() -Encoding ASCII

# 6. Generate release-manifest.json
Write-Host "[5/5] Generating release-manifest.json..." -ForegroundColor Yellow
$manifest = [PSCustomObject]@{
    schemaVersion           = 1
    product                 = "Nexora Skills Manager"
    version                 = $version
    channel                 = "stable"
    minimumSupportedVersion = "1.0.0"
    publishedAt             = (Get-Date).ToString("o")
    releaseNotesUrl         = "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/tag/v$version"
    desktop                 = [PSCustomObject]@{
        platform = "win32"
        arch     = "x64"
        file     = $desktopZipName
        url      = "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v$version/$desktopZipName"
        sha256   = $desktopHash
        size     = (Get-Item $desktopZipTarget).Length
    }
    runtime                 = [PSCustomObject]@{
        platform = "win32"
        arch     = "x64"
        file     = $runtimeZipName
        url      = "https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v$version/$runtimeZipName"
        sha256   = $runtimeHash
        size     = (Get-Item $runtimeZipTarget).Length
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$manifestJson = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $OutputDir "release-manifest.json"), $manifestJson, $utf8NoBom)

Write-Host ""
Write-Host "=== Release Artifacts Successfully Created in $OutputDir ===" -ForegroundColor Green
Write-Host "Desktop Artifact:   $desktopZipName (SHA-256: $desktopHash)"
Write-Host "Runtime Artifact:   $runtimeZipName (SHA-256: $runtimeHash)"
if ($installerHash) {
    Write-Host "Installer Artifact: $installerExeName (SHA-256: $installerHash)"
}
Write-Host "Manifest:           release-manifest.json"
Write-Host ""

return $manifest
