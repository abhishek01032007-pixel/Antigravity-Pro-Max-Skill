# Test-InstallationLocator.Tests.ps1 - Unit tests for install.json and dynamic locator

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $EngineRoot "Services\ProjectService.ps1")

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

Write-Host "Running InstallationLocator Unit Tests..." -ForegroundColor Cyan

# Test 1: Metadata Save and Load
$tempAppDir = Join-Path $env:TEMP ("nexora_meta_test_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempAppDir -Force | Out-Null

try {
    $meta = Save-NexoraInstallationMetadata -InstallPath $tempAppDir -Version "1.0.0" -InstallMethod "unit_test"
    Assert-Equal ($null -ne $meta) $true "Saves installation metadata"
    Assert-Equal $meta.installPath $tempAppDir "Persists correct installPath"
    Assert-Equal $meta.version "1.0.0" "Persists correct version"

    $loaded = Get-NexoraInstallationMetadata
    Assert-Equal ($null -ne $loaded) $true "Loads installation metadata"
    Assert-Equal $loaded.installPath $tempAppDir "Loaded installPath matches saved"

    # Test 2: Resolve runtime path from install.json
    $resolved = Resolve-NexoraInstalledRuntimePath
    Assert-Equal $resolved $tempAppDir "Resolves runtime path correctly"
}
finally {
    Remove-Item -Path $tempAppDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
