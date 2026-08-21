# ProjectMemory.ps1 - Complete CRUD interface for .nexora/ project memory layer

function Initialize-NexoraProjectDirectory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $nexoraDir = Join-Path $ProjectRoot ".nexora"
    $logsDir = Join-Path $nexoraDir "logs"
    $backupsDir = Join-Path $nexoraDir "backups"

    foreach ($dir in @($nexoraDir, $logsDir, $backupsDir)) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    return $nexoraDir
}

# --- project.json ---
function Get-NexoraProjectMetadata {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $projectFile = Join-Path $ProjectRoot ".nexora\project.json"

    if (Test-Path $projectFile) {
        try {
            return Get-Content $projectFile -Raw -Encoding UTF8 | ConvertFrom-Json
        }
        catch {}
    }

    return [PSCustomObject]@{
        projectId         = ("proj_" + [guid]::NewGuid().ToString("N").Substring(0, 12))
        projectName       = (Split-Path $ProjectRoot -Leaf)
        projectRoot       = $ProjectRoot
        createdAt         = (Get-Date).ToString("o")
        lastUpdated       = (Get-Date).ToString("o")
        lastScan          = $null
        nexoraCoreVersion = "1.0.0"
        targetPlatforms   = @("antigravity")
    }
}

function Save-NexoraProjectMetadata {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [psobject]$Metadata
    )

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $now = (Get-Date).ToString("o")
    if ($Metadata.PSObject.Properties["lastUpdated"]) {
        $Metadata.lastUpdated = $now
    } else {
        $Metadata | Add-Member -NotePropertyName "lastUpdated" -NotePropertyValue $now -Force
    }

    $json = $Metadata | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path $ProjectRoot ".nexora\project.json") -Value $json -Encoding UTF8
}

# --- analysis.json ---
function Get-NexoraAnalysis {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $analysisFile = Join-Path $ProjectRoot ".nexora\analysis.json"
    if (Test-Path $analysisFile) {
        try {
            return Get-Content $analysisFile -Raw -Encoding UTF8 | ConvertFrom-Json
        }
        catch {}
    }

    return [PSCustomObject]@{
        scannedAt           = $null
        projectType         = "unknown"
        detectedTechnologies = @()
        detectedFrameworks  = @()
        confidenceScores    = @{}
        markersFound        = @()
    }
}

function Save-NexoraAnalysis {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [psobject]$Analysis
    )

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $now = (Get-Date).ToString("o")
    if ($Analysis.PSObject.Properties["scannedAt"]) {
        $Analysis.scannedAt = $now
    } else {
        $Analysis | Add-Member -NotePropertyName "scannedAt" -NotePropertyValue $now -Force
    }

    $json = $Analysis | ConvertTo-Json -Depth 6
    Set-Content -Path (Join-Path $ProjectRoot ".nexora\analysis.json") -Value $json -Encoding UTF8
}

# --- skills.json ---
function Get-NexoraProjectSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $skillsFile = Join-Path $ProjectRoot ".nexora\skills.json"
    if (Test-Path $skillsFile) {
        try {
            return Get-Content $skillsFile -Raw -Encoding UTF8 | ConvertFrom-Json
        }
        catch {}
    }

    return [PSCustomObject]@{
        activeSkills       = @()
        recommendedSkills  = @()
        userSelections     = @()
        lastModified       = (Get-Date).ToString("o")
    }
}

function Save-NexoraProjectSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [psobject]$SkillsData
    )

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $now = (Get-Date).ToString("o")
    if ($SkillsData.PSObject.Properties["lastModified"]) {
        $SkillsData.lastModified = $now
    } else {
        $SkillsData | Add-Member -NotePropertyName "lastModified" -NotePropertyValue $now -Force
    }

    $json = $SkillsData | ConvertTo-Json -Depth 6
    Set-Content -Path (Join-Path $ProjectRoot ".nexora\skills.json") -Value $json -Encoding UTF8
}

