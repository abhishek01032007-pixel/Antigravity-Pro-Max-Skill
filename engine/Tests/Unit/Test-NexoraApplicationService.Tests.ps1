# Test-NexoraApplicationService.Tests.ps1 - Unit tests for unified application service facade

$ErrorActionPreference = "Stop"
$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

# Source all engine layers
. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Utils\OutputUtils.ps1")
. (Join-Path $EngineRoot "Services\ProjectService.ps1")
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $EngineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $EngineRoot "Detection\ProjectDetector.ps1")
. (Join-Path $EngineRoot "Metadata\MetadataParser.ps1")
. (Join-Path $EngineRoot "Recommendations\RecommendationEngine.ps1")
. (Join-Path $EngineRoot "Adapters\PlatformAdapter.ps1")
. (Join-Path $EngineRoot "Lifecycle\SkillLifecycleManager.ps1")
. (Join-Path $EngineRoot "Application\ProjectRegistryService.ps1")
. (Join-Path $EngineRoot "Application\StatusManager.ps1")
. (Join-Path $EngineRoot "Application\MultiProjectOrchestrator.ps1")
. (Join-Path $EngineRoot "Application\NexoraApplicationService.ps1")

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

Write-Host "Running NexoraApplicationService Unit Tests..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("nexora_app_facade_test_" + [guid]::NewGuid().ToString("N"))
$origLocalApp = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $tempDir

try {
    $testFlutterApp = Join-Path $tempDir "MyFlutterApp"
    New-Item -ItemType Directory -Path $testFlutterApp -Force | Out-Null
    Set-Content -Path (Join-Path $testFlutterApp "pubspec.yaml") -Value "name: my_flutter_app`nflutter:`n  sdk: flutter`ndependencies:`n  supabase_flutter: ^2.0.0" -Encoding UTF8

    # 1. Startup & Initialization
    $state = Initialize-NexoraApplicationState
    Assert-Equal $state.success $true "Initializes application state successfully"
    Assert-Equal $state.engineStatus "ready" "Engine status is ready after initialization"
    Assert-Equal ($null -ne $state.status) $true "Returns structured status object"
    Assert-Equal ($null -ne $state.updateStatus) $true "Returns updateStatus object"

    # 2. Add Project with Auto-Analyze
    $resAdd = Add-NexoraApplicationProject -Path $testFlutterApp -Name "My Flutter App" -AutoAnalyze
    Assert-Equal $resAdd.success $true "Adds project via application facade"
    Assert-Equal ($null -ne $resAdd.projectId) $true "Returns projectId from add operation"

    # 3. Project Profile
    $profile = Get-NexoraApplicationProjectProfile -ProjectId $resAdd.projectId
    Assert-Equal $profile.success $true "Retrieves project profile via facade"
    Assert-Equal $profile.project.name "My Flutter App" "Profile contains project name"
    Assert-Equal $profile.analysis.projectType "mobile_application" "Profile contains projectType classification"
    Assert-Equal $profile.analysis.developmentMode "full_stack" "Profile contains developmentMode classification"

    # 4. Recommendations
    $recs = Get-NexoraApplicationRecommendations -ProjectId $resAdd.projectId
    Assert-Equal ($recs.Count -gt 0) $true "Retrieves recommendations via facade"
    $recIds = @($recs | ForEach-Object { $_.SkillId })
    Assert-Equal ($recIds -contains "flutter-build-responsive-layout") $true "Recommendations include flutter-build-responsive-layout"

    # 5. Available Skills (48 skills)
    $available = Get-NexoraApplicationAvailableSkills
    Assert-Equal ($available.Count -ge 48) $true "Available skills count >= 48"

    # 6. Skill Activation via Facade
    $actRes = Invoke-NexoraApplicationActivateSkills -ProjectId $resAdd.projectId -SkillIds @("flutter-build-responsive-layout", "debug_issue")
    Assert-Equal $actRes.Success $true "Activates skills via facade"
    Assert-Equal $actRes.ActivatedCount 2 "ActivatedCount is 2"

    $activeSkills = Get-NexoraApplicationActiveSkills -ProjectId $resAdd.projectId
    Assert-Equal ($activeSkills -contains "flutter-build-responsive-layout") $true "Active skills include flutter-build-responsive-layout"
    Assert-Equal ($activeSkills -contains "debug_issue") $true "Active skills include debug_issue"

    # 7. Skill Deactivation via Facade
    $deactRes = Invoke-NexoraApplicationDeactivateSkill -ProjectId $resAdd.projectId -SkillId "flutter-build-responsive-layout"
    Assert-Equal $deactRes.Success $true "Deactivates skill via facade"

    $activeAfter = Get-NexoraApplicationActiveSkills -ProjectId $resAdd.projectId
    Assert-Equal ($activeAfter -contains "flutter-build-responsive-layout") $false "Deactivated skill removed from active list"
    Assert-Equal ($activeAfter -contains "debug_issue") $true "Other active skill retained"

    # 8. Cross-Project Usage Query via Facade
    $usage = @(Get-NexoraApplicationSkillUsage -SkillId "debug_issue")
    Assert-Equal ($usage.Count -ge 1) $true "Queries skill usage across projects"

    # 9. Global Removal Preview via Facade
    $preview = Get-NexoraApplicationGlobalRemovalPreview -SkillId "debug_issue"
    Assert-Equal $preview.operation "remove_skill_all_projects" "Preview operation is remove_skill_all_projects"
    Assert-Equal ($preview.confirmationToken -like "tok_*") $true "Preview contains bound confirmation token"

    # 10. Global Removal Execution via Facade
    $remRes = Invoke-NexoraApplicationGlobalRemoval -SkillId "debug_issue" -ConfirmationToken $preview.confirmationToken
    Assert-Equal $remRes.success $true "Executes global skill removal via facade"
    Assert-Equal ($remRes.successCount -ge 1) $true "Global removal successCount >= 1"

    # 11. System Status, Updates, and Doctor Diagnostics via Facade
    $sysStatus = Get-NexoraApplicationStatus
    Assert-Equal $sysStatus.engineStatus "ready" "Application system status is ready"

    $updateStatus = Get-NexoraApplicationUpdateStatus
    Assert-Equal $updateStatus.currentVersion "1.0.0" "Update status contains current version 1.0.0"

    $doc = Invoke-NexoraApplicationDoctor
    Assert-Equal ($doc.checks.Count -eq 6) $true "Doctor returns 6 structured diagnostic checks"
}
finally {
    $env:LOCALAPPDATA = $origLocalApp
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
