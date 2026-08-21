# SkillSelectionService.ps1 - User Decision & Selection Mediation Layer

. (Join-Path $PSScriptRoot "DependencyResolver.ps1")

function Resolve-NexoraSkillSelection {
    param(
        [Parameter(Mandatory=$true)]
        [array]$RecommendedSkills,
        [string[]]$IncludeSkills = @(),
        [string[]]$ExcludeSkills = @(),
        [Parameter(Mandatory=$false)]
        [array]$AllAvailableSkills = @()
    )

    $selectedIds = [System.Collections.Generic.List[string]]::new()

    # 1. Add recommendations
    foreach ($rec in $RecommendedSkills) {
        $id = if ($rec.SkillId) { $rec.SkillId } else { $rec }
        if (-not $selectedIds.Contains($id)) {
            $selectedIds.Add($id)
        }
    }

    # 2. Add manual inclusions
    foreach ($inc in $IncludeSkills) {
        if (-not $selectedIds.Contains($inc)) {
            $selectedIds.Add($inc)
        }
    }

    # 3. Apply exclusions
    foreach ($exc in $ExcludeSkills) {
        if ($selectedIds.Contains($exc)) {
            $selectedIds.Remove($exc) | Out-Null
        }
    }

    # 4. Resolve dependencies
    $res = Resolve-NexoraSkillDependencies -CandidateSkillIds $selectedIds.ToArray() -AllAvailableSkills $AllAvailableSkills

    return [PSCustomObject]@{
        FinalSelectedIds = $res.ResolvedIds
        IncludedCount    = $res.ResolvedIds.Count
        ExcludedCount    = $ExcludeSkills.Count
        Conflicts        = $res.Conflicts
    }
}
