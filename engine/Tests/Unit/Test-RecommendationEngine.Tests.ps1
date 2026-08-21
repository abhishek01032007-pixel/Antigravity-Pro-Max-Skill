# Test-RecommendationEngine.Tests.ps1 - Unit tests for Recommendation Engine

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RepoRoot = Split-Path $EngineRoot -Parent
. (Join-Path $EngineRoot "Storage\SkillRegistry.ps1")
. (Join-Path $EngineRoot "Recommendations\RecommendationEngine.ps1")

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

Write-Host "Running RecommendationEngine Unit Tests..." -ForegroundColor Cyan

$allSkills = Get-NexoraSkillRegistry -LibraryRoot $RepoRoot

# Case 1: Flutter Project
$flutterAnalysis = [PSCustomObject]@{
    projectType = "Flutter Mobile App"
    detectedTechnologies = @("Dart", "Supabase")
    detectedFrameworks = @("Flutter")
}

$recs = Get-NexoraSkillRecommendations -Analysis $flutterAnalysis -AvailableSkills $allSkills
$recIds = @($recs | ForEach-Object { $_.SkillId })

Assert-Equal ($recIds -contains "flutter-build-responsive-layout") $true "Recommends flutter-build-responsive-layout for Flutter app"
Assert-Equal ($recIds -contains "dart-add-unit-test") $true "Recommends dart unit tests for Flutter app"
Assert-Equal ($recIds -contains "fastapi-templates") $false "Does not recommend fastapi for Flutter app"
Assert-Equal ($recIds -contains "nodejs-backend-patterns") $false "Does not recommend nodejs for Flutter app"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
