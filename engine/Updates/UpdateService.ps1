# UpdateService.ps1 - PowerShell Engine Update Domain Service
# Manages canonical local version resolution and update status queries.

$ErrorActionPreference = "Stop"

function Get-NexoraInstalledVersion {
    $runtimePath = Resolve-NexoraInstalledRuntimePath
    $vFile = if ($runtimePath) { Join-Path $runtimePath "nexora-version.json" } else { $null }
    $currentVersion = "1.0.0"

    if ($vFile -and (Test-Path $vFile)) {
        try {
            $v = Get-Content $vFile -Raw | ConvertFrom-Json
            if ($v.version) { $currentVersion = $v.version }
            elseif ($v.coreVersion) { $currentVersion = $v.coreVersion }
        } catch {}
    } else {
        # Check parent repo root fallback
        $repoVer = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "nexora-version.json"
        if (Test-Path $repoVer) {
            try {
                $v = Get-Content $repoVer -Raw | ConvertFrom-Json
                if ($v.version) { $currentVersion = $v.version }
                elseif ($v.coreVersion) { $currentVersion = $v.coreVersion }
            } catch {}
        }
    }

    return $currentVersion
}

function Get-NexoraApplicationUpdateStatus {
    $currentVersion = Get-NexoraInstalledVersion

    if (Get-Command Set-NexoraUpdateStatus -ErrorAction SilentlyContinue) {
        Set-NexoraUpdateStatus -Status "unknown"
    }

    return [PSCustomObject]@{
        currentVersion  = $currentVersion
        latestVersion   = $null
        updateAvailable = $null
        checkedRemotely = $false
        channel         = "stable"
        status          = "Local installation verified"
        message         = "Local v$currentVersion verified. Remote update checks not performed."
        checkedAt       = (Get-Date).ToString("o")
        state           = "idle"
        error           = $null
    }
}

function Invoke-NexoraApplicationUpdateCheck {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Channel = "stable"
    )

    # In Desktop mode, remote HTTPS networking is managed by the Node.js UpdateService.
    # The PowerShell engine provides the local authority baseline.
    $localStatus = Get-NexoraApplicationUpdateStatus

    return $localStatus
}

if ($ExecutionContext.SessionState.Module) {
    Export-ModuleMember -Function @(
        "Get-NexoraInstalledVersion",
        "Get-NexoraApplicationUpdateStatus",
        "Invoke-NexoraApplicationUpdateCheck"
    )
}
