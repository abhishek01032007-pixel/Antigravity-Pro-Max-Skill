# Test-PathUtils.Tests.ps1 - Unit tests for Path Utils

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $EngineRoot "Utils\PathUtils.ps1")

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

Write-Host "Running PathUtils Unit Tests..." -ForegroundColor Cyan

# Test 1: Subfolder check
$isSub = Test-PathIsSubfolder "C:\Projects\MyApp\subfolder" "C:\Projects\MyApp"
Assert-Equal $isSub $true "Identifies valid subfolder"

$isNotSub = Test-PathIsSubfolder "C:\OtherProjects\MyApp" "C:\Projects\MyApp"
Assert-Equal $isNotSub $false "Rejects outside path"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
