# Test-SkillSelectionService.Tests.ps1 - Unit tests for Skill Selection & Dependency Layer

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $EngineRoot "Lifecycle\SkillSelectionService.ps1")

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

Write-Host "Running SkillSelectionService Unit Tests..." -ForegroundColor Cyan

# Test 1: Basic Recommendation Passthrough
$recs = @("flutter-build-responsive-layout", "dart-add-unit-test")
$res1 = Resolve-NexoraSkillSelection -RecommendedSkills $recs
Assert-Equal $res1.IncludedCount 2 "Passes through recommended skills"

# Test 2: Inclusion and Exclusion Filtering
$res2 = Resolve-NexoraSkillSelection -RecommendedSkills $recs -IncludeSkills @("debug_issue") -ExcludeSkills @("dart-add-unit-test")
Assert-Equal ($res2.FinalSelectedIds -contains "debug_issue") $true "Includes manually added skill"
Assert-Equal ($res2.FinalSelectedIds -contains "dart-add-unit-test") $false "Excludes deselected skill"
Assert-Equal $res2.IncludedCount 2 "Calculates finalized count"

# Test 3: Conflict detection
$res3 = Resolve-NexoraSkillSelection -RecommendedSkills @("flutter-add-widget-test", "react-frontend-patterns")
Assert-Equal ($res3.Conflicts.Count -ge 1) $true "Identifies cross-framework conflicts"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
