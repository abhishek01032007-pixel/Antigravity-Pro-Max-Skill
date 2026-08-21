# SkillActivationService.ps1 - Atomic Multi-Platform Skill Activation Service

function Activate-NexoraSkills {
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
    $snapId = Create-NexoraSnapshot -ProjectRoot $resolvedRoot -Reason "pre_skill_activation"

    # 2. Lookup skill objects
    if ($AvailableSkills.Count -eq 0) {
        $AvailableSkills = Get-NexoraGlobalRegistry
    }

    $skillsToDeploy = [System.Collections.Generic.List[psobject]]::new()
    foreach ($id in $SkillIds) {
        $found = $AvailableSkills | Where-Object { $_.Id.ToLower() -eq $id.ToLower() } | Select-Object -First 1
        if ($found) {
            $skillsToDeploy.Add($found)
        }
    }

    if ($skillsToDeploy.Count -eq 0) {
        return [PSCustomObject]@{
            Success       = $false
            Message       = "No valid matching skills found to activate."
            ActivatedCount= 0
        }
    }

    # 3. Deploy to Platforms
    $deployResults = Deploy-NexoraSkillsToPlatforms -ProjectRoot $resolvedRoot -SkillObjects $skillsToDeploy.ToArray() -Platforms $Platforms

    # 4. Update Project Skill Registry (.nexora/skills.json)
    $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolvedRoot
    $currentActive = [System.Collections.Generic.List[string]]::new()
    if ($skillsData.activeSkills) {
        foreach ($item in $skillsData.activeSkills) {
            $currentActive.Add($item)
        }
    }

    foreach ($s in $skillsToDeploy) {
        if (-not $currentActive.Contains($s.Id)) {
            $currentActive.Add($s.Id)
        }
    }

    $skillsData.activeSkills = $currentActive.ToArray()
    Save-NexoraProjectSkills -ProjectRoot $resolvedRoot -SkillsData $skillsData

    # 5. Log History Event
    Add-NexoraProjectHistory -ProjectRoot $resolvedRoot -Action "SKILLS_ACTIVATED" -Details @{
        skillCount = $skillsToDeploy.Count
        skills     = @($skillsToDeploy | ForEach-Object { $_.Id })
        platforms  = $Platforms
        snapshotId = $snapId
    }

    return [PSCustomObject]@{
        Success        = $true
        ActivatedCount = $skillsToDeploy.Count
        ActivatedSkills= @($skillsToDeploy | ForEach-Object { $_.Id })
        SnapshotId     = $snapId
        DeployResults  = $deployResults
    }
}
