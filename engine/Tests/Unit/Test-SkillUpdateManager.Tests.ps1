# Test-SkillUpdateManager.Tests.ps1 - Unit tests for Update & Checksum Verifier

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RepoRoot = Split-Path $EngineRoot -Parent

. (Join-Path $EngineRoot "Metadata\MetadataParser.ps1")
. (Join-Path $EngineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $EngineRoot "Lifecycle\SkillUpdateManager.ps1")

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

Write-Host "Running SkillUpdateManager Unit Tests..." -ForegroundColor Cyan

# Test 1: Checksum of an existing skill
$samplePath = Join-Path $RepoRoot "Frontend-Pro-Max\flutter-build-responsive-layout"
$hash = Get-NexoraSkillChecksum -SkillDirectory $samplePath
Assert-Equal ($null -ne $hash -and $hash.Length -eq 64) $true "Generates 64-character SHA-256 hash"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
