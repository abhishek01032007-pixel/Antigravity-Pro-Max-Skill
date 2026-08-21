# Test-ProjectRegistryService.Tests.ps1 - Unit tests for global managed project registry

$ErrorActionPreference = "Stop"
$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Application\ProjectRegistryService.ps1")

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

Write-Host "Running ProjectRegistryService Unit Tests..." -ForegroundColor Cyan

$tempLocalApp = Join-Path $env:TEMP ("nexora_reg_test_" + [guid]::NewGuid().ToString("N"))
$origLocalApp = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $tempLocalApp

try {
    $testProj1 = Join-Path $tempLocalApp "projects\ProjectOne"
    $testProj2 = Join-Path $tempLocalApp "projects\ProjectTwo"
    New-Item -ItemType Directory -Path $testProj1 -Force | Out-Null
    New-Item -ItemType Directory -Path $testProj2 -Force | Out-Null

    # 1. Add Valid Project
    $res1 = Add-NexoraManagedProject -Path $testProj1 -Name "Project One"
    Assert-Equal $res1.success $true "Adds valid project successfully"
    Assert-Equal ($res1.projectId -like "proj_*") $true "Generates proj_ formatted ID"

    # 2. Stable ID Generation
    $id1 = New-NexoraProjectId -CanonicalPath $testProj1
    $id2 = New-NexoraProjectId -CanonicalPath $testProj1
    Assert-Equal ($id1 -eq $id2) $true "Generates identical deterministic ID for same path"

    # 3. Deduplication
    $resDup = Add-NexoraManagedProject -Path $testProj1
    Assert-Equal $resDup.success $true "Handles existing project gracefully"
    Assert-Equal ($resDup.message -like "*already registered*") $true "Identifies duplicate registration"
    $allProjects = Get-NexoraManagedProjects
    Assert-Equal $allProjects.Count 1 "Does not duplicate registry entry"

    # 4. Reject Non-Existent Path
    $fakePath = Join-Path $tempLocalApp "nonexistent\dir"
    $resFake = Add-NexoraManagedProject -Path $fakePath
    Assert-Equal $resFake.success $false "Rejects non-existent path"

    # 5. Add Second Project & List
    $res2 = Add-NexoraManagedProject -Path $testProj2 -Name "Project Two"
    $allProjects = Get-NexoraManagedProjects
    Assert-Equal $allProjects.Count 2 "Lists all registered projects"

    # 6. Find By ID
    $found = Find-NexoraManagedProjectById -ProjectId $res1.projectId
    Assert-Equal ($null -ne $found) $true "Finds project by ID"
    Assert-Equal $found.name "Project One" "Found project has correct name"

    # 7. Safe Missing Path Handling
    $tempMissing = Join-Path $tempLocalApp "projects\TempProj"
    New-Item -ItemType Directory -Path $tempMissing -Force | Out-Null
    $resMissing = Add-NexoraManagedProject -Path $tempMissing -Name "Temp Project"
    Remove-Item $tempMissing -Recurse -Force | Out-Null
    $foundMissing = Find-NexoraManagedProjectById -ProjectId $resMissing.projectId
    Assert-Equal $foundMissing.pathExists $false "Detects path missing"
    Assert-Equal $foundMissing.status "missing" "Sets status to missing safely"

    # 8. Safe Non-Destructive Removal
    $targetPath = $testProj1
    $resRem = Remove-NexoraManagedProject -ProjectId $res1.projectId
    Assert-Equal $resRem.success $true "Removes project from registry"
    $remaining = Get-NexoraManagedProjects
    Assert-Equal (@($remaining | Where-Object { $_.id -eq $res1.projectId }).Count -eq 0) $true "Project removed from registry list"
    Assert-Equal (Test-Path $targetPath) $true "Project source files remain 100% untouched on disk"

    # 9. Update Classification
    $updated = Update-NexoraManagedProjectClassification -ProjectId $res2.projectId -PrimaryType "mobile_application" -DevelopmentMode "full_stack"
    Assert-Equal $updated $true "Updates classification in registry"
    $reloaded = Find-NexoraManagedProjectById -ProjectId $res2.projectId
    Assert-Equal $reloaded.primaryType "mobile_application" "Persists primaryType in registry"
    Assert-Equal $reloaded.developmentMode "full_stack" "Persists developmentMode in registry"
}
finally {
    $env:LOCALAPPDATA = $origLocalApp
    Remove-Item -Path $tempLocalApp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
