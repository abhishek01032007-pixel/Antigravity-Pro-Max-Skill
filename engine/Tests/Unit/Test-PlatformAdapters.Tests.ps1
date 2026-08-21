# Test-PlatformAdapters.Tests.ps1 - Unit tests for Multi-Platform Adapters

$EngineRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RepoRoot = Split-Path $EngineRoot -Parent
. (Join-Path $EngineRoot "Storage\SkillRegistry.ps1")
. (Join-Path $EngineRoot "Adapters\PlatformAdapter.ps1")

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

Write-Host "Running PlatformAdapters Unit Tests..." -ForegroundColor Cyan

$tempDir = Join-Path $env:TEMP ("nexora_test_adapt_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    $allSkills = Get-NexoraSkillRegistry -LibraryRoot $RepoRoot
    $testSkills = @($allSkills | Select-Object -First 2)

    # 1. Test Antigravity Adapter
    $antigravityRes = Deploy-AntigravitySkills -ProjectRoot $tempDir -SkillObjects $testSkills
    Assert-Equal (Test-Path (Join-Path $tempDir ".agents\skills\$($testSkills[0].Id)\SKILL.md")) $true "Deploys to Antigravity .agents/skills/"

    # 2. Test Cursor Adapter
    $cursorRes = Deploy-CursorSkills -ProjectRoot $tempDir -SkillObjects $testSkills
    Assert-Equal (Test-Path (Join-Path $tempDir ".cursor\rules\$($testSkills[0].Id).mdc")) $true "Deploys to Cursor .cursor/rules/"

    # 3. Test Copilot Adapter
    $copilotRes = Deploy-CopilotSkills -ProjectRoot $tempDir -SkillObjects $testSkills
    Assert-Equal (Test-Path (Join-Path $tempDir ".github\copilot-instructions.md")) $true "Deploys to GitHub Copilot instructions"
}
finally {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Result: $passed/$total tests passed." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
