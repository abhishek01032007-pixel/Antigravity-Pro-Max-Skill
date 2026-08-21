# SkillLifecycleManager.ps1 - Master Lifecycle Coordinator

. (Join-Path $PSScriptRoot "SkillSelectionService.ps1")
. (Join-Path $PSScriptRoot "SkillActivationService.ps1")
. (Join-Path $PSScriptRoot "SkillRemovalService.ps1")
. (Join-Path $PSScriptRoot "SkillUpdateManager.ps1")

function Invoke-NexoraSkillActivationWorkflow {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds,
        [string[]]$Platforms = @("antigravity")
    )

    $registry = Get-NexoraGlobalRegistry
    $selection = Resolve-NexoraSkillSelection -RecommendedSkills $SkillIds -AllAvailableSkills $registry
    $result = Activate-NexoraSkills -ProjectRoot $ProjectRoot -SkillIds $selection.FinalSelectedIds -Platforms $Platforms -AvailableSkills $registry

    return $result
}

function Invoke-NexoraSkillDeactivationWorkflow {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds,
        [string[]]$Platforms = @("antigravity")
    )

    $registry = Get-NexoraGlobalRegistry
    $result = Deactivate-NexoraSkills -ProjectRoot $ProjectRoot -SkillIds $SkillIds -Platforms $Platforms -AvailableSkills $registry

    return $result
}
