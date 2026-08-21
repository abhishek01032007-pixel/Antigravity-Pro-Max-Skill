# DependencyResolver.ps1 - Validates skill prerequisites and mutual conflicts

function Resolve-NexoraSkillDependencies {
    param(
        [Parameter(Mandatory=$true)]
        [array]$CandidateSkillIds,
        [Parameter(Mandatory=$false)]
        [array]$AllAvailableSkills = @()
    )

    $resolvedList = [System.Collections.Generic.List[string]]::new()
    $conflicts = [System.Collections.Generic.List[psobject]]::new()

    foreach ($id in $CandidateSkillIds) {
        if (-not $resolvedList.Contains($id)) {
            $resolvedList.Add($id)
        }
    }

    # Conflict Check (e.g. mutually exclusive backend or frontend frameworks)
    $hasFlutter = $resolvedList | Where-Object { $_ -like "*flutter*" -or $_ -like "*dart*" }
    $hasReact = $resolvedList | Where-Object { $_ -like "*react*" }
    $hasFastApi = $resolvedList | Where-Object { $_ -like "*fastapi*" }

    if ($hasFlutter -and $hasReact) {
        $conflicts.Add([PSCustomObject]@{
            Severity = "Warning"
            Message  = "Mixed mobile (Flutter) and web (React) skills selected simultaneously."
        })
    }

    return [PSCustomObject]@{
        Valid       = ($conflicts.Count -eq 0)
        ResolvedIds = $resolvedList.ToArray()
        Conflicts   = $conflicts.ToArray()
    }
}
