# StatusManager.ps1 - Centralized Real-Time Application State Management

# Script-scoped in-memory state tracking
$Script:NexoraState = @{
    EngineStatus      = "idle"     # idle, starting, ready, scanning, analyzing, recommending, activating, deactivating, updating, repairing, error
    CurrentProjectId  = $null
    CurrentProjectName= $null
    OperationState    = "idle"     # idle, running, completed, failed
    LastOperation     = $null
    ActiveSkillsCount = 0
    UpdateStatus      = "unknown"  # up_to_date, available, offline, checking, unknown
    LastError         = $null
    LastActivity      = (Get-Date).ToString("o")
    InitializedAt     = (Get-Date).ToString("o")
}

function Set-NexoraEngineStatus {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("idle", "starting", "ready", "scanning", "analyzing", "recommending", "activating", "deactivating", "updating", "repairing", "error")]
        [string]$Status,
        [string]$Error = $null
    )

    $Script:NexoraState.EngineStatus = $Status
    $Script:NexoraState.LastActivity = (Get-Date).ToString("o")
    if ($Error) {
        $Script:NexoraState.LastError = $Error
    }
}

function Set-NexoraCurrentProject {
    param(
        [string]$ProjectId = $null,
        [string]$ProjectName = $null,
        [int]$ActiveSkillsCount = 0
    )

    $Script:NexoraState.CurrentProjectId = $ProjectId
    $Script:NexoraState.CurrentProjectName = $ProjectName
    $Script:NexoraState.ActiveSkillsCount = $ActiveSkillsCount
    $Script:NexoraState.LastActivity = (Get-Date).ToString("o")
}

function Set-NexoraOperationState {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("idle", "running", "completed", "failed")]
        [string]$State,
        [string]$OperationName = $null,
        [string]$Error = $null
    )

    $Script:NexoraState.OperationState = $State
    if ($OperationName) {
        $Script:NexoraState.LastOperation = $OperationName
    }
    if ($Error) {
        $Script:NexoraState.LastError = $Error
    }
    $Script:NexoraState.LastActivity = (Get-Date).ToString("o")
}

function Set-NexoraUpdateStatus {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("up_to_date", "available", "offline", "checking", "unknown")]
        [string]$Status
    )

    $Script:NexoraState.UpdateStatus = $Status
    $Script:NexoraState.LastActivity = (Get-Date).ToString("o")
}

function Get-NexoraSystemStatus {
    return [PSCustomObject]@{
        engineStatus       = $Script:NexoraState.EngineStatus
        currentProjectId   = $Script:NexoraState.CurrentProjectId
        currentProjectName = $Script:NexoraState.CurrentProjectName
        operationState     = $Script:NexoraState.OperationState
        lastOperation      = $Script:NexoraState.LastOperation
        activeSkillsCount  = $Script:NexoraState.ActiveSkillsCount
        updateStatus       = $Script:NexoraState.UpdateStatus
        lastError          = $Script:NexoraState.LastError
        lastActivity       = $Script:NexoraState.LastActivity
        initializedAt      = $Script:NexoraState.InitializedAt
    }
}

function Reset-NexoraSystemStatus {
    $Script:NexoraState.EngineStatus = "ready"
    $Script:NexoraState.CurrentProjectId = $null
    $Script:NexoraState.CurrentProjectName = $null
    $Script:NexoraState.OperationState = "idle"
    $Script:NexoraState.LastOperation = $null
    $Script:NexoraState.ActiveSkillsCount = 0
    $Script:NexoraState.UpdateStatus = "unknown"
    $Script:NexoraState.LastError = $null
    $Script:NexoraState.LastActivity = (Get-Date).ToString("o")
}
