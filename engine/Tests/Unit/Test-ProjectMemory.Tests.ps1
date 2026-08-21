# Test-ProjectMemory.Tests.ps1 - Unit tests for Project Memory Data Layer

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")

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

Write-Host "Running ProjectMemory Unit Tests..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("nexora_test_mem_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Test 1: Initialize Directory
    $nexoraDir = Initialize-NexoraProjectDirectory -ProjectRoot $tempDir
    Assert-Equal (Test-Path (Join-Path $tempDir ".nexora")) $true "Initializes .nexora folder"
    Assert-Equal (Test-Path (Join-Path $tempDir ".nexora\logs")) $true "Initializes logs folder"
    Assert-Equal (Test-Path (Join-Path $tempDir ".nexora\backups")) $true "Initializes backups folder"

    # Test 2: Project Metadata
    $meta = Get-NexoraProjectMetadata -ProjectRoot $tempDir
    $meta.projectName = "TestProject"
    Save-NexoraProjectMetadata -ProjectRoot $tempDir -Metadata $meta
    $reloaded = Get-NexoraProjectMetadata -ProjectRoot $tempDir
    Assert-Equal $reloaded.projectName "TestProject" "Saves and loads project.json"

    # Test 3: Analysis
    $analysis = [PSCustomObject]@{
        projectType = "Flutter Mobile App"
        detectedTechnologies = @("Dart")
        detectedFrameworks = @("Flutter")
        confidenceScores = @{ "Flutter" = 95 }
    }
    Save-NexoraAnalysis -ProjectRoot $tempDir -Analysis $analysis
    $reloadedAnalysis = Get-NexoraAnalysis -ProjectRoot $tempDir
    Assert-Equal $reloadedAnalysis.projectType "Flutter Mobile App" "Saves and loads analysis.json"

    # Test 4: History & Snapshots
    Add-NexoraProjectHistory -ProjectRoot $tempDir -Action "TEST_ACTION" -Details @{ foo = "bar" }
    $history = Get-NexoraProjectHistory -ProjectRoot $tempDir
    Assert-Equal ($history.Count -ge 1) $true "Appends events to history.json"

    $snapId = Create-NexoraSnapshot -ProjectRoot $tempDir -Reason "test"
    Assert-Equal (Test-Path (Join-Path $tempDir ".nexora\backups\$snapId")) $true "Creates snapshot folder"

    $restoreRes = Restore-NexoraSnapshot -ProjectRoot $tempDir -SnapshotId $snapId
    Assert-Equal $restoreRes.success $true "Restores snapshot"
}
finally {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
