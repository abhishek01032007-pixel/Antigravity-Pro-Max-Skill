# NexoraUpdateHelper.ps1 - Detached Update Execution & Lifecycle Coordination Helper
# Part of Nexora Skills Manager Phase 8 Update System

param(
    [Parameter(Mandatory=$true)][string]$Handoff,
    [switch]$NoRelaunch,
    [int]$ParentWaitTimeoutSec = 60,
    # Testing override
    [string]$InjectFailureAt = $null
)

$ErrorActionPreference = "Stop"

function Write-UpdateLog {
    param([string]$Message)
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    [Console]::WriteLine("[NexoraUpdateHelper $ts] $Message")
}

Write-UpdateLog "Starting update helper with handoff: $Handoff"

# ============================================================================
# STEP 1: VALIDATE HANDOFF LOCATION & INTEGRITY
# ============================================================================
if (-not (Test-Path $Handoff)) {
    Write-Error "Handoff file not found: $Handoff"
    exit 1
}

$handoffDir = [System.IO.Path]::GetFullPath((Split-Path $Handoff -Parent))
$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())

# Verify handoff is strictly within a NexoraSkillsManager-Update-* folder
if (-not $handoffDir.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase) -or -not ($handoffDir -match 'NexoraSkillsManager-Update-')) {
    Write-Error "Security violation: Handoff path '$Handoff' is outside authorized update staging."
    exit 1
}

$handoffRaw = Get-Content -Path $Handoff -Raw -Encoding UTF8
$handoffObj = $handoffRaw | ConvertFrom-Json

if (-not $handoffObj -or $handoffObj.schemaVersion -ne 1 -or -not $handoffObj.operationId) {
    Write-Error "Invalid handoff record schema."
    exit 1
}

$operationId = $handoffObj.operationId
$targetVersion = $handoffObj.version
$parentPid = $handoffObj.parentPid
$desktopArtifact = $handoffObj.desktopArtifact
$runtimeArtifact = $handoffObj.runtimeArtifact
$manifestPath = $handoffObj.manifestPath

$installRoot = $handoffObj.installedRuntimeRoot
$stateRoot = $handoffObj.installedStateRoot
$desktopRoot = $handoffObj.installedDesktopRoot
$binDir = $handoffObj.installedBinDir
$relaunchExe = $handoffObj.relaunchExecutable

if (-not $stateRoot) {
    $stateRoot = Join-Path $env:LOCALAPPDATA "NexoraSkillsManager"
}
$updateStateDir = Join-Path $stateRoot "update-state"
$lastResultPath = Join-Path $updateStateDir "last-result.json"

# ============================================================================
# STEP 2: PARENT DESKTOP PROCESS COORDINATION
# ============================================================================
if ($parentPid -and $parentPid -gt 0) {
    Write-UpdateLog "Waiting for parent Desktop process (PID $parentPid) to exit..."
    $waitStart = [DateTime]::UtcNow
    $parentExited = $false

    while (([DateTime]::UtcNow - $waitStart).TotalSeconds -lt $ParentWaitTimeoutSec) {
        $parentProc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        if (-not $parentProc -or $parentProc.HasExited) {
            $parentExited = $true
            break
        }
        Start-Sleep -Milliseconds 250
    }

    if (-not $parentExited) {
        Write-UpdateLog "Timeout: Parent Desktop process (PID $parentPid) did not exit within $ParentWaitTimeoutSec seconds."

        # Record failure result
        New-Item -ItemType Directory -Path $updateStateDir -Force | Out-Null
        $failResult = @{
            schemaVersion = 1
            operationId = $operationId
            oldVersion = $handoffObj.currentVersion
            targetVersion = $targetVersion
            success = $false
            previousVersionRestored = $true
            installerCode = "PARENT_EXIT_TIMEOUT"
            completedAt = (Get-Date).ToString("o")
            relaunchAttempted = $false
            relaunchSucceeded = $false
        }
        $failResult | ConvertTo-Json -Depth 5 | Set-Content -Path $lastResultPath -Encoding UTF8
        exit 1
    }
    Write-UpdateLog "Parent process exited cleanly."
}

# ============================================================================
# STEP 3: PRE-INSTALL ARTIFACT RE-VALIDATION (ZERO TRUST)
# ============================================================================
Write-UpdateLog "Re-validating staged update artifacts..."

if (-not (Test-Path $desktopArtifact.path)) {
    Write-Error "Desktop artifact missing at: $($desktopArtifact.path)"
    exit 1
}
if (-not (Test-Path $runtimeArtifact.path)) {
    Write-Error "Runtime artifact missing at: $($runtimeArtifact.path)"
    exit 1
}

# Re-check file sizes
$deskFile = Get-Item $desktopArtifact.path
if ($deskFile.Length -ne $desktopArtifact.size) {
    Write-Error "Desktop artifact size mismatch before install. Expected: $($desktopArtifact.size), Actual: $($deskFile.Length)"
    exit 1
}
$runFile = Get-Item $runtimeArtifact.path
if ($runFile.Length -ne $runtimeArtifact.size) {
    Write-Error "Runtime artifact size mismatch before install. Expected: $($runtimeArtifact.size), Actual: $($runFile.Length)"
    exit 1
}

