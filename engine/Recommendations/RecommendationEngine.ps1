# RecommendationEngine.ps1 - Minimal-overhead intelligent skill matcher & conflict resolver

function Get-NexoraSkillRecommendations {
    param(
        [Parameter(Mandatory=$true)]
        [psobject]$Analysis,
        [Parameter(Mandatory=$true)]
        [array]$AvailableSkills
    )

    $recommended = [System.Collections.Generic.List[psobject]]::new()
    $techs = @($Analysis.detectedTechnologies | ForEach-Object { $_.ToLower() })
    $frameworks = @($Analysis.detectedFrameworks | ForEach-Object { $_.ToLower() })

    $isFlutter = $frameworks -contains "flutter" -or $techs -contains "dart"
    $isReact = $frameworks -contains "react" -or $frameworks -contains "next.js"
    $isPython = $techs -contains "python" -or $frameworks -contains "fastapi" -or $frameworks -contains "django"
    $isNode = $techs -contains "node.js" -or $frameworks -contains "express" -or $frameworks -contains "nestjs"

    foreach ($skill in $AvailableSkills) {
        $skillId = $skill.Id.ToLower()
        $pack = $skill.Pack.ToLower()
        $score = 0
        $reason = ""

        # 1. Tech-specific matching
        if ($isFlutter) {
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*" -or $skillId -eq "mobile-developer") {
                $score += 40
                $reason = "Matches Flutter/Dart mobile tech stack"
            }
            # Exclude conflicting web/python frameworks
            if ($pack -like "*python*" -or $pack -like "*nodejs*" -or $skillId -like "*react*" -or $skillId -like "*fastapi*") {
                continue
            }
        }
        elseif ($isReact) {
            if ($skillId -like "*frontend*" -or $skillId -like "*ui_ux*" -or $skillId -like "*web_performance*" -or $skillId -eq "enhance_ui") {
                $score += 40
                $reason = "Matches React/Web frontend tech stack"
            }
            # Exclude flutter/dart
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*") {
                continue
            }
        }
        elseif ($isPython) {
            if ($pack -like "*python*" -or $skillId -like "*python*" -or $skillId -like "*fastapi*") {
                $score += 40
                $reason = "Matches Python backend tech stack"
            }
            # Exclude frontend mobile/web specifics
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*" -or $skillId -like "*react*") {
                continue
            }
        }

        # 2. General High-Value Architectural & QA Skills
        if ($skillId -in @("debug_issue", "code_review", "architect-review", "api-design-principles", "error-handling-patterns")) {
            $score += 20
            if (-not $reason) { $reason = "Universal software quality & debugging standard" }
        }

        # 3. Backend general patterns
        if ($skillId -in @("architecture-patterns", "backend-architect", "backend-security-coder", "security_audit")) {
            if ($isPython -or $isNode -or $techs -contains "supabase") {
                $score += 25
                if (-not $reason) { $reason = "Backend architecture and security reinforcement" }
            }
        }

        if ($score -ge 30) {
            $recommended.Add([PSCustomObject]@{
                SkillId    = $skill.Id
                Pack       = $skill.Pack
                Score      = $score
                MatchReason = $reason
            })
        }
    }

    # Sort by score descending and return top matches (minimal overhead, max 15 skills)
    $sorted = $recommended | Sort-Object Score -Descending | Select-Object -First 15
    return @($sorted)
}
