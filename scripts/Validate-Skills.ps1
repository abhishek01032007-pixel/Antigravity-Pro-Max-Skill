$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent

$StandardPacks = @(
    "Frontend-Pro-Max",
    "Backend-Pro-Max",
    "QA-Debug-Pro-Max",
    "Fullstack-Extras"
)

$FrameworkRoot = "Backend-Frameworks"

$Total = 0
$Valid = 0
$Invalid = @()

function Test-SkillFolder {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$DisplayName
    )

    $script:Total++

    $SkillFile = Join-Path $Path "SKILL.md"

    if (-not (Test-Path $SkillFile -PathType Leaf)) {
        $script:Invalid += "$DisplayName -> missing SKILL.md"
        return
    }

    $Length = (Get-Item $SkillFile).Length

    if ($Length -le 0) {
        $script:Invalid += "$DisplayName -> empty SKILL.md"
        return
    }

    $script:Valid++
    Write-Host "[OK] $DisplayName" -ForegroundColor Green
}

Write-Host "`n=== STANDARD SKILL PACKS ===" -ForegroundColor Cyan

foreach ($PackName in $StandardPacks) {

    $PackPath = Join-Path $RepoRoot $PackName

    if (-not (Test-Path $PackPath -PathType Container)) {
        $Invalid += "$PackName -> pack directory missing"
        continue
    }

    $SkillFolders = Get-ChildItem $PackPath -Directory | Sort-Object Name

    foreach ($SkillFolder in $SkillFolders) {
        Test-SkillFolder `
            -Path $SkillFolder.FullName `
            -DisplayName "$PackName/$($SkillFolder.Name)"
    }
}

Write-Host "`n=== BACKEND FRAMEWORK SKILLS ===" -ForegroundColor Cyan

$FrameworkPath = Join-Path $RepoRoot $FrameworkRoot

if (-not (Test-Path $FrameworkPath -PathType Container)) {
    $Invalid += "$FrameworkRoot -> pack directory missing"
}
else {
    $Frameworks = Get-ChildItem $FrameworkPath -Directory | Sort-Object Name

    foreach ($Framework in $Frameworks) {

        $FrameworkSkills = Get-ChildItem $Framework.FullName -Directory | Sort-Object Name

        foreach ($SkillFolder in $FrameworkSkills) {
            Test-SkillFolder `
                -Path $SkillFolder.FullName `
                -DisplayName "$FrameworkRoot/$($Framework.Name)/$($SkillFolder.Name)"
        }
    }
}

Write-Host "`n=== VALIDATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "Candidates checked : $Total"
Write-Host "Valid skills       : $Valid"
Write-Host "Invalid skills     : $($Invalid.Count)"

if ($Invalid.Count -gt 0) {

    Write-Host "`n=== INVALID ITEMS ===" -ForegroundColor Red

    foreach ($Item in $Invalid) {
        Write-Host "[ERROR] $Item" -ForegroundColor Red
    }

    exit 1
}

Write-Host "`nSkill validation PASSED." -ForegroundColor Green
exit 0
