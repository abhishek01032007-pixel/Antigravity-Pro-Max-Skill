# LockService.ps1 - Process-level locking for atomic workspace mutations

function Acquire-NexoraLock {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [int]$TimeoutSeconds = 5
    )

    $nexoraDir = Join-Path $ProjectRoot ".nexora"
    if (-not (Test-Path $nexoraDir)) {
        New-Item -ItemType Directory -Path $nexoraDir -Force | Out-Null
    }

    $lockFile = Join-Path $nexoraDir ".lock"
    $startTime = [DateTime]::UtcNow

    while (Test-Path $lockFile) {
        # Check for stale lock (older than 60 seconds)
        try {
            $lockInfo = Get-Content $lockFile -Raw | ConvertFrom-Json
            $lockAge = (Get-Date) - [DateTime]$lockInfo.timestamp
            if ($lockAge.TotalSeconds -gt 60) {
                Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
                break
            }
        }
        catch {
            Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
            break
        }

        if (([DateTime]::UtcNow - $startTime).TotalSeconds -ge $TimeoutSeconds) {
            return $false
        }
        Start-Sleep -Milliseconds 200
    }

    $lockData = @{
        pid       = $PID
        timestamp = (Get-Date).ToString("o")
        user      = $env:USERNAME
    } | ConvertTo-Json

    try {
        Set-Content -Path $lockFile -Value $lockData -Encoding UTF8
        return $true
    }
    catch {
        return $false
    }
}

function Release-NexoraLock {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $lockFile = Join-Path $ProjectRoot ".nexora\.lock"
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    }
}
