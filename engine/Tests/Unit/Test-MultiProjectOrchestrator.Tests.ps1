# Test-MultiProjectOrchestrator.Tests.ps1 - Unit tests for cross-project queries and safe multi-project removal

$ErrorActionPreference = "Stop"
$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $EngineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $EngineRoot "Adapters\PlatformAdapter.ps1")
. (Join-Path $EngineRoot "Lifecycle\SkillRemovalService.ps1")
. (Join-Path $EngineRoot "Application\ProjectRegistryService.ps1")
. (Join-Path $EngineRoot "Application\MultiProjectOrchestrator.ps1")

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

Write-Host "Running MultiProjectOrchestrator Unit Tests..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("nexora_multi_test_" + [guid]::NewGuid().ToString("N"))
$origLocalApp = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $tempDir

try {
    $projA = Join-Path $tempDir "ProjectA"
    $projB = Join-Path $tempDir "ProjectB"
    $projC = Join-Path $tempDir "ProjectC"

    New-Item -ItemType Directory -Path $projA -Force | Out-Null
    New-Item -ItemType Directory -Path $projB -Force | Out-Null
    New-Item -ItemType Directory -Path $projC -Force | Out-Null

    # Register all 3 projects
    $resA = Add-NexoraManagedProject -Path $projA -Name "Project A"
    $resB = Add-NexoraManagedProject -Path $projB -Name "Project B"
    $resC = Add-NexoraManagedProject -Path $projC -Name "Project C"

    # Initialize project memory with active skills
    Initialize-NexoraProjectDirectory -ProjectRoot $projA | Out-Null
    Save-NexoraProjectSkills -ProjectRoot $projA -SkillsData ([PSCustomObject]@{
        activeSkills = @("flutter-build-responsive-layout", "debug_issue")
    })

    Initialize-NexoraProjectDirectory -ProjectRoot $projB | Out-Null
    Save-NexoraProjectSkills -ProjectRoot $projB -SkillsData ([PSCustomObject]@{
        activeSkills = @("flutter-build-responsive-layout")
    })

    Initialize-NexoraProjectDirectory -ProjectRoot $projC | Out-Null
    Save-NexoraProjectSkills -ProjectRoot $projC -SkillsData ([PSCustomObject]@{
        activeSkills = @("debug_issue")
    })

    # 1. Cross-Project Usage Query
    $usage = Get-NexoraCrossProjectSkillUsage -SkillId "flutter-build-responsive-layout"
    Assert-Equal $usage.Count 2 "Finds all managed projects using a specific skill"
    $names = @($usage | ForEach-Object { $_.name })
    Assert-Equal ($names -contains "Project A") $true "Includes Project A in usage"
    Assert-Equal ($names -contains "Project B") $true "Includes Project B in usage"
    Assert-Equal ($names -contains "Project C") $false "Excludes Project C from usage"

    $usageNone = Get-NexoraCrossProjectSkillUsage -SkillId "nonexistent-skill"
    Assert-Equal $usageNone.Count 0 "Returns empty array if no projects use skill"

    # 2. Impact Preview & Token Generation
    $preview = Get-NexoraGlobalSkillRemovalPreview -SkillId "flutter-build-responsive-layout"
    Assert-Equal $preview.operation "remove_skill_all_projects" "Preview operation is remove_skill_all_projects"
    Assert-Equal $preview.skillId "flutter-build-responsive-layout" "Preview has correct skillId"
    Assert-Equal $preview.affectedCount 2 "Preview affectedCount is 2"
    Assert-Equal $preview.destructive $true "Preview destructive is true"
    Assert-Equal $preview.requiresConfirmation $true "Preview requiresConfirmation is true"
    Assert-Equal ($preview.confirmationToken -like "tok_*") $true "Preview generates tok_ token"

    # 3. Token Validation: Reject Invalid Token
    $badTokenRes = Invoke-NexoraGlobalSkillRemoval -SkillId "flutter-build-responsive-layout" -ConfirmationToken "tok_invalid12345"
    Assert-Equal $badTokenRes.success $false "Rejects invalid confirmation token"

    # 4. Token Validation: Reject Skill Mismatch
    $previewMismatch = Get-NexoraGlobalSkillRemovalPreview -SkillId "flutter-build-responsive-layout"
    $mismatchRes = Invoke-NexoraGlobalSkillRemoval -SkillId "debug_issue" -ConfirmationToken $previewMismatch.confirmationToken
    Assert-Equal $mismatchRes.success $false "Rejects token when skillId does not match bound skill"

    # 5. Safe Execution with Valid Token
    $previewValid = Get-NexoraGlobalSkillRemovalPreview -SkillId "flutter-build-responsive-layout"
    $execRes = Invoke-NexoraGlobalSkillRemoval -SkillId "flutter-build-responsive-layout" -ConfirmationToken $previewValid.confirmationToken
    Assert-Equal $execRes.success $true "Executes global removal successfully"
    Assert-Equal $execRes.successCount 2 "Removal successCount is 2"

    # Verify removal in Project A
    $skillsA = Get-NexoraProjectSkills -ProjectRoot $projA
    Assert-Equal ($skillsA.activeSkills -contains "flutter-build-responsive-layout") $false "flutter-build-responsive-layout removed from Project A"
    Assert-Equal ($skillsA.activeSkills -contains "debug_issue") $true "debug_issue remains in Project A"

    # Verify removal in Project B
    $skillsB = Get-NexoraProjectSkills -ProjectRoot $projB
    Assert-Equal ($skillsB.activeSkills -contains "flutter-build-responsive-layout") $false "flutter-build-responsive-layout removed from Project B"

    # 6. Replay Protection
    $previewReplay = Get-NexoraGlobalSkillRemovalPreview -SkillId "debug_issue"
    $replayToken = $previewReplay.confirmationToken
    $firstExec = Invoke-NexoraGlobalSkillRemoval -SkillId "debug_issue" -ConfirmationToken $replayToken
    Assert-Equal $firstExec.success $true "First execution with token succeeds"
    $secondExec = Invoke-NexoraGlobalSkillRemoval -SkillId "debug_issue" -ConfirmationToken $replayToken
    Assert-Equal $secondExec.success $false "Replay execution with consumed token is rejected"
}
finally {
    $env:LOCALAPPDATA = $origLocalApp
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
