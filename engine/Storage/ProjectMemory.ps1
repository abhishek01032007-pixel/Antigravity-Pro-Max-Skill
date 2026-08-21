# ProjectMemory.ps1 - CRUD interface for .nexora/ project memory

function Get-NexoraProjectMemory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $nexoraDir = Join-Path $ProjectRoot ".nexora"
    $projectFile = Join-Path $nexoraDir "project.json"

    if (Test-Path $projectFile) {
        try {
            return Get-Content $projectFile -Raw | ConvertFrom-Json
        }
        catch {}
    }

    return [PSCustomObject]@{
        projectId          = ("proj_" + [guid]::NewGuid().ToString("N").Substring(0, 12))
        projectName        = (Split-Path $ProjectRoot -Leaf)
        projectRoot        = $ProjectRoot
        createdAt          = (Get-Date).ToString("o")
        lastUpdated        = (Get-Date).ToString("o")
        nexoraCoreVersion  = "1.0.0"
        targetPlatforms    = @("antigravity")
    }
}

function Save-NexoraProjectMemory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [psobject]$MemoryData
    )

    $nexoraDir = Join-Path $ProjectRoot ".nexora"
    if (-not (Test-Path $nexoraDir)) {
        New-Item -ItemType Directory -Path $nexoraDir -Force | Out-Null
    }

    $MemoryData.lastUpdated = (Get-Date).ToString("o")
    $json = $MemoryData | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path $nexoraDir "project.json") -Value $json -Encoding UTF8
}

function Add-NexoraProjectHistory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string]$Action,
        [Parameter(Mandatory=$false)]
        [psobject]$Details = $null
    )

    $nexoraDir = Join-Path $ProjectRoot ".nexora"
    if (-not (Test-Path $nexoraDir)) {
        New-Item -ItemType Directory -Path $nexoraDir -Force | Out-Null
    }

    $historyFile = Join-Path $nexoraDir "history.json"
    $history = @()

    if (Test-Path $historyFile) {
        try {
            $parsed = Get-Content $historyFile -Raw | ConvertFrom-Json
            if ($parsed.events) { $history = [array]$parsed.events }
        }
        catch {}
    }

    $newEvent = @{
        eventId     = ("evt_" + [guid]::NewGuid().ToString("N").Substring(0, 8))
        timestamp   = (Get-Date).ToString("o")
        action      = $Action
        details     = $Details
        triggeredBy = "nexora_cli"
    }

    $history += $newEvent
    $result = @{ events = $history } | ConvertTo-Json -Depth 5
    Set-Content -Path $historyFile -Value $result -Encoding UTF8
}
