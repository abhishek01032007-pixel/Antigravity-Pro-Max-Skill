# Test-MetadataParser.Tests.ps1 - Unit tests for Skill Metadata Parser

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RepoRoot = Split-Path $EngineRoot -Parent
. (Join-Path $EngineRoot "Metadata\MetadataParser.ps1")

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

Write-Host "Running MetadataParser Unit Tests..." -ForegroundColor Cyan

# Test on an existing skill in Frontend-Pro-Max
$sampleSkill = Join-Path $RepoRoot "Frontend-Pro-Max\flutter-build-responsive-layout"
$meta = Parse-NexoraSkillMetadata -SkillDirectory $sampleSkill

Assert-Equal ($null -ne $meta) $true "Successfully parses sample skill"
Assert-Equal $meta.category "Frontend" "Infers category correctly"
Assert-Equal $meta.technology "flutter" "Infers flutter technology"
Assert-Equal $meta.hasFullDoc $true "Validates documentation presence"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
