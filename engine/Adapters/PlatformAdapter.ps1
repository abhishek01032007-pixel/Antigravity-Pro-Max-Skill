# PlatformAdapter.ps1 - Master Platform Deployment & Undeployment Orchestrator

. (Join-Path $PSScriptRoot "AntigravityAdapter.ps1")
. (Join-Path $PSScriptRoot "CursorAdapter.ps1")
. (Join-Path $PSScriptRoot "CopilotAdapter.ps1")

function Deploy-NexoraSkillsToPlatforms {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [array]$SkillObjects,
        [string[]]$Platforms = @("antigravity")
    )

    $results = [System.Collections.Generic.List[psobject]]::new()

    foreach ($p in $Platforms) {
        switch ($p.ToLower()) {
            "antigravity" {
                $res = Deploy-AntigravitySkills -ProjectRoot $ProjectRoot -SkillObjects $SkillObjects
                $results.Add($res)
            }
            "cursor" {
                $res = Deploy-CursorSkills -ProjectRoot $ProjectRoot -SkillObjects $SkillObjects
                $results.Add($res)
            }
            "copilot" {
                $res = Deploy-CopilotSkills -ProjectRoot $ProjectRoot -SkillObjects $SkillObjects
                $results.Add($res)
            }
        }
    }

    return $results.ToArray()
}

function Undeploy-NexoraSkillsFromPlatforms {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds,
        [Parameter(Mandatory=$false)]
        [array]$RemainingSkillObjects = @(),
        [string[]]$Platforms = @("antigravity")
    )

    $results = [System.Collections.Generic.List[psobject]]::new()

    foreach ($p in $Platforms) {
        switch ($p.ToLower()) {
            "antigravity" {
                $res = Undeploy-AntigravitySkills -ProjectRoot $ProjectRoot -SkillIds $SkillIds
                $results.Add($res)
            }
            "cursor" {
                $res = Undeploy-CursorSkills -ProjectRoot $ProjectRoot -SkillIds $SkillIds
                $results.Add($res)
            }
            "copilot" {
                $res = Undeploy-CopilotSkills -ProjectRoot $ProjectRoot -SkillIds $SkillIds -RemainingSkillObjects $RemainingSkillObjects
                $results.Add($res)
            }
        }
    }

    return $results.ToArray()
}
