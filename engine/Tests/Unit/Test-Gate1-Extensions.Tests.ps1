# Test-Gate1-Extensions.Tests.ps1 - Complete Gate 1 Verification Test Suite (GAP 1, GAP 2, GAP 3)

$ErrorActionPreference = "Stop"
$engineRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# Source all engine layers
. (Join-Path $engineRoot "Utils\PathUtils.ps1")
. (Join-Path $engineRoot "Utils\OutputUtils.ps1")
. (Join-Path $engineRoot "Services\ProjectService.ps1")
. (Join-Path $engineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $engineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $engineRoot "Detection\ProjectDetector.ps1")
. (Join-Path $engineRoot "Metadata\MetadataParser.ps1")
. (Join-Path $engineRoot "Recommendations\RecommendationEngine.ps1")
. (Join-Path $engineRoot "Adapters\PlatformAdapter.ps1")
. (Join-Path $engineRoot "Lifecycle\SkillLifecycleManager.ps1")
. (Join-Path $engineRoot "Application\ProjectRegistryService.ps1")
. (Join-Path $engineRoot "Application\StatusManager.ps1")
. (Join-Path $engineRoot "Application\MultiProjectOrchestrator.ps1")
. (Join-Path $engineRoot "Application\NexoraApplicationService.ps1")

Write-Host "Running Gate 1 Backend Extension Unit Tests..." -ForegroundColor Cyan

