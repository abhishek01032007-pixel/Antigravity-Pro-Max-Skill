# SkillUpdateManager.ps1 - Skill Version Checking, Integrity Verification & Refresh Engine

function Get-NexoraSkillChecksum {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillDirectory
    )

    $skillMd = Join-Path $SkillDirectory "SKILL.md"
    if (-not (Test-Path $skillMd)) { return $null }

    try {
        $stream = [System.IO.File]::OpenRead($skillMd)
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $hashBytes = $sha.ComputeHash($stream)
        $stream.Close()
        return [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()
    }
    catch {
        return $null
    }
}

function Check-NexoraSkillUpdates {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$false)]
        [array]$AvailableSkills = @()
    )

    $resolvedRoot = Resolve-NexoraPath $ProjectRoot
    $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolvedRoot

    if ($AvailableSkills.Count -eq 0) {
        $AvailableSkills = Get-NexoraGlobalRegistry
    }

    $activeSkills = if ($skillsData.activeSkills) { [array]$skillsData.activeSkills } else { @() }
    $updatesAvailable = [System.Collections.Generic.List[psobject]]::new()

    foreach ($skillId in $activeSkills) {
        $globalMatch = $AvailableSkills | Where-Object { $_.Id.ToLower() -eq $skillId.ToLower() } | Select-Object -First 1
        if ($globalMatch) {
            $localSkillPath = Join-Path $resolvedRoot ".agents\skills\$skillId"
            if (Test-Path $localSkillPath) {
                $localHash = Get-NexoraSkillChecksum -SkillDirectory $localSkillPath
                $globalHash = Get-NexoraSkillChecksum -SkillDirectory $globalMatch.Path

                if ($localHash -and $globalHash -and $localHash -ne $globalHash) {
                    $updatesAvailable.Add([PSCustomObject]@{
                        SkillId        = $skillId
                        CurrentVersion = "1.0.0"
                        LatestVersion  = $globalMatch.Version
                        HasDifference  = $true
                    })
                }
            }
        }
    }

    return [PSCustomObject]@{
        TotalActiveChecked = $activeSkills.Count
        UpdatesAvailable   = $updatesAvailable.ToArray()
    }
}
