# NexoraInstaller.ps1 - Unified Transactional Windows Installer for Nexora Skills Manager
# Handles Install, Upgrade, Repair, Uninstall with Backup/Rollback Safety.

# ============================================================================
# ERROR CODES
# ============================================================================
$script:NexoraErrorCodes = @{
    INSTALL_VALIDATION_FAILED   = "INSTALL_VALIDATION_FAILED"
    INSTALL_REPLACEMENT_FAILED  = "INSTALL_REPLACEMENT_FAILED"
    INSTALL_ROLLBACK_FAILED     = "INSTALL_ROLLBACK_FAILED"
    INSTALLATION_IN_USE         = "INSTALLATION_IN_USE"
    UPGRADE_VERSION_MISMATCH    = "UPGRADE_VERSION_MISMATCH"
    DOWNGRADE_NOT_ALLOWED       = "DOWNGRADE_NOT_ALLOWED"
    REPAIR_FAILED               = "REPAIR_FAILED"
    UNINSTALL_FAILED            = "UNINSTALL_FAILED"
}

# ============================================================================
# PATH MANAGEMENT
# ============================================================================
function Register-NexoraUserPath {
    param(
        [Parameter(Mandatory=$true)][string]$BinDir,
        [switch]$SkipEnvironment
    )
    try {
        if ($SkipEnvironment) { return $true }
        $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $cleanBin = [System.IO.Path]::GetFullPath($BinDir).TrimEnd('\', '/')
        $pathParts = if ($UserPath) {
            $UserPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object {
                try { [System.IO.Path]::GetFullPath($_).TrimEnd('\', '/') } catch { $_ }
            }
        } else { @() }
        if ($pathParts -notcontains $cleanBin) {
            $NewPath = if ($UserPath -and $UserPath.Trim().Length -gt 0) { "$UserPath;$BinDir" } else { $BinDir }
            [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        }
        $procPath = $env:Path
        if ($procPath -notlike "*$BinDir*") { $env:Path = "$env:Path;$BinDir" }
        return $true
    } catch {
        Write-Warning "Failed to register User PATH: $($_.Exception.Message)"
        return $false
    }
}

function Unregister-NexoraUserPath {
    param(
        [Parameter(Mandatory=$true)][string]$BinDir,
        [switch]$SkipEnvironment
    )
    try {
        if ($SkipEnvironment) { return $true }
        $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if (-not $UserPath) { return $true }
        $cleanBin = [System.IO.Path]::GetFullPath($BinDir).TrimEnd('\', '/')
        $parts = $UserPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Where-Object {
            $normalized = try { [System.IO.Path]::GetFullPath($_).TrimEnd('\', '/') } catch { $_ }
            $normalized -ne $cleanBin
        }
        $NewPath = ($parts -join ';').TrimEnd(';')
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        return $true
    } catch {
        Write-Warning "Failed to unregister User PATH: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# SHORTCUT MANAGEMENT
# ============================================================================
function New-NexoraStartMenuShortcut {
    param(
        [Parameter(Mandatory=$true)][string]$TargetExePath,
        [string]$ShortcutName = "Nexora Skills Manager",
        [string]$ShortcutDir = $null
    )
    try {
        if (-not (Test-Path $TargetExePath)) { return $false }
        if (-not $ShortcutDir) {
            $programsFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
            if (-not $programsFolder) { $ShortcutDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs" }
            else { $ShortcutDir = $programsFolder }
        }
        if (-not (Test-Path $ShortcutDir)) { New-Item -ItemType Directory -Path $ShortcutDir -Force | Out-Null }
        $shortcutPath = Join-Path $ShortcutDir "$ShortcutName.lnk"
        $wshShell = New-Object -ComObject WScript.Shell
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $TargetExePath
        $shortcut.WorkingDirectory = [System.IO.Path]::GetDirectoryName($TargetExePath)
        $shortcut.Description = "Nexora Skills Manager Desktop Host"
        $shortcut.Save()
        return (Test-Path $shortcutPath)
    } catch {
        Write-Warning "Failed to create Start Menu shortcut: $($_.Exception.Message)"
        return $false
    }
}

function Remove-NexoraStartMenuShortcut {
    param(
        [string]$ShortcutName = "Nexora Skills Manager",
        [string]$ShortcutDir = $null
    )
    try {
        if (-not $ShortcutDir) {
            $programsFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
            if (-not $programsFolder) { $ShortcutDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs" }
            else { $ShortcutDir = $programsFolder }
        }
        $shortcutPath = Join-Path $ShortcutDir "$ShortcutName.lnk"
        if (Test-Path $shortcutPath) {
            Remove-Item $shortcutPath -Force
        }
        return $true
    } catch {
        Write-Warning "Failed to remove Start Menu shortcut: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# METADATA
# ============================================================================
function Set-NexoraInstallMetadata {
    param(
        [Parameter(Mandatory=$true)][string]$StateRoot,
        [Parameter(Mandatory=$true)][hashtable]$Metadata
    )
    if (-not (Test-Path $StateRoot)) { New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null }
    $targetFile = Join-Path $StateRoot "install.json"
    $tempFile = Join-Path $StateRoot "install.json.tmp-$([guid]::NewGuid().ToString('N'))"
    $jsonContent = $Metadata | ConvertTo-Json -Depth 5
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tempFile, $jsonContent, $utf8NoBom)
    Move-Item -Path $tempFile -Destination $targetFile -Force
    return (Test-Path $targetFile)
}

function Get-NexoraInstallMetadata {
    param([string]$StateRoot)
    $metaFile = Join-Path $StateRoot "install.json"
    if (-not (Test-Path $metaFile)) { return $null }
    try {
        $raw = [System.IO.File]::ReadAllText($metaFile, [System.Text.Encoding]::UTF8)
        return ($raw | ConvertFrom-Json)
    } catch { return $null }
}

# ============================================================================
# APPS & FEATURES REGISTRATION (with test abstraction)
# ============================================================================
function Register-NexoraAppsAndFeatures {
    param(
        [Parameter(Mandatory=$true)][string]$Version,
        [Parameter(Mandatory=$true)][string]$InstallLocation,
        [Parameter(Mandatory=$true)][string]$DisplayIcon,
        [Parameter(Mandatory=$true)][string]$UninstallString,
        [string]$RegistryRoot = $null
    )
    try {
        if (-not $RegistryRoot) { $RegistryRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" }
        $keyPath = Join-Path $RegistryRoot "NexoraSkillsManager"
        if (-not (Test-Path $keyPath)) { New-Item -Path $keyPath -Force | Out-Null }
        Set-ItemProperty -Path $keyPath -Name "DisplayName" -Value "Nexora Skills Manager"
        Set-ItemProperty -Path $keyPath -Name "DisplayVersion" -Value $Version
        Set-ItemProperty -Path $keyPath -Name "InstallLocation" -Value $InstallLocation
        Set-ItemProperty -Path $keyPath -Name "DisplayIcon" -Value $DisplayIcon
        Set-ItemProperty -Path $keyPath -Name "UninstallString" -Value $UninstallString
        Set-ItemProperty -Path $keyPath -Name "NoModify" -Value 1 -Type DWord
        Set-ItemProperty -Path $keyPath -Name "NoRepair" -Value 0 -Type DWord
        return $true
    } catch {
        Write-Warning "Failed to register Apps & Features: $($_.Exception.Message)"
        return $false
    }
}

function Unregister-NexoraAppsAndFeatures {
    param([string]$RegistryRoot = $null)
    try {
        if (-not $RegistryRoot) { $RegistryRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" }
        $keyPath = Join-Path $RegistryRoot "NexoraSkillsManager"
        if (Test-Path $keyPath) { Remove-Item -Path $keyPath -Recurse -Force }
        return $true
    } catch {
        Write-Warning "Failed to unregister Apps & Features: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# VERIFICATION
# ============================================================================
function Test-NexoraInstallation {
    param(
        [Parameter(Mandatory=$true)][string]$InstallRoot,
        [Parameter(Mandatory=$true)][string]$DesktopRoot,
        [Parameter(Mandatory=$true)][string]$StateRoot,
        [Parameter(Mandatory=$true)][string]$BinDir
    )
    $requiredFiles = @(
        (Join-Path $InstallRoot "engine\Application\NexoraApplicationService.ps1"),
        (Join-Path $InstallRoot "bridge\NexoraDesktopBridgeHost.ps1"),
        (Join-Path $InstallRoot "nexora-version.json"),
        (Join-Path $DesktopRoot "NexoraSkillsManager.exe"),
        (Join-Path $DesktopRoot "resources\app.asar"),
        (Join-Path $BinDir "nexora.cmd"),
        (Join-Path $StateRoot "install.json")
    )
    $missing = @()
    foreach ($f in $requiredFiles) { if (-not (Test-Path $f)) { $missing += $f } }
    return [PSCustomObject]@{ isValid = ($missing.Count -eq 0); missing = $missing }
}

# ============================================================================
# PROCESS-IN-USE DETECTION (path-based ownership only)
# ============================================================================
function Test-NexoraProcessInUse {
    param(
        [Parameter(Mandatory=$true)][string]$DesktopRoot,
        [Parameter(Mandatory=$true)][string]$InstallRoot
    )
    try {
        $nexoraExe = Join-Path $DesktopRoot "NexoraSkillsManager.exe"
        $processes = Get-Process -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -and (
                $_.Path -eq $nexoraExe -or
                $_.Path -like "$DesktopRoot\*" -or
                $_.Path -like "$InstallRoot\*"
            )
        }
        return [PSCustomObject]@{
            inUse = ($processes.Count -gt 0)
            processes = @($processes | Select-Object Id, ProcessName, Path)
        }
    } catch {
        return [PSCustomObject]@{ inUse = $false; processes = @() }
    }
}

# ============================================================================
# BACKUP & RESTORE
# ============================================================================
function Backup-NexoraInstallation {
    param(
        [Parameter(Mandatory=$true)][string]$BackupRoot,
        [string]$InstallRoot,
        [string]$DesktopRoot,
        [string]$BinDir,
        [string]$StateRoot
    )
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    $backed = @{}

    # Backup runtime
    if ($InstallRoot -and (Test-Path $InstallRoot)) {
        $dst = Join-Path $BackupRoot "runtime"
        Copy-Item $InstallRoot $dst -Recurse -Force
        $backed["runtime"] = $dst
    }
    # Backup Desktop
    if ($DesktopRoot -and (Test-Path $DesktopRoot)) {
        $dst = Join-Path $BackupRoot "desktop"
        Copy-Item $DesktopRoot $dst -Recurse -Force
        $backed["desktop"] = $dst
    }
    # Backup bin
    if ($BinDir -and (Test-Path $BinDir)) {
        $dst = Join-Path $BackupRoot "bin"
        Copy-Item $BinDir $dst -Recurse -Force
        $backed["bin"] = $dst
    }
    # Backup install.json
    if ($StateRoot) {
        $metaFile = Join-Path $StateRoot "install.json"
        if (Test-Path $metaFile) {
            $dst = Join-Path $BackupRoot "install.json"
            Copy-Item $metaFile $dst -Force
            $backed["metadata"] = $dst
        }
    }
    return $backed
}

function Restore-NexoraInstallation {
    param(
        [Parameter(Mandatory=$true)][hashtable]$BackupMap,
        [string]$InstallRoot,
        [string]$DesktopRoot,
        [string]$BinDir,
        [string]$StateRoot
    )
    $restored = @()
    $failures = @()

    try {
        if ($BackupMap.ContainsKey("runtime") -and $InstallRoot) {
            if (Test-Path $InstallRoot) { Remove-Item $InstallRoot -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item $BackupMap["runtime"] $InstallRoot -Recurse -Force
            $restored += "runtime"
        }
    } catch { $failures += "runtime: $($_.Exception.Message)" }

    try {
        if ($BackupMap.ContainsKey("desktop") -and $DesktopRoot) {
            if (Test-Path $DesktopRoot) { Remove-Item $DesktopRoot -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item $BackupMap["desktop"] $DesktopRoot -Recurse -Force
            $restored += "desktop"
        }
    } catch { $failures += "desktop: $($_.Exception.Message)" }

    try {
        if ($BackupMap.ContainsKey("bin") -and $BinDir) {
            if (Test-Path $BinDir) { Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item $BackupMap["bin"] $BinDir -Recurse -Force
            $restored += "bin"
        }
    } catch { $failures += "bin: $($_.Exception.Message)" }

    try {
        if ($BackupMap.ContainsKey("metadata") -and $StateRoot) {
            $dst = Join-Path $StateRoot "install.json"
            Copy-Item $BackupMap["metadata"] $dst -Force
            $restored += "metadata"
        }
    } catch { $failures += "metadata: $($_.Exception.Message)" }

    return [PSCustomObject]@{
        success  = ($failures.Count -eq 0)
        restored = $restored
        failures = $failures
    }
}

# ============================================================================
# VERSION COMPARISON
# ============================================================================
function Compare-NexoraVersions {
    param(
        [Parameter(Mandatory=$true)][string]$Installed,
        [Parameter(Mandatory=$true)][string]$Incoming
    )
    try {
        # Strip non-numeric suffixes for numeric comparison
        $cleanInstalled = ($Installed -replace '-.*$', '')
        $cleanIncoming  = ($Incoming  -replace '-.*$', '')
        $vi = [System.Version]::new($cleanInstalled)
        $vn = [System.Version]::new($cleanIncoming)
        $cmp = $vi.CompareTo($vn)
        if ($cmp -lt 0) { return "UPGRADE" }
        elseif ($cmp -gt 0) { return "DOWNGRADE" }
        else { return "SAME" }
    } catch {
        if ($Installed -eq $Incoming) { return "SAME" }
        return "UNKNOWN"
    }
}

# ============================================================================
# DEPLOY HELPERS (shared between install modes)
# ============================================================================
function Deploy-NexoraCliShims {
    param(
        [Parameter(Mandatory=$true)][string]$BinDir,
        [Parameter(Mandatory=$true)][string]$StateRoot
    )
    if (-not (Test-Path $BinDir)) { New-Item -ItemType Directory -Path $BinDir -Force | Out-Null }

    $nexoraCmdContent = @"
@echo off
setlocal EnableExtensions

if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)

set "META=$StateRoot\install.json"
if exist "%META%" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-Content '%META%' -Raw | ConvertFrom-Json).runtimeRoot"`) do set "NEXORA_INSTALL_PATH=%%I"
)

if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Nexora Skills Manager runtime could not be located.
echo Please run the setup script again to repair your installation.
exit /b 1
"@
    Set-Content -Path (Join-Path $BinDir "nexora.cmd") -Value $nexoraCmdContent -Encoding ASCII

    $agpmCmdContent = @"
@echo off
setlocal EnableExtensions
echo.
echo ===============================================================================
echo  [NOTICE] The 'agpm' command has transitioned to 'nexora' (Nexora Skills Manager).
echo           Please use 'nexora' in the future. Forwarding command...
echo ===============================================================================
echo.
call "%~dp0\nexora.cmd" %*
exit /b %ERRORLEVEL%
"@
    Set-Content -Path (Join-Path $BinDir "agpm.cmd") -Value $agpmCmdContent -Encoding ASCII
}

function Deploy-NexoraRuntimeFromStaging {
    param(
        [Parameter(Mandatory=$true)][string]$StagedSource,
        [Parameter(Mandatory=$true)][string]$InstallRoot
    )
    if (-not (Test-Path $InstallRoot)) { New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null }
    Get-ChildItem $StagedSource -Force | ForEach-Object {
        $destP = Join-Path $InstallRoot $_.Name
        if ($_.PSIsContainer) {
            if (Test-Path $destP) { Remove-Item $destP -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item $_.FullName $destP -Recurse -Force
        } else {
            Copy-Item $_.FullName $destP -Force
        }
    }
}

function Deploy-NexoraDesktopFromStaging {
    param(
        [Parameter(Mandatory=$true)][string]$StagedSource,
        [Parameter(Mandatory=$true)][string]$DesktopRoot
    )
    if (-not (Test-Path $DesktopRoot)) { New-Item -ItemType Directory -Path $DesktopRoot -Force | Out-Null }
    Get-ChildItem $StagedSource -Force | ForEach-Object {
        $destP = Join-Path $DesktopRoot $_.Name
        if ($_.PSIsContainer) {
            if (Test-Path $destP) { Remove-Item $destP -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item $_.FullName $destP -Recurse -Force
        } else {
            Copy-Item $_.FullName $destP -Force
        }
    }
}

# ============================================================================
# INSTALL-NEXORAUNIFIED — Transactional Install/Upgrade with Rollback
# ============================================================================
function Install-NexoraUnified {
    param(
        [string]$InstallRoot = $null,
        [string]$StateRoot = $null,
        [string]$DesktopRoot = $null,
        [string]$BinDir = $null,
        [string]$SourceDir = $null,
        [string]$DesktopSourceDir = $null,
        [string]$DesktopZipPath = $null,
        [string]$RuntimeZipPath = $null,
        [string]$ManifestPath = $null,
        [switch]$SkipPathRegistration,
        [switch]$SkipShortcut,
        [switch]$SkipAppsAndFeatures,
        [switch]$AllowDowngrade,
        [switch]$Repair,
        [switch]$NonInteractive,
        [string]$ShortcutDir = $null,
        [string]$RegistryRoot = $null,
        # Testing hooks
        [string]$InjectFailureAt = $null
    )

    # Resolve defaults
    $LocalApp = $env:LOCALAPPDATA
    if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }
    if (-not $InstallRoot)  { $InstallRoot  = Join-Path $LocalApp "NexoraSkillsManager\runtime" }
    if (-not $StateRoot)    { $StateRoot    = Join-Path $LocalApp "NexoraSkillsManager" }
    if (-not $DesktopRoot)  { $DesktopRoot  = Join-Path $LocalApp "Programs\NexoraSkillsManager" }
    if (-not $BinDir)       { $BinDir       = Join-Path $LocalApp "NexoraSkillsManager\bin" }

    # Transaction state
    $txn = @{
        operationId           = "txn_" + [guid]::NewGuid().ToString("N").Substring(0, 12)
        operationType         = "install"
        oldVersion            = $null
        newVersion            = "1.0.0"
        hadExistingInstall    = $false
        backupRoot            = $null
        backupMap             = $null
        replacementStarted    = $false
        verificationCompleted = $false
        pathWasRegistered     = $false
        shortcutCreated       = $false
    }

    $stagingRoot = Join-Path $env:TEMP ("NexoraInstall-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

    try {
        # ── PHASE 1: DETECT EXISTING INSTALLATION ──
        $existingMeta = Get-NexoraInstallMetadata -StateRoot $StateRoot
        if ($existingMeta -and $existingMeta.version) {
            $txn.hadExistingInstall = $true
            $txn.oldVersion = $existingMeta.version
        }

        # ── PHASE 2: RESOLVE & VALIDATE SOURCE ──
        $version = "1.0.0"
        $stagedRuntime = $null
        $stagedDesktop = $null

        if ($ManifestPath -and (Test-Path $ManifestPath)) {
            # Artifact archive mode
            $manifestDir = Split-Path $ManifestPath -Parent
            $manifestObj = Get-Content $ManifestPath -Raw | ConvertFrom-Json
            $version = if ($manifestObj.version) { $manifestObj.version } else { "1.0.0" }

            if (-not $DesktopZipPath) { $DesktopZipPath = Join-Path $manifestDir $manifestObj.desktop.file }
            if (-not $RuntimeZipPath) { $RuntimeZipPath = Join-Path $manifestDir $manifestObj.runtime.file }

            if (-not (Test-Path $DesktopZipPath)) { throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Desktop zip missing: $DesktopZipPath" }
            if (-not (Test-Path $RuntimeZipPath)) { throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Runtime zip missing: $RuntimeZipPath" }

            # Checksum verification
            $actualDesktopHash = (Get-FileHash -Path $DesktopZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($manifestObj.desktop.sha256 -and ($actualDesktopHash -ne $manifestObj.desktop.sha256.ToLowerInvariant())) {
                throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Desktop checksum mismatch"
            }
            $actualRuntimeHash = (Get-FileHash -Path $RuntimeZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($manifestObj.runtime.sha256 -and ($actualRuntimeHash -ne $manifestObj.runtime.sha256.ToLowerInvariant())) {
                throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Runtime checksum mismatch"
            }

            # Extract to staging
            $stagedDesktop = Join-Path $stagingRoot "desktop"
            $stagedRuntime = Join-Path $stagingRoot "runtime-extract"
            New-Item -ItemType Directory -Path $stagedDesktop -Force | Out-Null
            New-Item -ItemType Directory -Path $stagedRuntime -Force | Out-Null
            Expand-Archive -Path $DesktopZipPath -DestinationPath $stagedDesktop -Force
            Expand-Archive -Path $RuntimeZipPath -DestinationPath $stagedRuntime -Force
            if (Test-Path (Join-Path $stagedRuntime "runtime")) { $stagedRuntime = Join-Path $stagedRuntime "runtime" }
        }
        else {
            # Local source mode
            if (-not $SourceDir) { $SourceDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..")) }
            $sourceVerPath = Join-Path $SourceDir "nexora-version.json"
            if (-not (Test-Path $sourceVerPath)) { throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Source nexora-version.json missing" }
            $verObj = Get-Content $sourceVerPath -Raw | ConvertFrom-Json
            $version = if ($verObj.version) { $verObj.version } elseif ($verObj.coreVersion) { $verObj.coreVersion } else { "1.0.0" }

            if (-not $DesktopSourceDir) {
                foreach ($d in @("desktop\dist\win-unpacked", "dist\win-unpacked", "win-unpacked")) {
                    $cand = Join-Path $SourceDir $d
                    if (Test-Path (Join-Path $cand "NexoraSkillsManager.exe")) { $DesktopSourceDir = $cand; break }
                }
            }
            if (-not $DesktopSourceDir -or -not (Test-Path (Join-Path $DesktopSourceDir "NexoraSkillsManager.exe"))) {
                throw "$($script:NexoraErrorCodes.INSTALL_VALIDATION_FAILED): Packaged Desktop binary not found"
            }

            # Stage runtime from source
            $stagedRuntime = Join-Path $stagingRoot "runtime"
            New-Item -ItemType Directory -Path $stagedRuntime -Force | Out-Null
            # Engine (exclude Tests)
            $engineSrc = Join-Path $SourceDir "engine"
            $engineDst = Join-Path $stagedRuntime "engine"
            New-Item -ItemType Directory -Path $engineDst -Force | Out-Null
            Get-ChildItem $engineSrc -Force | Where-Object { $_.Name -ne "Tests" } | ForEach-Object {
                Copy-Item $_.FullName (Join-Path $engineDst $_.Name) -Recurse -Force
            }
            # Bridge
            $bridgeDst = Join-Path $stagedRuntime "bridge"
            New-Item -ItemType Directory -Path $bridgeDst -Force | Out-Null
            $bridgeSrc = Join-Path $SourceDir "desktop\bridge\NexoraDesktopBridgeHost.ps1"
            if (-not (Test-Path $bridgeSrc)) { $bridgeSrc = Join-Path $SourceDir "bridge\NexoraDesktopBridgeHost.ps1" }
            if (Test-Path $bridgeSrc) { Copy-Item $bridgeSrc (Join-Path $bridgeDst "NexoraDesktopBridgeHost.ps1") -Force }
            # Skill packs
            foreach ($pack in @("Frontend-Pro-Max", "Backend-Pro-Max", "Backend-Frameworks", "QA-Debug-Pro-Max", "Fullstack-Extras", "Loaders")) {
                $srcP = Join-Path $SourceDir $pack
                if (Test-Path $srcP) { Copy-Item $srcP (Join-Path $stagedRuntime $pack) -Recurse -Force }
            }
            Copy-Item $sourceVerPath (Join-Path $stagedRuntime "nexora-version.json") -Force
            $batchSrc = Join-Path $SourceDir "Start-Nexora-Skills-Manager.bat"
            if (Test-Path $batchSrc) { Copy-Item $batchSrc (Join-Path $stagedRuntime "Start-Nexora-Skills-Manager.bat") -Force }
            $agpmBat = Join-Path $SourceDir "Start-Antigravity-Pro-Max.bat"
            if (Test-Path $agpmBat) { Copy-Item $agpmBat (Join-Path $stagedRuntime "Start-Antigravity-Pro-Max.bat") -Force }

            # Stage Desktop from source
            $stagedDesktop = Join-Path $stagingRoot "desktop"
            New-Item -ItemType Directory -Path $stagedDesktop -Force | Out-Null
            Get-ChildItem $DesktopSourceDir -Force | ForEach-Object {
                Copy-Item $_.FullName (Join-Path $stagedDesktop $_.Name) -Recurse -Force
            }
        }

        $txn.newVersion = $version
        if ($Repair) { $txn.operationType = "repair" }
        elseif ($txn.hadExistingInstall) {
            $comparison = Compare-NexoraVersions -Installed $txn.oldVersion -Incoming $version
            if ($comparison -eq "UPGRADE") { $txn.operationType = "upgrade" }
            elseif ($comparison -eq "DOWNGRADE" -and -not $AllowDowngrade) {
                throw "$($script:NexoraErrorCodes.DOWNGRADE_NOT_ALLOWED): Installed $($txn.oldVersion) > incoming $version"
            }
            elseif ($comparison -eq "DOWNGRADE") { $txn.operationType = "downgrade" }
            else { $txn.operationType = "reinstall" }
        }

        # ── PHASE 3: PROCESS-IN-USE CHECK ──
        if ($txn.hadExistingInstall) {
            $inUse = Test-NexoraProcessInUse -DesktopRoot $DesktopRoot -InstallRoot $InstallRoot
            if ($inUse.inUse) {
                throw "$($script:NexoraErrorCodes.INSTALLATION_IN_USE): Nexora processes are running"
            }
        }

        # ── INJECT FAILURE: before_backup ──
        if ($InjectFailureAt -eq "before_backup") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at before_backup" }

        # ── PHASE 4: BACKUP EXISTING INSTALLATION ──
        if ($txn.hadExistingInstall) {
            $txn.backupRoot = Join-Path $stagingRoot "backup"
            $txn.backupMap = Backup-NexoraInstallation -BackupRoot $txn.backupRoot -InstallRoot $InstallRoot -DesktopRoot $DesktopRoot -BinDir $BinDir -StateRoot $StateRoot
        }

        # ── INJECT FAILURE: after_backup ──
        if ($InjectFailureAt -eq "after_backup") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_backup" }

        # ── PHASE 5: REPLACE FILES ──
        $txn.replacementStarted = $true

        # Prepare directories
        New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
        New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null
        New-Item -ItemType Directory -Path (Join-Path $StateRoot "logs") -Force | Out-Null
        New-Item -ItemType Directory -Path $DesktopRoot -Force | Out-Null
        New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

        # Deploy runtime
        Deploy-NexoraRuntimeFromStaging -StagedSource $stagedRuntime -InstallRoot $InstallRoot

        # ── INJECT FAILURE: after_runtime ──
        if ($InjectFailureAt -eq "after_runtime") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_runtime" }

        # Deploy Desktop
        Deploy-NexoraDesktopFromStaging -StagedSource $stagedDesktop -DesktopRoot $DesktopRoot

        # ── INJECT FAILURE: after_desktop ──
        if ($InjectFailureAt -eq "after_desktop") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_desktop" }

        # Deploy CLI shims
        Deploy-NexoraCliShims -BinDir $BinDir -StateRoot $StateRoot

        # ── INJECT FAILURE: after_cli ──
        if ($InjectFailureAt -eq "after_cli") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_cli" }

        # Copy uninstall script to installed location
        $installScriptDir = Join-Path $InstallRoot "install"
        New-Item -ItemType Directory -Path $installScriptDir -Force | Out-Null
        $uninstallSrc = Join-Path (Split-Path $PSScriptRoot -Parent) "uninstall.ps1"
        if (-not (Test-Path $uninstallSrc)) { $uninstallSrc = Join-Path ([System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..") )) "uninstall.ps1" }
        if (Test-Path $uninstallSrc) { Copy-Item $uninstallSrc (Join-Path $installScriptDir "uninstall.ps1") -Force }

        # PATH registration
        if (-not $SkipPathRegistration) {
            Register-NexoraUserPath -BinDir $BinDir | Out-Null
            $txn.pathWasRegistered = $true
        }

        # Shortcut
        if (-not $SkipShortcut) {
            $exePath = Join-Path $DesktopRoot "NexoraSkillsManager.exe"
            $txn.shortcutCreated = New-NexoraStartMenuShortcut -TargetExePath $exePath -ShortcutDir $ShortcutDir
        }

        # ── INJECT FAILURE: before_metadata ──
        if ($InjectFailureAt -eq "before_metadata") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at before_metadata" }

        # Write install.json
        $uninstallScriptPath = Join-Path $InstallRoot "install\uninstall.ps1"
        $meta = @{
            version           = $version
            channel           = "stable"
            runtimeRoot       = $InstallRoot
            engineRoot        = (Join-Path $InstallRoot "engine")
            bridgeEntry       = (Join-Path $InstallRoot "bridge\NexoraDesktopBridgeHost.ps1")
            desktopRoot       = $DesktopRoot
            desktopExecutable = (Join-Path $DesktopRoot "NexoraSkillsManager.exe")
            binDir            = $BinDir
            cliShim           = (Join-Path $BinDir "nexora.cmd")
            uninstallScript   = $uninstallScriptPath
            installedAt       = (Get-Date).ToString("o")
            installMethod     = if ($ManifestPath) { "artifact_manifest" } else { "unified_setup" }
        }
        Set-NexoraInstallMetadata -StateRoot $StateRoot -Metadata $meta | Out-Null

        # ── INJECT FAILURE: after_metadata ──
        if ($InjectFailureAt -eq "after_metadata") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_metadata" }

        # Apps & Features registration
        if (-not $SkipAppsAndFeatures) {
            $uninstallCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$uninstallScriptPath`" -Force"
            Register-NexoraAppsAndFeatures -Version $version -InstallLocation $InstallRoot `
                -DisplayIcon (Join-Path $DesktopRoot "NexoraSkillsManager.exe") `
                -UninstallString $uninstallCmd `
                -RegistryRoot $RegistryRoot | Out-Null
        }

        # ── PHASE 6: VERIFY ──
        $verification = Test-NexoraInstallation -InstallRoot $InstallRoot -DesktopRoot $DesktopRoot -StateRoot $StateRoot -BinDir $BinDir
        if (-not $verification.isValid) {
            throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Verification failed. Missing: $($verification.missing -join ', ')"
        }
        $txn.verificationCompleted = $true

        # ── INJECT FAILURE: after_verify ──
        if ($InjectFailureAt -eq "after_verify") { throw "$($script:NexoraErrorCodes.INSTALL_REPLACEMENT_FAILED): Injected test failure at after_verify" }

        # ── PHASE 7: COMMIT (delete backup) ──
        if ($txn.backupRoot -and (Test-Path $txn.backupRoot)) {
            Remove-Item $txn.backupRoot -Recurse -Force -ErrorAction SilentlyContinue
        }

        return [PSCustomObject]@{
            success           = $true
            operationType     = $txn.operationType
            version           = $version
            previousVersion   = $txn.oldVersion
            runtimeRoot       = $InstallRoot
            engineRoot        = (Join-Path $InstallRoot "engine")
            bridgeEntry       = (Join-Path $InstallRoot "bridge\NexoraDesktopBridgeHost.ps1")
            desktopExecutable = (Join-Path $DesktopRoot "NexoraSkillsManager.exe")
            cliShim           = (Join-Path $BinDir "nexora.cmd")
            shortcutCreated   = $txn.shortcutCreated
            verified          = $true
        }
    }
    catch {
        $errorMsg = $_.Exception.Message

        # ── ROLLBACK ──
        if ($txn.replacementStarted -and $txn.hadExistingInstall -and $txn.backupMap) {
            try {
                $rollbackResult = Restore-NexoraInstallation -BackupMap $txn.backupMap -InstallRoot $InstallRoot -DesktopRoot $DesktopRoot -BinDir $BinDir -StateRoot $StateRoot
                if (-not $rollbackResult.success) {
                    throw "$($script:NexoraErrorCodes.INSTALL_ROLLBACK_FAILED): Rollback incomplete: $($rollbackResult.failures -join '; '). Backup preserved at: $($txn.backupRoot)"
                }
            } catch {
                throw "$($script:NexoraErrorCodes.INSTALL_ROLLBACK_FAILED): $($_.Exception.Message). Backup preserved at: $($txn.backupRoot)"
            }
        }
        elseif ($txn.replacementStarted -and -not $txn.hadExistingInstall) {
            # Fresh install failure: clean up partial installation
            if (Test-Path $InstallRoot)  { Remove-Item $InstallRoot -Recurse -Force -ErrorAction SilentlyContinue }
            if (Test-Path $DesktopRoot)  { Remove-Item $DesktopRoot -Recurse -Force -ErrorAction SilentlyContinue }
            if (Test-Path $BinDir)       { Remove-Item $BinDir -Recurse -Force -ErrorAction SilentlyContinue }
            $metaFile = Join-Path $StateRoot "install.json"
            if (Test-Path $metaFile) { Remove-Item $metaFile -Force -ErrorAction SilentlyContinue }
            if ($txn.pathWasRegistered -and -not $SkipPathRegistration) {
                Unregister-NexoraUserPath -BinDir $BinDir -ErrorAction SilentlyContinue | Out-Null
            }
            if ($txn.shortcutCreated -and -not $SkipShortcut) {
                Remove-NexoraStartMenuShortcut -ShortcutDir $ShortcutDir -ErrorAction SilentlyContinue | Out-Null
            }
            if (-not $SkipAppsAndFeatures) {
                Unregister-NexoraAppsAndFeatures -RegistryRoot $RegistryRoot -ErrorAction SilentlyContinue | Out-Null
            }
        }

        throw $errorMsg
    }
    finally {
        # Clean staging (but NOT backup if rollback failed)
        $stagingOnly = Join-Path $stagingRoot "desktop"
        if (Test-Path $stagingRoot) {
            # Preserve backup dir if it still exists (rollback failure case)
            $backupStillExists = $txn.backupRoot -and (Test-Path $txn.backupRoot)
            if (-not $backupStillExists) {
                Remove-Item $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# ============================================================================
# REPAIR-NEXORAUNIFIED
# ============================================================================
function Repair-NexoraUnified {
    param(
        [string]$InstallRoot = $null,
        [string]$StateRoot = $null,
        [string]$DesktopRoot = $null,
        [string]$BinDir = $null,
        [string]$ManifestPath = $null,
        [string]$DesktopZipPath = $null,
        [string]$RuntimeZipPath = $null,
        [string]$SourceDir = $null,
        [string]$DesktopSourceDir = $null,
        [switch]$SkipPathRegistration,
        [switch]$SkipShortcut,
        [switch]$SkipAppsAndFeatures,
        [string]$ShortcutDir = $null,
        [string]$RegistryRoot = $null
    )

    return Install-NexoraUnified -InstallRoot $InstallRoot -StateRoot $StateRoot -DesktopRoot $DesktopRoot `
        -BinDir $BinDir -ManifestPath $ManifestPath -DesktopZipPath $DesktopZipPath -RuntimeZipPath $RuntimeZipPath `
        -SourceDir $SourceDir -DesktopSourceDir $DesktopSourceDir -Repair `
        -SkipPathRegistration:$SkipPathRegistration -SkipShortcut:$SkipShortcut `
        -SkipAppsAndFeatures:$SkipAppsAndFeatures -ShortcutDir $ShortcutDir -RegistryRoot $RegistryRoot
}

# ============================================================================
# UNINSTALL-NEXORAUNIFIED
# ============================================================================
function Uninstall-NexoraUnified {
    param(
        [string]$StateRoot = $null,
        [switch]$RemoveUserData,
        [switch]$SkipPathRemoval,
        [switch]$SkipShortcutRemoval,
        [switch]$SkipAppsAndFeatures,
        [string]$ShortcutDir = $null,
        [string]$RegistryRoot = $null
    )

    $LocalApp = $env:LOCALAPPDATA
    if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }
    if (-not $StateRoot) { $StateRoot = Join-Path $LocalApp "NexoraSkillsManager" }

    $meta = Get-NexoraInstallMetadata -StateRoot $StateRoot
    $installRoot  = if ($meta -and $meta.runtimeRoot) { $meta.runtimeRoot } else { Join-Path $StateRoot "runtime" }
    $desktopRoot  = if ($meta -and $meta.desktopRoot) { $meta.desktopRoot } else { Join-Path $LocalApp "Programs\NexoraSkillsManager" }
    $binDir       = if ($meta -and $meta.binDir) { $meta.binDir } else { Join-Path $StateRoot "bin" }

    $removed = @()
    $preserved = @()

    # 1. Process-in-use check
    $inUse = Test-NexoraProcessInUse -DesktopRoot $desktopRoot -InstallRoot $installRoot
    if ($inUse.inUse) {
        throw "$($script:NexoraErrorCodes.INSTALLATION_IN_USE): Nexora processes are running. Please close Nexora Skills Manager first."
    }

    # 2. Remove Desktop application
    if ($desktopRoot -and (Test-Path $desktopRoot) -and $desktopRoot.Length -gt 10) {
        Remove-Item $desktopRoot -Recurse -Force -ErrorAction SilentlyContinue
        $removed += "desktop"
    }

    # 3. Remove Runtime
    if ($installRoot -and (Test-Path $installRoot) -and $installRoot.Length -gt 10) {
        Remove-Item $installRoot -Recurse -Force -ErrorAction SilentlyContinue
        $removed += "runtime"
    }

    # 4. Remove CLI bin
    if ($binDir -and (Test-Path $binDir) -and $binDir.Length -gt 10) {
        Remove-Item $binDir -Recurse -Force -ErrorAction SilentlyContinue
        $removed += "bin"
    }

    # 5. Remove install.json
    $metaFile = Join-Path $StateRoot "install.json"
    if (Test-Path $metaFile) {
        Remove-Item $metaFile -Force -ErrorAction SilentlyContinue
        $removed += "install.json"
    }

    # 6. Remove PATH entry
    if (-not $SkipPathRemoval) {
        Unregister-NexoraUserPath -BinDir $binDir | Out-Null
        $removed += "PATH"
    }

    # 7. Remove shortcut
    if (-not $SkipShortcutRemoval) {
        Remove-NexoraStartMenuShortcut -ShortcutDir $ShortcutDir | Out-Null
        $removed += "shortcut"
    }

    # 8. Remove Apps & Features
    if (-not $SkipAppsAndFeatures) {
        Unregister-NexoraAppsAndFeatures -RegistryRoot $RegistryRoot | Out-Null
        $removed += "registry"
    }

    # 9. Clear NEXORA_INSTALL_PATH if set
    try { [Environment]::SetEnvironmentVariable("NEXORA_INSTALL_PATH", $null, "User") } catch {}

    # 10. Handle user data
    $projectsFile = Join-Path $StateRoot "projects.json"
    $customSkills = Join-Path $StateRoot "skills"
    $logsDir      = Join-Path $StateRoot "logs"

    # projects.json is ALWAYS preserved
    if (Test-Path $projectsFile) { $preserved += "projects.json" }

    if ($RemoveUserData) {
        # Remove custom skills
        if (Test-Path $customSkills) {
            Remove-Item $customSkills -Recurse -Force -ErrorAction SilentlyContinue
            $removed += "custom_skills"
        }
        # Remove logs
        if (Test-Path $logsDir) {
            Remove-Item $logsDir -Recurse -Force -ErrorAction SilentlyContinue
            $removed += "logs"
        }
    } else {
        if (Test-Path $customSkills) { $preserved += "custom_skills" }
        if (Test-Path $logsDir) { $preserved += "logs" }
    }

    return [PSCustomObject]@{
        success   = $true
        removed   = $removed
        preserved = $preserved
    }
}

if ($ExecutionContext.SessionState.Module) {
    Export-ModuleMember -Function Install-NexoraUnified, Repair-NexoraUnified, Uninstall-NexoraUnified, Test-NexoraInstallation, Get-NexoraInstallMetadata, Set-NexoraInstallMetadata, Register-NexoraUserPath, Unregister-NexoraUserPath, New-NexoraStartMenuShortcut, Remove-NexoraStartMenuShortcut, Register-NexoraAppsAndFeatures, Unregister-NexoraAppsAndFeatures, Test-NexoraProcessInUse, Backup-NexoraInstallation, Restore-NexoraInstallation, Compare-NexoraVersions, Deploy-NexoraCliShims -ErrorAction SilentlyContinue
}