$testTmp = Join-Path $env:TEMP ("NexoraGate1Test_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testTmp -Force | Out-Null

$passCount = 0
$totalCount = 0

function Assert-Test($condition, $name) {
    $script:totalCount++
    if ($condition) {
        $script:passCount++
        Write-Host "  [PASS] Test #$($script:totalCount): $name" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Test #$($script:totalCount): $name" -ForegroundColor Red
        throw "Assertion failed in Test #$($script:totalCount): $name"
    }
}

try {
    # Setup test projects
    $projA = Join-Path $testTmp "ProjectA"
    $projB = Join-Path $testTmp "ProjectB"
    $projC = Join-Path $testTmp "ProjectC"
    New-Item -ItemType Directory -Path $projA -Force | Out-Null
    New-Item -ItemType Directory -Path $projB -Force | Out-Null
    New-Item -ItemType Directory -Path $projC -Force | Out-Null

    # Create mock Flutter project A (Full Stack Mobile)
    Set-Content (Join-Path $projA "pubspec.yaml") @"
name: project_a
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
dev_dependencies:
  flutter_test:
    sdk: flutter
"@
    # Create mock Node backend project B
    Set-Content (Join-Path $projB "package.json") @"
{
  "name": "project-b",
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
"@
    # Create mock Python project C (for corrupted history test)
    Set-Content (Join-Path $projC "requirements.txt") @"
fastapi==0.100.0
pytest==7.4.0
"@

    # Register and analyze
    $resA = Add-NexoraApplicationProject -Path $projA -AutoAnalyze:$true
    $resB = Add-NexoraApplicationProject -Path $projB -AutoAnalyze:$true
    $resC = Add-NexoraApplicationProject -Path $projC -AutoAnalyze:$true
    $pIdA = $resA.projectId
    $pIdB = $resB.projectId
    $pIdC = $resC.projectId

    # =========================================================================
    # SECTION 1: RECOMMENDATION & WORKING CONTEXT MATRIX (10 TESTS: A - J)
    # =========================================================================

    # Test 1 (A): No working context - returns null & baseline score matches Phase 5
    $ctxA = Get-NexoraProjectWorkingContext -ProjectId $pIdA
    $baselineRecs = Get-NexoraApplicationRecommendations -ProjectId $pIdA
    $baseResp = $baselineRecs | Where-Object { $_.SkillId -eq "flutter-build-responsive-layout" }
    Assert-Test ($ctxA.success -and $null -eq $ctxA.workingMode -and $baseResp.Score -eq 40) "A. No working context initially returns null and outputs baseline Phase 5 recommendations"

    # Test 2 (B): Frontend + Mobile Application context
    $setFrontend = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode "frontend" -Target "mobile_application"
    $recsFrontend = Get-NexoraApplicationRecommendations -ProjectId $pIdA
    $boostedResp = $recsFrontend | Where-Object { $_.SkillId -eq "flutter-build-responsive-layout" }
    Assert-Test ($boostedResp.Score -eq 70 -and $boostedResp.MatchReason -like "*Frontend Development*" -and $boostedResp.MatchReason -like "*Mobile Application*") "B. Frontend + Mobile Application context applies +20 category and +10 target boost"

    # Test 3 (C): Backend + API / Service context
    $setBackend = Set-NexoraProjectWorkingContext -ProjectId $pIdB -WorkingMode "backend" -Target "api_service"
    $recsBackend = Get-NexoraApplicationRecommendations -ProjectId $pIdB
    $apiDesign = $recsBackend | Where-Object { $_.SkillId -eq "api-design-principles" }
    Assert-Test ($apiDesign.Score -ge 50 -and $apiDesign.MatchReason -like "*Backend Development*") "C. Backend + API / Service context boosts backend skills"

    # Test 4 (D): Full Stack + Web Application context
    $setFS = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode "fullstack" -Target "web_application"
    $recsFS = Get-NexoraApplicationRecommendations -ProjectId $pIdA
    $fsSkill = $recsFS | Where-Object { $_.SkillId -eq "flutter-setup-declarative-routing" }
    Assert-Test ($setFS.success -and $fsSkill -and $fsSkill.MatchReason -like "*Full Stack Development*") "D. Full Stack + Web Application context boosts full-stack compatible skills"

    # Test 5 (E): QA + Full Project context
    $setQA = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode "qa" -Target "full_project"
    $recsQA = Get-NexoraApplicationRecommendations -ProjectId $pIdA
    $qaSkill = $recsQA | Where-Object { $_.SkillId -eq "debug_issue" }
    Assert-Test ($qaSkill.Score -ge 50 -and $qaSkill.MatchReason -like "*QA / Debugging*") "E. QA + Full Project context boosts debugging and quality skills"

    # Test 6 (F): Invalid mode rejected
    $badMode = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode "invalid_mode_xyz"
    Assert-Test ($badMode.success -eq $false -and $badMode.message -like "*Invalid working mode*") "F. Invalid working mode is rejected with descriptive error"

    # Test 7 (G): Invalid target for selected mode rejected
    $badTarget = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode "frontend" -Target "api_service"
    Assert-Test ($badTarget.success -eq $false -and $badTarget.message -like "*Invalid target*") "G. Invalid target for selected working mode is rejected"

    # Test 8 (H): Detected project classification remains completely unchanged
    $profA = Get-NexoraApplicationProjectProfile -ProjectId $pIdA
    Assert-Test ($profA.project.primaryType -eq "mobile_application" -and $profA.project.developmentMode -eq "full_stack") "H. Detected project classification remains unchanged"

    # Test 9 (I): analysis.json remains completely unchanged
    $analysisA = Get-NexoraAnalysis -ProjectRoot $projA
    Assert-Test ($analysisA.projectType -eq "mobile_application" -and $analysisA.languages -contains "Dart") "I. analysis.json remains completely untouched"

    # Test 10 (J): Context survives reload & clearing context works cleanly
    $reloadedCtx = Get-NexoraProjectWorkingContext -ProjectId $pIdA
    Assert-Test ($reloadedCtx.workingMode -eq "qa" -and $reloadedCtx.target -eq "full_project") "J. Working context survives reload from project.json"

    # Test 11: Clear working context
    $cleared = Set-NexoraProjectWorkingContext -ProjectId $pIdA -WorkingMode $null -Target $null
    $clearedCtx = Get-NexoraProjectWorkingContext -ProjectId $pIdA
    Assert-Test ($cleared.success -and $null -eq $clearedCtx.workingMode -and $null -eq $clearedCtx.target) "Working context can be cleared to null without corrupting project.json"

    # =========================================================================
    # SECTION 2: GAP 2 GLOBAL ACTIVITY AGGREGATOR MATRIX (10 TESTS: 1 - 10)
    # =========================================================================

    # Setup specific history entries
    $fixedTimestamp = "2026-08-22T04:00:00.000Z"
    Add-NexoraProjectHistory -ProjectRoot $projA -Action "SKILL_ACTIVATED" -Details @{ skills = @("flutter-build-responsive-layout") }
    Add-NexoraProjectHistory -ProjectRoot $projB -Action "SKILL_ACTIVATED" -Details @{ skills = @("api-design-principles") }
    Add-NexoraProjectHistory -ProjectRoot $projA -Action "SKILL_DEACTIVATED" -Details @{ skillId = "old-skill" }

    # Test 12 (Activity 1): Single project history retrieval
    $actSingle = Get-NexoraApplicationActivityLogs -ProjectId $pIdA
    Assert-Test ($actSingle.Count -ge 2 -and ($actSingle | Where-Object { $_.projectId -ne $pIdA }).Count -eq 0) "Activity 1: Single project history returns only entries for specified ProjectId"

    # Test 13 (Activity 2): Multiple project aggregation
    $actMulti = Get-NexoraApplicationActivityLogs
    $pIds = @($actMulti | ForEach-Object { $_.projectId } | Select-Object -Unique)
    Assert-Test ($pIds -contains $pIdA -and $pIds -contains $pIdB) "Activity 2: Multi-project aggregation merges entries across all registered projects"

    # Test 14 (Activity 3): Newest-first ordering
    $isNewestFirst = $true
    for ($i = 0; $i -lt $actMulti.Count - 1; $i++) {
        if ([datetime]$actMulti[$i].timestamp -lt [datetime]$actMulti[$i+1].timestamp) {
            $isNewestFirst = $false
        }
    }
    Assert-Test ($isNewestFirst) "Activity 3: Global activity feed is sorted newest-first"

    # Test 15 (Activity 4): Deterministic equal-timestamp tie-breaking
    # Inject equal timestamp entries across Project A and Project B
    $histAFile = Join-Path $projA ".nexora\history.json"
    $histAData = Get-Content $histAFile -Raw | ConvertFrom-Json
    $tieEventA = [PSCustomObject]@{ eventId = "evt_tie_a"; timestamp = "2026-08-20T12:00:00.000Z"; action = "TIE_TEST_A"; details = @{} }
    $histAData.events += $tieEventA
    Set-Content $histAFile ($histAData | ConvertTo-Json -Depth 6) -Encoding UTF8

    $histBFile = Join-Path $projB ".nexora\history.json"
    $histBData = Get-Content $histBFile -Raw | ConvertFrom-Json
    $tieEventB = [PSCustomObject]@{ eventId = "evt_tie_b"; timestamp = "2026-08-20T12:00:00.000Z"; action = "TIE_TEST_B"; details = @{} }
    $histBData.events += $tieEventB
    Set-Content $histBFile ($histBData | ConvertTo-Json -Depth 6) -Encoding UTF8

    $actTie = Get-NexoraApplicationActivityLogs
    $tieEntries = @($actTie | Where-Object { $_.timestamp -eq "2026-08-20T12:00:00.000Z" })
    Assert-Test ($tieEntries.Count -eq 2 -and ($tieEntries[0].projectId -le $tieEntries[1].projectId)) "Activity 4: Equal timestamps break ties deterministically by projectId"

    # Test 16 (Activity 5): Duplicate removal
    $histAData.events += $tieEventA # Add duplicate tieEventA
    Set-Content $histAFile ($histAData | ConvertTo-Json -Depth 6) -Encoding UTF8
    $actDedup = Get-NexoraApplicationActivityLogs
    $dedupEntries = @($actDedup | Where-Object { $_.eventId -eq "evt_tie_a" })
    Assert-Test ($dedupEntries.Count -eq 1) "Activity 5: Duplicate events are deduplicated by stable eventId"

    # Test 17 (Activity 6): Missing project directory handled safely
    $fakeMissing = Join-Path $testTmp "MissingProject"
    Add-NexoraManagedProject -Path $fakeMissing | Out-Null
    $actWithMissing = Get-NexoraApplicationActivityLogs
    Assert-Test ($actWithMissing.Count -ge 3) "Activity 6: Missing project directory does not crash the global activity feed"

    # Test 18 (Activity 7): Inaccessible project path handled safely
    $inaccPath = Join-Path $testTmp "InaccessibleProj"
    New-Item -ItemType Directory -Path $inaccPath -Force | Out-Null
    Add-NexoraManagedProject -Path $inaccPath | Out-Null
    Remove-Item -Path $inaccPath -Force -Recurse # Simulate folder becoming inaccessible/deleted
    $actInacc = Get-NexoraApplicationActivityLogs
    Assert-Test ($actInacc.Count -ge 3) "Activity 7: Inaccessible project path does not crash the global activity feed"

    # Test 19 (Activity 8): Malformed history JSON tolerated safely
    $histCFile = Join-Path $projC ".nexora\history.json"
    Set-Content $histCFile "{ INVALID MALFORMED JSON !!" -Encoding UTF8
    $actMalformed = Get-NexoraApplicationActivityLogs
    Assert-Test ($actMalformed.Count -ge 3) "Activity 8: Malformed history file in one project is tolerated without failing the global feed"

    # Test 20 (Activity 9): ProjectId filtering returns exact match
    $actFilterB = Get-NexoraApplicationActivityLogs -ProjectId $pIdB
    $allB = $true
    foreach ($entry in $actFilterB) {
        if ($entry.projectId -ne $pIdB) { $allB = $false }
    }
    Assert-Test ($allB -and $actFilterB.Count -ge 1) "Activity 9: ProjectId filter restricts output to matching project only"

    # Test 21 (Activity 10): Limit parameter strictly enforced
    $actLimit1 = Get-NexoraApplicationActivityLogs -Limit 1
    $actLimit3 = Get-NexoraApplicationActivityLogs -Limit 3
    Assert-Test ($actLimit1.Count -eq 1 -and $actLimit3.Count -eq 3) "Activity 10: Limit parameter is strictly enforced"

    # =========================================================================
    # SECTION 3: DOCTOR 6-CATEGORY MAPPING TESTS
    # =========================================================================

    # Test 22: Doctor returns exactly 6 categories
    $docResult = Invoke-NexoraApplicationDoctor -Repair:$false
    Assert-Test ($docResult.checks.Count -eq 6) "Doctor returns exactly 6 structured diagnostic categories"

    # Test 23: All 6 stable Category IDs present
    $expectedIds = @("core_engine", "skill_library", "cli", "project_registry", "installation_metadata", "platform_adapters")
    $actualIds = @($docResult.checks | ForEach-Object { $_.id })
    $allIdsPresent = $true
    foreach ($id in $expectedIds) {
        if ($actualIds -notcontains $id) { $allIdsPresent = $false }
    }
    Assert-Test ($allIdsPresent) "Doctor response contains all 6 stable IDs (core_engine, skill_library, cli, project_registry, installation_metadata, platform_adapters)"

    # Test 24: Doctor items contain id, label, status, detail, repairable
    $firstCheck = $docResult.checks[0]
    Assert-Test ($firstCheck.id -and $firstCheck.label -and $firstCheck.status -and $firstCheck.detail -and $firstCheck.PSObject.Properties["repairable"]) "Doctor checks contain id, label, status, detail, repairable"

    # Test 25: Read-only Doctor does NOT execute repairs
    Assert-Test ($docResult.repairsApplied.Count -eq 0) "doctor.run (-Repair:`$false) is strictly read-only and does not mutate system"

    # Test 26: Explicit Doctor repair executes separately
    $repResult = Invoke-NexoraApplicationDoctor -Repair:$true
    Assert-Test ($repResult.checks.Count -eq 6) "doctor.repair (-Repair:`$true) executes explicitly and preserves 6-category structure"

} finally {
    if (Test-Path $testTmp) {
        Remove-Item -Path $testTmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Result: $passCount/$totalCount Gate 1 unit tests passed." -ForegroundColor Cyan
if ($passCount -ne $totalCount) { exit 1 }
