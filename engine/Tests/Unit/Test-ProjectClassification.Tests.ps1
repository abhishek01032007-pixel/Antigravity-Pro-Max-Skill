# Test-ProjectClassification.Tests.ps1 - Unit tests for expanded project detection and classification

$ErrorActionPreference = "Stop"
$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

# Source required modules
. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Utils\OutputUtils.ps1")
. (Join-Path $EngineRoot "Detection\ProjectDetector.ps1")

$total = 0
$passed = 0

function Assert-Equal($actual, $expected, $testName) {
    $script:total++
    if ($actual -eq $expected) {
        $script:passed++
        Write-Host "  [PASS] $testName" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] $testName (Expected: '$expected', Got: '$actual')" -ForegroundColor Red
    }
}

Write-Host "Running ProjectClassification Unit Tests..." -ForegroundColor Cyan

$testRoot = Join-Path $env:TEMP ("nexora_class_test_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null

try {
    # 1. Flutter Mobile App
    $flutterDir = Join-Path $testRoot "flutter_app"
    New-Item -ItemType Directory -Path $flutterDir -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $flutterDir "android") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $flutterDir "ios") -Force | Out-Null
    Set-Content -Path (Join-Path $flutterDir "pubspec.yaml") -Value "name: test_app`nflutter:`n  sdk: flutter`ndependencies:`n  supabase_flutter: ^2.0.0`n  flutter_test:`n    sdk: flutter" -Encoding UTF8
    Set-Content -Path (Join-Path $flutterDir "analysis_options.yaml") -Value "include: package:flutter_lints/flutter.yaml" -Encoding UTF8

    $resFlutter = Invoke-NexoraProjectScan -ProjectRoot $flutterDir
    Assert-Equal $resFlutter.projectType "mobile_application" "Flutter classifies as mobile_application"
    Assert-Equal ($resFlutter.languages -contains "Dart") $true "Flutter detects Dart language"
    Assert-Equal ($resFlutter.frontend -contains "Flutter") $true "Flutter detects Flutter frontend"
    Assert-Equal ($resFlutter.backend -contains "Supabase") $true "Flutter detects Supabase backend"
    Assert-Equal ($resFlutter.database -contains "PostgreSQL") $true "Flutter detects PostgreSQL database"
    Assert-Equal ($resFlutter.qa -contains "flutter_test") $true "Flutter detects flutter_test QA"
    Assert-Equal $resFlutter.developmentMode "full_stack" "Flutter with Supabase has full_stack mode"
    Assert-Equal ($resFlutter.detectedTechnologies -contains "Dart") $true "Preserves detectedTechnologies backward compat"
    Assert-Equal ($resFlutter.detectedFrameworks -contains "Flutter") $true "Preserves detectedFrameworks backward compat"

    # 2. Next.js Fullstack App
    $nextDir = Join-Path $testRoot "nextjs_app"
    New-Item -ItemType Directory -Path $nextDir -Force | Out-Null
    $pkgJson = @{
        name = "my-nextjs-app"
        dependencies = @{ "react" = "^18.0.0"; "next" = "^14.0.0"; "@supabase/supabase-js" = "^2.0.0" }
        devDependencies = @{ "typescript" = "^5.0.0"; "jest" = "^29.0.0"; "eslint" = "^8.0.0" }
    } | ConvertTo-Json -Depth 4
    Set-Content -Path (Join-Path $nextDir "package.json") -Value $pkgJson -Encoding UTF8
    Set-Content -Path (Join-Path $nextDir "tsconfig.json") -Value "{}" -Encoding UTF8
    Set-Content -Path (Join-Path $nextDir "next.config.js") -Value "module.exports = {}" -Encoding UTF8

    $resNext = Invoke-NexoraProjectScan -ProjectRoot $nextDir
    Assert-Equal $resNext.projectType "full_stack_application" "Next.js classifies as full_stack_application"
    Assert-Equal ($resNext.languages -contains "TypeScript") $true "Next.js detects TypeScript"
    Assert-Equal ($resNext.frontend -contains "React") $true "Next.js detects React"
    Assert-Equal ($resNext.frontend -contains "Next.js") $true "Next.js detects Next.js"
    Assert-Equal ($resNext.qa -contains "jest") $true "Next.js detects jest QA"

    # 3. Python FastAPI Backend
    $fastapiDir = Join-Path $testRoot "fastapi_backend"
    New-Item -ItemType Directory -Path $fastapiDir -Force | Out-Null
    Set-Content -Path (Join-Path $fastapiDir "requirements.txt") -Value "fastapi==0.104.0`nuvicorn==0.24.0`npytest==7.4.0" -Encoding UTF8

    $resFastAPI = Invoke-NexoraProjectScan -ProjectRoot $fastapiDir
    Assert-Equal $resFastAPI.projectType "backend_service" "FastAPI classifies as backend_service"
    Assert-Equal ($resFastAPI.languages -contains "Python") $true "FastAPI detects Python"
    Assert-Equal ($resFastAPI.backend -contains "FastAPI") $true "FastAPI detects FastAPI"
    Assert-Equal ($resFastAPI.qa -contains "pytest") $true "FastAPI detects pytest"
    Assert-Equal $resFastAPI.developmentMode "backend" "FastAPI has backend developmentMode"

    # 4. Go Service
    $goDir = Join-Path $testRoot "go_service"
    New-Item -ItemType Directory -Path $goDir -Force | Out-Null
    Set-Content -Path (Join-Path $goDir "go.mod") -Value "module github.com/test/service`ngo 1.21" -Encoding UTF8

    $resGo = Invoke-NexoraProjectScan -ProjectRoot $goDir
    Assert-Equal ($resGo.languages -contains "Go") $true "Go detects Go language"

    # 5. PHP Laravel
    $laravelDir = Join-Path $testRoot "laravel_app"
    New-Item -ItemType Directory -Path $laravelDir -Force | Out-Null
    Set-Content -Path (Join-Path $laravelDir "composer.json") -Value '{"require":{"laravel/framework":"^10.0"}}' -Encoding UTF8

    $resLaravel = Invoke-NexoraProjectScan -ProjectRoot $laravelDir
    Assert-Equal ($resLaravel.languages -contains "PHP") $true "Laravel detects PHP"
    Assert-Equal ($resLaravel.backend -contains "Laravel") $true "Laravel detects Laravel backend"

    # 6. Unknown / Empty
    $emptyDir = Join-Path $testRoot "empty_project"
    New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null

    $resEmpty = Invoke-NexoraProjectScan -ProjectRoot $emptyDir
    Assert-Equal $resEmpty.projectType "unknown" "Empty directory classifies as unknown"
}
finally {
    Remove-Item -Path $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
