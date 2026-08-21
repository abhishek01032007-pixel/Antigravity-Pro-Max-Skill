# Test-ProjectDetector.Tests.ps1 - Unit tests for Project Detection Engine

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
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

Write-Host "Running ProjectDetector Unit Tests..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("nexora_test_det_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # 1. Mock Flutter Project
    $pubspec = @"
name: my_flutter_app
description: A new Flutter project.
environment:
  sdk: '>=3.0.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
"@
    Set-Content -Path (Join-Path $tempDir "pubspec.yaml") -Value $pubspec -Encoding UTF8
    New-Item -ItemType Directory -Path (Join-Path $tempDir "android") -Force | Out-Null

    $res = Invoke-NexoraProjectScan -ProjectRoot $tempDir
    Assert-Equal $res.projectType "Flutter Mobile App" "Detects Flutter Mobile App project type"
    Assert-Equal ($res.detectedTechnologies -contains "Dart") $true "Detects Dart technology"
    Assert-Equal ($res.detectedFrameworks -contains "Flutter") $true "Detects Flutter framework"
    Assert-Equal ($res.detectedTechnologies -contains "Supabase") $true "Detects Supabase from dependencies"
    Assert-Equal ($res.confidenceScores["Flutter"] -ge 95) $true "Flutter confidence >= 95%"
}
finally {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
