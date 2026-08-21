# Test-DoctorRepair.Tests.ps1 - Unit tests for Nexora Doctor and Auto-Repair

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Utils\OutputUtils.ps1")
. (Join-Path $EngineRoot "Services\ProjectService.ps1")
. (Join-Path $EngineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $EngineRoot "CLI\Commands\DoctorCommand.ps1")

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

Write-Host "Running DoctorRepair Unit Tests..." -ForegroundColor Cyan

# Test 1: Invoke Doctor with JSON flag
$parsedArgs = [PSCustomObject]@{
    Command   = "doctor"
    Arguments = @()
    Flags     = @{ json = $true }
}

$res = Invoke-DoctorCommand -ParsedArgs $parsedArgs
Assert-Equal $res 0 "Doctor runs and returns exit code 0"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
