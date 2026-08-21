# SkillRemovalService.ps1 - Safe Skill Deactivation & Platform Pruning Service

function Deactivate-NexoraSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds,
        [string[]]$Platforms = @("antigravity"),
        [Parameter(Mandatory=$false)]
        [array]$AvailableSkills = @()
    )

    $resolvedRoot = Resolve-NexoraPath $ProjectRoot
    Initialize-NexoraProjectDirectory -ProjectRoot $resolvedRoot | Out-Null

    # 1. Create Safety Snapshot
    $snapId = Create-NexoraSnapshot -ProjectRoot $resolvedRoot -Reason "pre_skill_deactivation"

    if ($AvailableSkills.Count -eq 0) {
        $AvailableSkills = Get-NexoraGlobalRegistry
    }

    # 2. Get current active skills
    $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolvedRoot
    $currentActive = [System.Collections.Generic.List[string]]::new()
    if ($skillsData.activeSkills) {
        foreach ($item in $skillsData.activeSkills) {
            $currentActive.Add($item)
        }
    }

    $removedList = [System.Collections.Generic.List[string]]::new()
    foreach ($id in $SkillIds) {
        $normalizedId = $id.ToLower()
        $match = $currentActive | Where-Object { $_.ToLower() -eq $normalizedId } | Select-Object -First 1
        if ($match) {
            $currentActive.Remove($match) | Out-Null
            $removedList.Add($match)
        }
    }

    if ($removedList.Count -eq 0) {
        return [PSCustomObject]@{
            Success       = $true
            Message       = "None of the specified skills were currently active in this project."
            DeactivatedCount = 0
        }
    }

    # 3. Lookup remaining skill objects for re-compilation (e.g. Copilot)
    $remainingObjects = @($AvailableSkills | Where-Object { $currentActive -contains $_.Id })

    # 4. Undeploy from platforms
    $undeployResults = Undeploy-NexoraSkillsFromPlatforms -ProjectRoot $resolvedRoot -SkillIds $removedList.ToArray() -RemainingSkillObjects $remainingObjects -Platforms $Platforms

    # 5. Update Project Skill Registry (.nexora/skills.json)
    $skillsData.activeSkills = $currentActive.ToArray()

    $deactivatedList = [System.Collections.Generic.List[psobject]]::new()
    if ($skillsData.PSObject.Properties["deactivatedSkills"] -and $skillsData.deactivatedSkills) {
        foreach ($item in $skillsData.deactivatedSkills) {
            $deactivatedList.Add($item)
        }
    }

    foreach ($rem in $removedList) {
        $deactivatedList.Add([PSCustomObject]@{
            id            = $rem
            deactivatedAt = (Get-Date).ToString("o")
            reason        = "user_deactivation"
        })
    }

    if ($skillsData.PSObject.Properties["deactivatedSkills"]) {
        $skillsData.deactivatedSkills = $deactivatedList.ToArray()
    } else {
        $skillsData | Add-Member -NotePropertyName "deactivatedSkills" -NotePropertyValue ($deactivatedList.ToArray()) -Force
    }

    Save-NexoraProjectSkills -ProjectRoot $resolvedRoot -SkillsData $skillsData

    # 6. Log History Event
    Add-NexoraProjectHistory -ProjectRoot $resolvedRoot -Action "SKILLS_DEACTIVATED" -Details @{
        skillCount = $removedList.Count
        skills     = $removedList.ToArray()
        platforms  = $Platforms
        snapshotId = $snapId
    }

    return [PSCustomObject]@{
        Success          = $true
        DeactivatedCount = $removedList.Count
        DeactivatedSkills= $removedList.ToArray()
        SnapshotId       = $snapId
        UndeployResults  = $undeployResults
    }
}
