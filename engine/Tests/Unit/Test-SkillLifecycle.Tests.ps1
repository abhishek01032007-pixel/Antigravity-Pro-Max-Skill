# Test-SkillLifecycle.Tests.ps1 - Unit tests for Skill Lifecycle & Multi-Project Isolation

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RepoRoot = Split-Path $EngineRoot -Parent

# Source required modules
. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Utils\OutputUtils.ps1")
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $EngineRoot "Metadata\MetadataParser.ps1")
. (Join-Path $EngineRoot "Storage\GlobalSkillRegistry.ps1")
. (Join-Path $EngineRoot "Adapters\PlatformAdapter.ps1")
. (Join-Path $EngineRoot "Lifecycle\SkillLifecycleManager.ps1")

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

Write-Host "Running SkillLifecycle Unit Tests..." -ForegroundColor Cyan

$tempDirA = Join-Path $env:TEMP ("nexora_test_projA_" + [guid]::NewGuid().ToString("N"))
$tempDirB = Join-Path $env:TEMP ("nexora_test_projB_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDirA -Force | Out-Null
New-Item -ItemType Directory -Path $tempDirB -Force | Out-Null

try {
    # 1. Activate skill in Project A
    $actRes = Invoke-NexoraSkillActivationWorkflow -ProjectRoot $tempDirA -SkillIds @("flutter-build-responsive-layout") -Platforms @("antigravity")
    Assert-Equal $actRes.Success $true "Activates skill in Project A"
    Assert-Equal (Test-Path (Join-Path $tempDirA ".agents\skills\flutter-build-responsive-layout\SKILL.md")) $true "Deploys files into Project A"

    # 2. Check Project Isolation in Project B
    $skillsDataB = Get-NexoraProjectSkills -ProjectRoot $tempDirB
    Assert-Equal ($skillsDataB.activeSkills.Count -eq 0) $true "Project B remains clean and isolated"

    # 3. Deactivate skill in Project A
    $deactRes = Invoke-NexoraSkillDeactivationWorkflow -ProjectRoot $tempDirA -SkillIds @("flutter-build-responsive-layout") -Platforms @("antigravity")
    Assert-Equal $deactRes.Success $true "Deactivates skill in Project A"
    Assert-Equal (Test-Path (Join-Path $tempDirA ".agents\skills\flutter-build-responsive-layout")) $false "Prunes files from Project A"

    $skillsDataA = Get-NexoraProjectSkills -ProjectRoot $tempDirA
    Assert-Equal ($skillsDataA.activeSkills.Count -eq 0) $true "Project A active list is updated"
    Assert-Equal ($skillsDataA.deactivatedSkills.Count -ge 1) $true "Project A logs deactivated skill"
}
finally {
    Remove-Item -Path $tempDirA -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tempDirB -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
