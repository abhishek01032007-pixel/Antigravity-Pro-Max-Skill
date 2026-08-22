# RecommendationEngine.ps1 - Intelligent skill matcher with classification-aware scoring & human-readable reasons

function Get-NexoraSkillRecommendations {
    param(
        [Parameter(Mandatory=$true)]
        [psobject]$Analysis,
        [Parameter(Mandatory=$true)]
        [array]$AvailableSkills,
        [Parameter(Mandatory=$false)]
        [string]$WorkingMode = $null,
        [Parameter(Mandatory=$false)]
        [string]$Target = $null
    )

    $recommended = [System.Collections.Generic.List[psobject]]::new()

    # Normalize detected values for matching
    $techs = @($Analysis.detectedTechnologies | ForEach-Object { $_.ToLower() })
    $frameworks = @($Analysis.detectedFrameworks | ForEach-Object { $_.ToLower() })
    $languages = @()
    $frontendStack = @()
    $backendStack = @()
    $dbStack = @()
    $qaStack = @()

    if ($Analysis.PSObject.Properties["languages"] -and $Analysis.languages) {
        $languages = @($Analysis.languages | ForEach-Object { $_.ToLower() })
    }
    if ($Analysis.PSObject.Properties["frontend"] -and $Analysis.frontend) {
        $frontendStack = @($Analysis.frontend | ForEach-Object { $_.ToLower() })
    }
    if ($Analysis.PSObject.Properties["backend"] -and $Analysis.backend) {
        $backendStack = @($Analysis.backend | ForEach-Object { $_.ToLower() })
    }
    if ($Analysis.PSObject.Properties["database"] -and $Analysis.database) {
        $dbStack = @($Analysis.database | ForEach-Object { $_.ToLower() })
    }
    if ($Analysis.PSObject.Properties["qa"] -and $Analysis.qa) {
        $qaStack = @($Analysis.qa | ForEach-Object { $_.ToLower() })
    }

    # Classification context
    $projectType = if ($Analysis.PSObject.Properties["projectType"]) { $Analysis.projectType } else { "unknown" }
    $devMode = if ($Analysis.PSObject.Properties["developmentMode"]) { $Analysis.developmentMode } else { "mixed" }

    # Derived flags
    $isFlutter = $frameworks -contains "flutter" -or $techs -contains "dart" -or $frontendStack -contains "flutter"
    $isReact = $frameworks -contains "react" -or $frameworks -contains "next.js" -or $frontendStack -contains "react" -or $frontendStack -contains "next.js"
    $isPython = $techs -contains "python" -or $frameworks -contains "fastapi" -or $frameworks -contains "django" -or $frameworks -contains "flask"
    $isNode = $techs -contains "node.js" -or $frameworks -contains "express" -or $frameworks -contains "nestjs"
    $isMobile = $projectType -eq "mobile_application"
    $isFullStack = $projectType -eq "full_stack_application" -or $devMode -eq "full_stack"
    $hasBackend = $backendStack.Count -gt 0 -or $isPython -or $isNode
    $hasDatabase = $dbStack.Count -gt 0 -or $techs -contains "supabase" -or $techs -contains "firebase"
    $hasQA = $qaStack.Count -gt 0

    # Contextual Working Mode & Target (GAP 1)
    $normMode = if ($WorkingMode) { $WorkingMode.ToLower().Trim() } else { $null }
    $normTarget = if ($Target) { $Target.ToLower().Trim() } else { $null }

    foreach ($skill in $AvailableSkills) {
        $skillId = $skill.Id.ToLower()
        $pack = $skill.Pack.ToLower()
        $category = if ($skill.PSObject.Properties["Category"]) { $skill.Category } else { "" }
        $score = 0
        $reasons = [System.Collections.Generic.List[string]]::new()

        # =====================
        # 1. Flutter / Dart Match
        # =====================
        if ($isFlutter) {
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*" -or $skillId -eq "mobile-developer") {
                $score += 40
                $reasons.Add("Flutter/Dart mobile project detected")
            }
            if ($pack -like "*python*" -or $pack -like "*nodejs*" -or $skillId -like "*react*" -or $skillId -like "*fastapi*") {
                continue
            }
        }
        # =====================
        # 2. React / Web Match
        # =====================
        elseif ($isReact) {
            if ($skillId -like "*frontend*" -or $skillId -like "*ui_ux*" -or $skillId -like "*web_performance*" -or $skillId -eq "enhance_ui") {
                $score += 40
                $reasons.Add("React/Web frontend project detected")
            }
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*") {
                continue
            }
        }
        # =====================
        # 3. Python Backend Match
        # =====================
        elseif ($isPython) {
            if ($pack -like "*python*" -or $skillId -like "*python*" -or $skillId -like "*fastapi*") {
                $score += 40
                $reasons.Add("Python backend project detected")
            }
            if ($skillId -like "*flutter*" -or $skillId -like "*dart*" -or $skillId -like "*react*") {
                continue
            }
        }

        # =====================
        # 4. Universal Quality Skills
        # =====================
        if ($skillId -in @("debug_issue", "code_review", "architect-review", "api-design-principles", "error-handling-patterns")) {
            $score += 20
            if ($reasons.Count -eq 0) { $reasons.Add("Universal software quality standard") }
        }

        # =====================
        # 5. Backend Architecture Boost
        # =====================
        if ($skillId -in @("architecture-patterns", "backend-architect", "backend-security-coder", "security_audit")) {
            if ($hasBackend -or $hasDatabase) {
                $score += 25
                if ($reasons.Count -eq 0) { $reasons.Add("Backend architecture detected") }
            }
        }

        # =====================
        # 6. Full-Stack Boost
        # =====================
        if ($isFullStack -and $skillId -like "*full-stack*") {
            $score += 15
            $reasons.Add("Full-stack application detected")
        }

        # =====================
        # 7. QA/Testing Boost
        # =====================
        if ($hasQA) {
            if ($skillId -like "*test*" -or $skillId -like "*scaffold_tests*" -or $skillId -eq "test_runner") {
                $score += 10
                $reasons.Add("Testing tooling detected in project")
            }
        }

        # =====================
        # 8. Mobile-specific Boost
        # =====================
        if ($isMobile -and $skillId -eq "mobile-developer") {
            $score += 15
            $reasons.Add("Mobile application detected")
        }

        # =====================
        # 9. Contextual Working Mode Boost (GAP 1)
        # =====================
        if ($normMode) {
            if ($normMode -eq "frontend" -or $normMode -like "*frontend*") {
                if ($category -eq "Frontend" -or $pack -like "*frontend*" -or $skillId -in @("frontend_design", "enhance_ui", "flutter-build-responsive-layout", "flutter-add-widget-preview", "ui_ux_pro_max", "web_performance_optimization")) {
                    $score += 20
                    $reasons.Add("Matched user working mode: Frontend Development")
                }
            }
            elseif ($normMode -eq "backend" -or $normMode -like "*backend*") {
                if ($category -eq "Backend" -or $pack -like "*backend*" -or $skillId -in @("api-design-principles", "backend-architect", "backend-security-coder", "architecture-patterns", "document_api", "error-handling-patterns")) {
                    $score += 20
                    $reasons.Add("Matched user working mode: Backend Development")
                }
            }
            elseif ($normMode -eq "fullstack" -or $normMode -like "*full*") {
                if ($category -in @("Frontend", "Backend", "Full Stack") -or $skillId -like "*full-stack*" -or $skillId -in @("architecture-patterns", "frontend_design", "backend-architect")) {
                    $score += 15
                    $reasons.Add("Matched user working mode: Full Stack Development")
                }
            }
            elseif ($normMode -eq "qa" -or $normMode -like "*qa*" -or $normMode -like "*debug*") {
                if ($category -in @("QA", "Debugging", "Code Quality", "Security") -or $skillId -like "*test*" -or $skillId -in @("debug_issue", "debugger", "test_runner", "scaffold_tests", "code_review", "security_audit", "e2e-testing-patterns")) {
                    $score += 20
                    $reasons.Add("Matched user working mode: QA / Debugging")
                }
            }
        }

        # =====================
        # 10. Contextual Target Boost (GAP 1)
        # =====================
        if ($normTarget) {
            if ($normTarget -in @("mobile_application", "mobile application", "mobile")) {
                if ($skillId -like "*flutter*" -or $skillId -like "*dart*" -or $skillId -eq "mobile-developer" -or $skillId -eq "android-cli") {
                    $score += 10
                    $reasons.Add("Targeted for Mobile Application")
                }
            }
            elseif ($normTarget -in @("web_application", "web application", "website", "web")) {
                if ($skillId -like "*web*" -or $skillId -like "*frontend*" -or $skillId -like "*react*") {
                    $score += 10
                    $reasons.Add("Targeted for Web Application")
                }
            }
            elseif ($normTarget -in @("api_service", "api / service", "web_backend", "web / app backend", "backend / api", "backend")) {
                if ($skillId -in @("api-design-principles", "document_api", "backend-architect", "backend-security-coder")) {
                    $score += 10
                    $reasons.Add("Targeted for API / Backend Service")
                }
            }
            elseif ($normTarget -in @("database_layer", "database / data layer", "database")) {
                if ($skillId -in @("architecture-patterns", "backend-architect", "security_audit")) {
                    $score += 10
                    $reasons.Add("Targeted for Database / Data Layer")
                }
            }
            elseif ($normTarget -in @("full_project", "full project")) {
                if ($skillId -in @("architect-review", "code_review", "debug_issue", "security_audit")) {
                    $score += 10
                    $reasons.Add("Targeted for Full Project QA")
                }
            }
        }

        if ($score -ge 30) {
            $reasonText = ($reasons | Select-Object -Unique) -join "; "
            $recommended.Add([PSCustomObject]@{
                SkillId     = $skill.Id
                Pack        = $skill.Pack
                Score       = $score
                MatchReason = $reasonText
            })
        }
    }

    # Sort by score descending and return top matches (max 15 skills)
    $sorted = $recommended | Sort-Object Score -Descending | Select-Object -First 15
    return @($sorted)
}