# Re-compute SHA-256 hashes
$deskSha = (Get-FileHash -Path $desktopArtifact.path -Algorithm SHA256).Hash.ToLowerInvariant()
if ($deskSha -ne $desktopArtifact.sha256.ToLowerInvariant()) {
    Write-Error "Desktop SHA-256 checksum mismatch before install."
    exit 1
}
$runSha = (Get-FileHash -Path $runtimeArtifact.path -Algorithm SHA256).Hash.ToLowerInvariant()
if ($runSha -ne $runtimeArtifact.sha256.ToLowerInvariant()) {
    Write-Error "Runtime SHA-256 checksum mismatch before install."
    exit 1
}

Write-UpdateLog "All update artifacts cryptographically re-verified."

# ============================================================================
# STEP 4: INVOKE PHASE 7 TRANSACTIONAL INSTALLER
# ============================================================================
$installerScript = Join-Path $PSScriptRoot "NexoraInstaller.ps1"
if (-not (Test-Path $installerScript)) {
    # Fallback to engine/Install if running in test environment
    $installerScript = Join-Path $PSScriptRoot "..\Install\NexoraInstaller.ps1"
}
if (-not (Test-Path $installerScript)) {
    Write-Error "NexoraInstaller.ps1 could not be located."
    exit 1
}

. $installerScript

Write-UpdateLog "Invoking Phase 7 transactional installer..."

$installParams = @{
    ManifestPath      = $manifestPath
    DesktopZipPath    = $desktopArtifact.path
    RuntimeZipPath    = $runtimeArtifact.path
    InstallRoot       = $installRoot
    StateRoot         = $stateRoot
    DesktopRoot       = $desktopRoot
    BinDir            = $binDir
    NonInteractive    = $true
}

if ($InjectFailureAt) {
    $installParams["InjectFailureAt"] = $InjectFailureAt
}

$installRes = Install-NexoraUnified @installParams

Write-UpdateLog "Installer transaction returned: Success=$($installRes.success)"

# ============================================================================
# STEP 5: RECORD PERSISTENT RESULT
# ============================================================================
New-Item -ItemType Directory -Path $updateStateDir -Force | Out-Null

$relaunchAttempted = $false
$relaunchSucceeded = $false

$resultData = [ordered]@{
    schemaVersion           = 1
    operationId             = $operationId
    oldVersion              = if ($installRes.oldVersion) { $installRes.oldVersion } else { $handoffObj.currentVersion }
    targetVersion           = $targetVersion
    success                 = $installRes.success
    previousVersionRestored = ($installRes.success -eq $false -and $installRes.rollbackSucceeded -eq $true)
    installerCode           = if ($installRes.success) { "SUCCESS" } else { if ($installRes.errorCode) { $installRes.errorCode } else { "INSTALL_FAILED" } }
    completedAt             = (Get-Date).ToString("o")
    relaunchAttempted       = $false
    relaunchSucceeded       = $false
}

# ============================================================================
# STEP 6: SAFE RELAUNCH COORDINATION
# ============================================================================
if (-not $NoRelaunch) {
    if ($installRes.success) {
        if ($relaunchExe -and (Test-Path $relaunchExe)) {
            Write-UpdateLog "Relaunching updated application: $relaunchExe"
            $relaunchAttempted = $true
            try {
                Start-Process -FilePath $relaunchExe -ArgumentList "--update-completed"
                $relaunchSucceeded = $true
            } catch {
                Write-Warning "Failed to relaunch updated application: $($_.Exception.Message)"
            }
        }
    }
    elseif ($installRes.rollbackSucceeded -and $relaunchExe -and (Test-Path $relaunchExe)) {
        Write-UpdateLog "Relaunching restored application after rollback: $relaunchExe"
        $relaunchAttempted = $true
        try {
            Start-Process -FilePath $relaunchExe -ArgumentList "--update-failed-restored"
            $relaunchSucceeded = $true
        } catch {
            Write-Warning "Failed to relaunch restored application: $($_.Exception.Message)"
        }
    }
}

$resultData["relaunchAttempted"] = $relaunchAttempted
$resultData["relaunchSucceeded"] = $relaunchSucceeded

# Atomic write of last-result.json
$tempResult = "$lastResultPath.tmp"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$jsonStr = $resultData | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($tempResult, $jsonStr, $utf8NoBom)
Move-Item -Path $tempResult -Destination $lastResultPath -Force

# ============================================================================
# STEP 7: STAGING CLEANUP
# ============================================================================
if ($installRes.success -or ($installRes.rollbackSucceeded -eq $true)) {
    Write-UpdateLog "Cleaning transaction staging: $handoffDir"
    try {
        # Only remove if strictly under temp
        if ($handoffDir.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -Path $handoffDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {}
} else {
    Write-UpdateLog "Rollback failed or recovery required; retaining staging directory for diagnostics."
}

Write-UpdateLog "Update helper execution completed with code: $(if ($installRes.success) { 0 } else { 1 })"
if (-not $installRes.success) {
    exit 1
}
exit 0
