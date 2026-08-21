# Test-CommandParser.Tests.ps1 - Unit tests for CLI Argument Parser

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $EngineRoot "CLI\CommandParser.ps1")

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

Write-Host "Running CommandParser Unit Tests..." -ForegroundColor Cyan

# Test 1: Empty args (Interactive default)
$res1 = Parse-NexoraArguments @()
Assert-Equal $res1.Command $null "Empty args returns null command (interactive)"

# Test 2: Subcommand with flags
$res2 = Parse-NexoraArguments @("doctor", "--json", "-v")
Assert-Equal $res2.Command "doctor" "Parses subcommand 'doctor'"
Assert-Equal $res2.Flags["json"] $true "Parses flag --json"
Assert-Equal $res2.Flags["version"] $true "Parses short flag -v"

# Test 3: Positional arguments
$res3 = Parse-NexoraArguments @("skills", "search", "flutter")
Assert-Equal $res3.Command "skills" "Parses subcommand 'skills'"
Assert-Equal $res3.Arguments[0] "search" "Parses first positional arg 'search'"
Assert-Equal $res3.Arguments[1] "flutter" "Parses second positional arg 'flutter'"

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
