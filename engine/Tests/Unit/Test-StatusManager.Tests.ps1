# Test-StatusManager.Tests.ps1 - Unit tests for application status management

$ErrorActionPreference = "Stop"
$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

. (Join-Path $EngineRoot "Application\StatusManager.ps1")

$total = 0
$passed = 0

function Assert-Equal($actual, $expected, $testName) {
    $script:total++
    if ($actual -eq $expected) {
        $script:passed++
        Write-Host "  [PASS] $testName" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] $testName (Expected: '$expected', Got: '$actual')" -ForegroundColor Red
    }
}

Write-Host "Running StatusManager Unit Tests..." -ForegroundColor Cyan

Reset-NexoraSystemStatus

# 1. Default Initial State
$status = Get-NexoraSystemStatus
Assert-Equal $status.engineStatus "ready" "Initial engineStatus is ready"
Assert-Equal $status.operationState "idle" "Initial operationState is idle"

# 2. Engine Status Update & Error Capture
Set-NexoraEngineStatus -Status "error" -Error "Test engine error"
$statusErr = Get-NexoraSystemStatus
Assert-Equal $statusErr.engineStatus "error" "Updates engineStatus to error"
Assert-Equal $statusErr.lastError "Test engine error" "Captures error message"

# 3. Scanning and Analyzing States
Set-NexoraEngineStatus -Status "scanning"
Assert-Equal (Get-NexoraSystemStatus).engineStatus "scanning" "Tracks scanning state"
Set-NexoraEngineStatus -Status "analyzing"
Assert-Equal (Get-NexoraSystemStatus).engineStatus "analyzing" "Tracks analyzing state"

# 4. Project Context
Set-NexoraCurrentProject -ProjectId "proj_123" -ProjectName "Academic Day Hub" -ActiveSkillsCount 12
$statusProj = Get-NexoraSystemStatus
Assert-Equal $statusProj.currentProjectId "proj_123" "Tracks currentProjectId"
Assert-Equal $statusProj.currentProjectName "Academic Day Hub" "Tracks currentProjectName"
Assert-Equal $statusProj.activeSkillsCount 12 "Tracks activeSkillsCount"

# 5. Operation State
Set-NexoraOperationState -State "running" -OperationName "skill_activation"
Assert-Equal (Get-NexoraSystemStatus).operationState "running" "Tracks running operationState"
Assert-Equal (Get-NexoraSystemStatus).lastOperation "skill_activation" "Tracks lastOperation name"

Set-NexoraOperationState -State "completed" -OperationName "skill_activation"
Assert-Equal (Get-NexoraSystemStatus).operationState "completed" "Tracks completed operationState"

# 6. Update Status
Set-NexoraUpdateStatus -Status "available"
Assert-Equal (Get-NexoraSystemStatus).updateStatus "available" "Tracks updateStatus available"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