# --- history.json ---
function Get-NexoraProjectHistory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $historyFile = Join-Path $ProjectRoot ".nexora\history.json"
    if (Test-Path $historyFile) {
        try {
            $parsed = Get-Content $historyFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($parsed.events) { return ,@($parsed.events) }
        }
        catch {}
    }
    return ,@()
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

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $historyFile = Join-Path $ProjectRoot ".nexora\history.json"
    $existing = Get-NexoraProjectHistory -ProjectRoot $ProjectRoot

    $historyList = [System.Collections.Generic.List[psobject]]::new()
    foreach ($item in $existing) {
        $historyList.Add($item)
    }

    $newEvent = [PSCustomObject]@{
        eventId     = ("evt_" + [guid]::NewGuid().ToString("N").Substring(0, 8))
        timestamp   = (Get-Date).ToString("o")
        action      = $Action
        details     = $Details
        triggeredBy = "nexora_cli"
    }

    $historyList.Add($newEvent)
    $result = @{ events = $historyList.ToArray() } | ConvertTo-Json -Depth 6
    Set-Content -Path $historyFile -Value $result -Encoding UTF8
}

# --- Snapshots & Rollbacks ---
function Create-NexoraSnapshot {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [string]$Reason = "manual_snapshot"
    )

    Initialize-NexoraProjectDirectory -ProjectRoot $ProjectRoot | Out-Null
    $snapshotId = "snap_" + (Get-Date).ToString("yyyyMMdd_HHmmss")
    $backupDir = Join-Path $ProjectRoot ".nexora\backups\$snapshotId"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # Backup .agents/skills if exists
    $agentsSkills = Join-Path $ProjectRoot ".agents\skills"
    if (Test-Path $agentsSkills) {
        Copy-Item -Path $agentsSkills -Destination (Join-Path $backupDir "agents_skills") -Recurse -Force | Out-Null
    }

    # Backup current state files
    $memoryFiles = @("project.json", "analysis.json", "skills.json")
    foreach ($f in $memoryFiles) {
        $src = Join-Path $ProjectRoot ".nexora\$f"
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $backupDir $f) -Force | Out-Null
        }
    }

    $manifest = @{
        snapshotId = $snapshotId
        createdAt  = (Get-Date).ToString("o")
        reason     = $Reason
    } | ConvertTo-Json

    Set-Content -Path (Join-Path $backupDir "manifest.json") -Value $manifest -Encoding UTF8
    Add-NexoraProjectHistory -ProjectRoot $ProjectRoot -Action "SNAPSHOT_CREATED" -Details @{ snapshotId = $snapshotId; reason = $Reason }

    return $snapshotId
}

function Restore-NexoraSnapshot {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [string]$SnapshotId = $null
    )

    $backupsBase = Join-Path $ProjectRoot ".nexora\backups"
    if (-not (Test-Path $backupsBase)) {
        return @{ success = $false; message = "No backups directory found" }
    }

    $targetBackup = $null
    if ($SnapshotId) {
        $cand = Join-Path $backupsBase $SnapshotId
        if (Test-Path $cand) { $targetBackup = $cand }
    }
    else {
        # Pick latest snapshot
        $allSnaps = Get-ChildItem $backupsBase -Directory | Sort-Object CreationTime -Descending
        if ($allSnaps.Count -gt 0) {
            $targetBackup = $allSnaps[0].FullName
        }
    }

    if (-not $targetBackup) {
        return @{ success = $false; message = "No valid snapshot found to restore" }
    }

    $backupName = Split-Path $targetBackup -Leaf

    # Restore .agents/skills
    $backedSkills = Join-Path $targetBackup "agents_skills"
    $agentsSkills = Join-Path $ProjectRoot ".agents\skills"
    if (Test-Path $backedSkills) {
        if (Test-Path $agentsSkills) {
            Remove-Item -Path $agentsSkills -Recurse -Force -ErrorAction SilentlyContinue
        }
        Copy-Item -Path $backedSkills -Destination $agentsSkills -Recurse -Force | Out-Null
    }

    # Restore memory files
    $memoryFiles = @("project.json", "analysis.json", "skills.json")
    foreach ($f in $memoryFiles) {
        $src = Join-Path $targetBackup $f
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $ProjectRoot ".nexora\$f") -Force | Out-Null
        }
    }

    Add-NexoraProjectHistory -ProjectRoot $ProjectRoot -Action "SNAPSHOT_RESTORED" -Details @{ snapshotId = $backupName }
    return @{ success = $true; snapshotId = $backupName; message = "Restored snapshot $backupName successfully" }
}
