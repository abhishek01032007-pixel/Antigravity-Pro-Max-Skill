# PlatformAdapter.ps1 - Master Platform Deployment Orchestrator

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
