# ProjectDetector.ps1 - Heuristic project stack detection, classification, and confidence scoring

function Invoke-NexoraProjectScan {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $languages = [System.Collections.Generic.List[string]]::new()
    $frontend = [System.Collections.Generic.List[string]]::new()
    $backend = [System.Collections.Generic.List[string]]::new()
    $database = [System.Collections.Generic.List[string]]::new()
    $qa = [System.Collections.Generic.List[string]]::new()
    $tooling = [System.Collections.Generic.List[string]]::new()
    $technologies = [System.Collections.Generic.List[string]]::new()
    $frameworks = [System.Collections.Generic.List[string]]::new()
    $confidence = @{}
    $markers = [System.Collections.Generic.List[string]]::new()

    # Helper: safe add to list (no duplicates)
    function Add-Unique {
        param([System.Collections.Generic.List[string]]$List, [string]$Value)
        if (-not $List.Contains($Value)) { $List.Add($Value) }
    }

    # ==========================================
    # 1. Flutter & Dart
    # ==========================================
    $pubspecPath = Join-Path $ProjectRoot "pubspec.yaml"
    $hasDart = $false
    $hasFlutter = $false

    if (Test-Path $pubspecPath) {
        $markers.Add("pubspec.yaml")
        $hasDart = $true
        Add-Unique $languages "Dart"
        Add-Unique $technologies "Dart"
        $confidence["Dart"] = 90
        Add-Unique $tooling "dart_cli"

        $pubspecContent = Get-Content $pubspecPath -Raw -ErrorAction SilentlyContinue
        if ($pubspecContent -match "sdk:\s*flutter" -or $pubspecContent -match "flutter:") {
            $hasFlutter = $true
            Add-Unique $frontend "Flutter"
            Add-Unique $frameworks "Flutter"
            $confidence["Flutter"] = 95
            $markers.Add("flutter_sdk_declaration")
            Add-Unique $tooling "flutter_cli"
        }

        if ($pubspecContent -match "supabase_flutter" -or $pubspecContent -match "supabase:") {
            Add-Unique $backend "Supabase"
            Add-Unique $database "PostgreSQL"
            Add-Unique $technologies "Supabase"
            $confidence["Supabase"] = 90
            $markers.Add("supabase_flutter_dep")
        }

        # Flutter test detection
        if ($pubspecContent -match "flutter_test:" -or $pubspecContent -match "test:") {
            Add-Unique $qa "flutter_test"
            $markers.Add("flutter_test_dep")
        }
        if ($pubspecContent -match "integration_test:") {
            Add-Unique $qa "integration_test"
            $markers.Add("integration_test_dep")
        }
        if ($pubspecContent -match "mockito:") {
            Add-Unique $qa "mockito"
            $markers.Add("mockito_dep")
        }
    }

    if (Test-Path (Join-Path $ProjectRoot "android")) {
        $markers.Add("android_folder")
        if ($hasFlutter) { $confidence["Flutter"] = [Math]::Min(100, $confidence["Flutter"] + 5) }
    }
    if (Test-Path (Join-Path $ProjectRoot "ios")) {
        $markers.Add("ios_folder")
        if ($hasFlutter) { $confidence["Flutter"] = [Math]::Min(100, $confidence["Flutter"] + 5) }
    }

    # ==========================================
    # 2. Node.js, JavaScript, TypeScript Ecosystem
    # ==========================================
    $pkgJsonPath = Join-Path $ProjectRoot "package.json"
    $allDeps = @{}
    if (Test-Path $pkgJsonPath) {
        $markers.Add("package.json")
        Add-Unique $technologies "Node.js"
        Add-Unique $languages "JavaScript"
        $confidence["Node.js"] = 90
        $confidence["JavaScript"] = 85
        Add-Unique $tooling "npm"

        try {
            $pkg = Get-Content $pkgJsonPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
            if ($pkg.dependencies) {
                $pkg.dependencies.psobject.properties | ForEach-Object { $allDeps[$_.Name] = $_.Value }
            }
            if ($pkg.devDependencies) {
                $pkg.devDependencies.psobject.properties | ForEach-Object { $allDeps[$_.Name] = $_.Value }
            }

            # TypeScript
            if ($allDeps.ContainsKey("typescript") -or (Test-Path (Join-Path $ProjectRoot "tsconfig.json"))) {
                Add-Unique $languages "TypeScript"
                $confidence["TypeScript"] = 95
                $markers.Add("typescript_detected")
            }

            # Frontend Frameworks
            if ($allDeps.ContainsKey("react") -or $allDeps.ContainsKey("react-dom")) {
                Add-Unique $frontend "React"
                Add-Unique $frameworks "React"
                $confidence["React"] = 95
                $markers.Add("react_dependency")
            }
            if ($allDeps.ContainsKey("next")) {
                Add-Unique $frontend "Next.js"
                Add-Unique $frameworks "Next.js"
                $confidence["Next.js"] = 98
                $markers.Add("nextjs_dependency")
            }
            if ($allDeps.ContainsKey("vue") -or $allDeps.ContainsKey("nuxt")) {
                $vueFw = if ($allDeps.ContainsKey("nuxt")) { "Nuxt.js" } else { "Vue" }
                Add-Unique $frontend $vueFw
                Add-Unique $frameworks $vueFw
                $confidence[$vueFw] = 95
                $markers.Add("vue_dependency")
            }
            if ($allDeps.ContainsKey("@angular/core")) {
                Add-Unique $frontend "Angular"
                Add-Unique $frameworks "Angular"
                $confidence["Angular"] = 95
                $markers.Add("angular_dependency")
            }
            if ($allDeps.ContainsKey("react-native")) {
                Add-Unique $frontend "React Native"
                Add-Unique $frameworks "React Native"
                $confidence["React Native"] = 95
                $markers.Add("react_native_dependency")
            }

            # Backend Frameworks
            if ($allDeps.ContainsKey("express")) {
                Add-Unique $backend "Express"
                Add-Unique $frameworks "Express"
                $confidence["Express"] = 90
                $markers.Add("express_dependency")
            }
            if ($allDeps.ContainsKey("@nestjs/core")) {
                Add-Unique $backend "NestJS"
                Add-Unique $frameworks "NestJS"
                $confidence["NestJS"] = 95
                $markers.Add("nestjs_dependency")
            }

            # Database / Services
            if ($allDeps.ContainsKey("@supabase/supabase-js")) {
                Add-Unique $backend "Supabase"
                Add-Unique $database "PostgreSQL"
                Add-Unique $technologies "Supabase"
                $confidence["Supabase"] = 92
                $markers.Add("supabase_js_dep")
            }
            if ($allDeps.ContainsKey("firebase") -or $allDeps.ContainsKey("firebase-admin")) {
                Add-Unique $backend "Firebase"
                Add-Unique $technologies "Firebase"
                $confidence["Firebase"] = 90
                $markers.Add("firebase_dep")
            }
            if ($allDeps.ContainsKey("mongoose") -or $allDeps.ContainsKey("mongodb")) {
                Add-Unique $database "MongoDB"
                $confidence["MongoDB"] = 90
                $markers.Add("mongodb_dep")
            }
            if ($allDeps.ContainsKey("pg") -or $allDeps.ContainsKey("knex") -or $allDeps.ContainsKey("sequelize")) {
                Add-Unique $database "PostgreSQL"
                $confidence["PostgreSQL"] = 85
                $markers.Add("postgres_js_dep")
            }
            if ($allDeps.ContainsKey("mysql2") -or $allDeps.ContainsKey("mysql")) {
                Add-Unique $database "MySQL"
                $confidence["MySQL"] = 85
                $markers.Add("mysql_dep")
            }
            if ($allDeps.ContainsKey("better-sqlite3") -or $allDeps.ContainsKey("sqlite3")) {
                Add-Unique $database "SQLite"
                $confidence["SQLite"] = 85
                $markers.Add("sqlite_js_dep")
            }

            # Testing
            if ($allDeps.ContainsKey("jest")) {
                Add-Unique $qa "jest"
                $markers.Add("jest_dep")
            }
            if ($allDeps.ContainsKey("vitest")) {
                Add-Unique $qa "vitest"
                $markers.Add("vitest_dep")
            }
            if ($allDeps.ContainsKey("playwright") -or $allDeps.ContainsKey("@playwright/test")) {
                Add-Unique $qa "playwright"
                $markers.Add("playwright_dep")
            }
            if ($allDeps.ContainsKey("cypress")) {
                Add-Unique $qa "cypress"
                $markers.Add("cypress_dep")
            }
            if ($allDeps.ContainsKey("eslint")) {
                Add-Unique $qa "eslint"
                $markers.Add("eslint_dep")
            }

            # Tooling
            if ($allDeps.ContainsKey("pnpm") -or (Test-Path (Join-Path $ProjectRoot "pnpm-lock.yaml"))) {
                Add-Unique $tooling "pnpm"
            }
            if (Test-Path (Join-Path $ProjectRoot "yarn.lock")) {
                Add-Unique $tooling "yarn"
            }
        }
        catch {}
    }

    # tsconfig.json without package.json
    if ((Test-Path (Join-Path $ProjectRoot "tsconfig.json")) -and -not $languages.Contains("TypeScript")) {
        Add-Unique $languages "TypeScript"
        $confidence["TypeScript"] = 90
        $markers.Add("tsconfig.json")
    }

    # Next.js config marker
    $hasNextConfig = (Test-Path (Join-Path $ProjectRoot "next.config.js")) -or (Test-Path (Join-Path $ProjectRoot "next.config.mjs")) -or (Test-Path (Join-Path $ProjectRoot "next.config.ts"))
    if ($hasNextConfig) {
        $markers.Add("next.config")
        if (-not $frameworks.Contains("Next.js")) {
            Add-Unique $frontend "Next.js"
            Add-Unique $frameworks "Next.js"
            $confidence["Next.js"] = 95
        }
    }

    # ==========================================
    # 3. Python, FastAPI, Django, Flask
    # ==========================================
    $hasPython = $false
    $pyMarkers = @("requirements.txt", "pyproject.toml", "Pipfile", "setup.py", "setup.cfg")
    foreach ($pm in $pyMarkers) {
        $pPath = Join-Path $ProjectRoot $pm
        if (Test-Path $pPath) {
            $hasPython = $true
            $markers.Add($pm)
            $content = Get-Content $pPath -Raw -ErrorAction SilentlyContinue

            if ($content -match "fastapi") {
                Add-Unique $backend "FastAPI"
                Add-Unique $frameworks "FastAPI"
                $confidence["FastAPI"] = 95
                $markers.Add("fastapi_dependency")
            }
            if ($content -match "django") {
                Add-Unique $backend "Django"
                Add-Unique $frameworks "Django"
                $confidence["Django"] = 95
                $markers.Add("django_dependency")
            }
            if ($content -match "flask") {
                Add-Unique $backend "Flask"
                Add-Unique $frameworks "Flask"
                $confidence["Flask"] = 90
                $markers.Add("flask_dependency")
            }
            if ($content -match "pytest") {
                Add-Unique $qa "pytest"
                $markers.Add("pytest_dep")
            }
        }
    }
    if ($hasPython) {
        Add-Unique $languages "Python"
        Add-Unique $technologies "Python"
        $confidence["Python"] = 90
        if (Test-Path (Join-Path $ProjectRoot "poetry.lock")) {
            Add-Unique $tooling "poetry"
        } elseif (Test-Path (Join-Path $ProjectRoot "Pipfile")) {
            Add-Unique $tooling "pipenv"
        } else {
            Add-Unique $tooling "pip"
        }
    }

    # ==========================================
    # 4. Java & Kotlin (Android / Spring)
    # ==========================================
    $hasJava = $false
    $hasKotlin = $false

    if (Test-Path (Join-Path $ProjectRoot "build.gradle")) {
        $markers.Add("build.gradle")
        $gradleContent = Get-Content (Join-Path $ProjectRoot "build.gradle") -Raw -ErrorAction SilentlyContinue
        $hasJava = $true
        Add-Unique $tooling "gradle"

        if ($gradleContent -match "kotlin" -or (Test-Path (Join-Path $ProjectRoot "build.gradle.kts"))) {
            $hasKotlin = $true
        }
        if ($gradleContent -match "com\.android" -or $gradleContent -match "android\s*\{") {
            Add-Unique $frontend "Android"
            Add-Unique $frameworks "Android"
            $confidence["Android"] = 90
            $markers.Add("android_gradle")
        }
        if ($gradleContent -match "org\.springframework") {
            Add-Unique $backend "Spring"
            Add-Unique $frameworks "Spring"
            $confidence["Spring"] = 90
            $markers.Add("spring_dependency")
        }
    }
    if (Test-Path (Join-Path $ProjectRoot "build.gradle.kts")) {
        $hasKotlin = $true
        $markers.Add("build.gradle.kts")
        Add-Unique $tooling "gradle"
    }
    if (Test-Path (Join-Path $ProjectRoot "pom.xml")) {
        $hasJava = $true
        $markers.Add("pom.xml")
        Add-Unique $tooling "maven"
        $pomContent = Get-Content (Join-Path $ProjectRoot "pom.xml") -Raw -ErrorAction SilentlyContinue
        if ($pomContent -match "spring-boot") {
            Add-Unique $backend "Spring"
            Add-Unique $frameworks "Spring"
            $confidence["Spring"] = 92
            $markers.Add("spring_boot_pom")
        }
    }
    if ($hasJava) {
        Add-Unique $languages "Java"
        Add-Unique $technologies "Java"
        $confidence["Java"] = 85
    }
    if ($hasKotlin) {
        Add-Unique $languages "Kotlin"
        Add-Unique $technologies "Kotlin"
        $confidence["Kotlin"] = 85
    }

    # ==========================================
    # 5. Swift / iOS
    # ==========================================
    $xcodeProj = Get-ChildItem $ProjectRoot -Filter "*.xcodeproj" -ErrorAction SilentlyContinue | Select-Object -First 1
    $xcWorkspace = Get-ChildItem $ProjectRoot -Filter "*.xcworkspace" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($xcodeProj -or $xcWorkspace -or (Test-Path (Join-Path $ProjectRoot "Package.swift"))) {
        Add-Unique $languages "Swift"
        Add-Unique $technologies "Swift"
        $confidence["Swift"] = 85
        $markers.Add("swift_project")
        if ($xcodeProj) { Add-Unique $frontend "iOS" }
    }

    # ==========================================
    # 6. C# / .NET / ASP.NET
    # ==========================================
    $csprojFiles = Get-ChildItem $ProjectRoot -Filter "*.csproj" -ErrorAction SilentlyContinue | Select-Object -First 1
    $slnFiles = Get-ChildItem $ProjectRoot -Filter "*.sln" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($csprojFiles -or $slnFiles) {
        Add-Unique $languages "C#"
        Add-Unique $technologies "C#"
        $confidence["C#"] = 85
        $markers.Add("dotnet_project")
        Add-Unique $tooling "dotnet_cli"
        if ($csprojFiles) {
            $csprojContent = Get-Content $csprojFiles.FullName -Raw -ErrorAction SilentlyContinue
            if ($csprojContent -match "Microsoft\.AspNetCore" -or $csprojContent -match "Microsoft\.NET\.Sdk\.Web") {
                Add-Unique $backend "ASP.NET"
                Add-Unique $frameworks "ASP.NET"
                $confidence["ASP.NET"] = 90
                $markers.Add("aspnet_project")
            }
        }
    }

    # ==========================================
    # 7. PHP / Laravel
    # ==========================================
    if (Test-Path (Join-Path $ProjectRoot "composer.json")) {
        Add-Unique $languages "PHP"
        Add-Unique $technologies "PHP"
        $confidence["PHP"] = 85
        $markers.Add("composer.json")
        $composerContent = Get-Content (Join-Path $ProjectRoot "composer.json") -Raw -ErrorAction SilentlyContinue
        if ($composerContent -match "laravel") {
            Add-Unique $backend "Laravel"
            Add-Unique $frameworks "Laravel"
            $confidence["Laravel"] = 90
            $markers.Add("laravel_dependency")
        }
    }

    # ==========================================
    # 8. Go
    # ==========================================
    if (Test-Path (Join-Path $ProjectRoot "go.mod")) {
        Add-Unique $languages "Go"
        Add-Unique $technologies "Go"
        $confidence["Go"] = 90
        $markers.Add("go.mod")
        Add-Unique $tooling "go_cli"
    }

    # ==========================================
    # 9. Ruby
    # ==========================================
    if (Test-Path (Join-Path $ProjectRoot "Gemfile")) {
        Add-Unique $languages "Ruby"
        Add-Unique $technologies "Ruby"
        $confidence["Ruby"] = 85
        $markers.Add("Gemfile")
        $gemContent = Get-Content (Join-Path $ProjectRoot "Gemfile") -Raw -ErrorAction SilentlyContinue
        if ($gemContent -match "rails") {
            Add-Unique $backend "Rails"
            Add-Unique $frameworks "Rails"
            $confidence["Rails"] = 90
            $markers.Add("rails_dependency")
        }
    }

    # ==========================================
    # 10. Supabase / Firebase directories
    # ==========================================
    if (Test-Path (Join-Path $ProjectRoot "supabase")) {
        $markers.Add("supabase_directory")
        Add-Unique $backend "Supabase"
        Add-Unique $database "PostgreSQL"
        if (-not $technologies.Contains("Supabase")) {
            Add-Unique $technologies "Supabase"
            $confidence["Supabase"] = 95
        } else {
            $confidence["Supabase"] = 100
        }
    }
    if (Test-Path (Join-Path $ProjectRoot "firebase.json")) {
        $markers.Add("firebase.json")
        Add-Unique $backend "Firebase"
        if (-not $technologies.Contains("Firebase")) {
            Add-Unique $technologies "Firebase"
            $confidence["Firebase"] = 90
        }
    }

    # ==========================================
    # 11. HTML/CSS (standalone frontend)
    # ==========================================
    $hasHtml = (Get-ChildItem $ProjectRoot -Filter "*.html" -ErrorAction SilentlyContinue | Select-Object -First 1) -ne $null
    $hasCss = (Get-ChildItem $ProjectRoot -Filter "*.css" -ErrorAction SilentlyContinue | Select-Object -First 1) -ne $null
    if ($hasHtml) {
        Add-Unique $languages "HTML"
        $markers.Add("html_files")
    }
    if ($hasCss) {
        Add-Unique $languages "CSS"
        $markers.Add("css_files")
    }

    # ==========================================
    # 12. CI / Configuration Detection
    # ==========================================
    if (Test-Path (Join-Path $ProjectRoot ".github\workflows")) {
        Add-Unique $tooling "github_actions"
        $markers.Add("github_actions")
    }
    if ((Test-Path (Join-Path $ProjectRoot ".eslintrc.js")) -or (Test-Path (Join-Path $ProjectRoot ".eslintrc.json")) -or (Test-Path (Join-Path $ProjectRoot "eslint.config.js"))) {
        if (-not $qa.Contains("eslint")) { Add-Unique $qa "eslint" }
        $markers.Add("eslint_config")
    }
    if (Test-Path (Join-Path $ProjectRoot "analysis_options.yaml")) {
        Add-Unique $qa "dart_analyzer"
        $markers.Add("analysis_options.yaml")
    }

    # ==========================================
    # 13. Database file detection
    # ==========================================
    $sqliteFiles = Get-ChildItem $ProjectRoot -Filter "*.db" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($sqliteFiles -or (Test-Path (Join-Path $ProjectRoot "*.sqlite"))) {
        Add-Unique $database "SQLite"
        $confidence["SQLite"] = 70
    }

    # ==========================================
    # Classification: Project Type
    # ==========================================
    $projectType = "unknown"
    $developmentMode = "mixed"

    if ($frameworks.Contains("Flutter")) {
        $projectType = "mobile_application"
        if ($backend.Count -gt 0) {
            $developmentMode = "full_stack"
        } else {
            $developmentMode = "mobile"
        }
    }
    elseif ($frameworks.Contains("React Native")) {
        $projectType = "mobile_application"
        $developmentMode = "mobile"
    }
    elseif ($frameworks.Contains("Android") -or $frontend.Contains("iOS")) {
        $projectType = "mobile_application"
        $developmentMode = "mobile"
    }
    elseif ($frameworks.Contains("Next.js")) {
        $projectType = "full_stack_application"
        $developmentMode = "full_stack"
    }
    elseif ($frameworks.Contains("React") -or $frameworks.Contains("Vue") -or $frameworks.Contains("Angular")) {
        if ($backend.Count -gt 0) {
            $projectType = "full_stack_application"
            $developmentMode = "full_stack"
        } else {
            $projectType = "web_application"
            $developmentMode = "frontend"
        }
    }
    elseif ($frameworks.Contains("FastAPI") -or $frameworks.Contains("Django") -or $frameworks.Contains("Flask") -or $frameworks.Contains("Express") -or $frameworks.Contains("NestJS") -or $frameworks.Contains("Spring") -or $frameworks.Contains("ASP.NET") -or $frameworks.Contains("Laravel") -or $frameworks.Contains("Rails")) {
        if ($frontend.Count -gt 0) {
            $projectType = "full_stack_application"
            $developmentMode = "full_stack"
        } else {
            $projectType = "backend_service"
            $developmentMode = "backend"
        }
    }
    elseif ($hasHtml -and -not $backend.Count) {
        $projectType = "website"
        $developmentMode = "frontend"
    }
    elseif ($languages.Count -gt 0) {
        $projectType = "library_package"
        $developmentMode = "mixed"
    }

    # Calculate overall confidence
    $overallConfidence = 0
    if ($confidence.Count -gt 0) {
        $total = 0
        foreach ($v in $confidence.Values) { $total += $v }
        $overallConfidence = [Math]::Round($total / $confidence.Count, 2)
    }

    # Build backward-compatible output (preserves detectedTechnologies/detectedFrameworks)
    $analysis = [PSCustomObject]@{
        scannedAt            = (Get-Date).ToString("o")
        projectType          = $projectType
        developmentMode      = $developmentMode
        detectedTechnologies = $technologies.ToArray()
        detectedFrameworks   = $frameworks.ToArray()
        languages            = $languages.ToArray()
        frontend             = $frontend.ToArray()
        backend              = $backend.ToArray()
        database             = $database.ToArray()
        qa                   = $qa.ToArray()
        tooling              = $tooling.ToArray()
        confidenceScores     = $confidence
        overallConfidence    = $overallConfidence
        markersFound         = $markers.ToArray()
    }

    return $analysis
}
