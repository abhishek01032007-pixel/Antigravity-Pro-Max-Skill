# ProjectDetector.ps1 - Heuristic project stack detection and confidence scoring

function Invoke-NexoraProjectScan {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $technologies = [System.Collections.Generic.List[string]]::new()
    $frameworks = [System.Collections.Generic.List[string]]::new()
    $confidence = @{}
    $markers = [System.Collections.Generic.List[string]]::new()

    # 1. Check Flutter & Dart
    $pubspecPath = Join-Path $ProjectRoot "pubspec.yaml"
    $hasDart = $false
    $hasFlutter = $false

    if (Test-Path $pubspecPath) {
        $markers.Add("pubspec.yaml")
        $hasDart = $true
        $technologies.Add("Dart")
        $confidence["Dart"] = 90

        $pubspecContent = Get-Content $pubspecPath -Raw -ErrorAction SilentlyContinue
        if ($pubspecContent -match "sdk:\s*flutter" -or $pubspecContent -match "flutter:") {
            $hasFlutter = $true
            $frameworks.Add("Flutter")
            $confidence["Flutter"] = 95
            $markers.Add("flutter_sdk_declaration")
        }

        if ($pubspecContent -match "supabase_flutter" -or $pubspecContent -match "supabase:") {
            $technologies.Add("Supabase")
            $confidence["Supabase"] = 90
            $markers.Add("supabase_flutter_dep")
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

    # 2. Check Node.js, React, Next.js
    $pkgJsonPath = Join-Path $ProjectRoot "package.json"
    if (Test-Path $pkgJsonPath) {
        $markers.Add("package.json")
        $technologies.Add("Node.js")
        $confidence["Node.js"] = 90

        try {
            $pkg = Get-Content $pkgJsonPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
            $allDeps = @{}
            if ($pkg.dependencies) {
                $pkg.dependencies.psobject.properties | ForEach-Object { $allDeps[$_.Name] = $_.Value }
            }
            if ($pkg.devDependencies) {
                $pkg.devDependencies.psobject.properties | ForEach-Object { $allDeps[$_.Name] = $_.Value }
            }

            if ($allDeps.ContainsKey("react") -or $allDeps.ContainsKey("react-dom")) {
                $frameworks.Add("React")
                $confidence["React"] = 95
                $markers.Add("react_dependency")
            }

            if ($allDeps.ContainsKey("next")) {
                $frameworks.Add("Next.js")
                $confidence["Next.js"] = 98
                $markers.Add("nextjs_dependency")
            }

            if ($allDeps.ContainsKey("@supabase/supabase-js")) {
                if (-not $technologies.Contains("Supabase")) {
                    $technologies.Add("Supabase")
                    $confidence["Supabase"] = 92
                    $markers.Add("supabase_js_dep")
                }
            }

            if ($allDeps.ContainsKey("express") -or $allDeps.ContainsKey("@nestjs/core")) {
                $nodeFw = if ($allDeps.ContainsKey("@nestjs/core")) { "NestJS" } else { "Express" }
                $frameworks.Add($nodeFw)
                $confidence[$nodeFw] = 90
            }
        }
        catch {}
    }

    # Next.js config marker
    $hasNextConfig = (Test-Path (Join-Path $ProjectRoot "next.config.js")) -or (Test-Path (Join-Path $ProjectRoot "next.config.mjs")) -or (Test-Path (Join-Path $ProjectRoot "next.config.ts"))
    if ($hasNextConfig) {
        $markers.Add("next.config")
        if (-not $frameworks.Contains("Next.js")) {
            $frameworks.Add("Next.js")
            $confidence["Next.js"] = 95
        }
    }

    # 3. Check Python, FastAPI, Django, Flask
    $hasPython = $false
    $pyMarkers = @("requirements.txt", "pyproject.toml", "Pipfile", "setup.py")
    foreach ($pm in $pyMarkers) {
        $pPath = Join-Path $ProjectRoot $pm
        if (Test-Path $pPath) {
            $hasPython = $true
            $markers.Add($pm)
            $content = Get-Content $pPath -Raw -ErrorAction SilentlyContinue

            if ($content -match "fastapi") {
                $frameworks.Add("FastAPI")
                $confidence["FastAPI"] = 95
                $markers.Add("fastapi_dependency")
            }
            if ($content -match "django") {
                $frameworks.Add("Django")
                $confidence["Django"] = 95
                $markers.Add("django_dependency")
            }
            if ($content -match "flask") {
                $frameworks.Add("Flask")
                $confidence["Flask"] = 90
                $markers.Add("flask_dependency")
            }
        }
    }
    if ($hasPython) {
        $technologies.Add("Python")
        $confidence["Python"] = 90
    }

    # 4. Check Supabase folder
    if (Test-Path (Join-Path $ProjectRoot "supabase")) {
        $markers.Add("supabase_directory")
        if (-not $technologies.Contains("Supabase")) {
            $technologies.Add("Supabase")
            $confidence["Supabase"] = 95
        } else {
            $confidence["Supabase"] = 100
        }
    }

    # Determine Project Type Summary
    $primaryType = "Generic"
    if ($frameworks.Contains("Flutter")) {
        $primaryType = "Flutter Mobile App"
    }
    elseif ($frameworks.Contains("Next.js")) {
        $primaryType = "Next.js Fullstack Web App"
    }
    elseif ($frameworks.Contains("React")) {
        $primaryType = "React Frontend App"
    }
    elseif ($frameworks.Contains("FastAPI")) {
        $primaryType = "FastAPI Python Backend"
    }
    elseif ($technologies.Contains("Node.js")) {
        $primaryType = "Node.js Application"
    }
    elseif ($technologies.Contains("Python")) {
        $primaryType = "Python Application"
    }

    $analysis = [PSCustomObject]@{
        scannedAt            = (Get-Date).ToString("o")
        projectType          = $primaryType
        detectedTechnologies = $technologies.ToArray()
        detectedFrameworks   = $frameworks.ToArray()
        confidenceScores     = $confidence
        markersFound         = $markers.ToArray()
    }

    return $analysis
}
