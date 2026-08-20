param(
    [string]$BaseRef,
    [string]$HeadRef = "HEAD"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

$SkillPrefixes = @(
    "Frontend-Pro-Max/",
    "Backend-Pro-Max/",
    "QA-Debug-Pro-Max/",
    "Fullstack-Extras/",
    "Backend-Frameworks/"
)

$CorePrefixes = @(
    "Loaders/",
    "scripts/"
)

$CoreFiles = @(
    "Start-Nexora-Skills-Manager.bat",
    "Start-Antigravity-Pro-Max.bat",
    "Antigravity-Pro-Max-Setup.iss",
    "install.ps1",
    "setup.ps1",
    "nexora-version.json",
    "agpm-version.json"
)

if ($BaseRef) {
    $ChangedFiles = @(git diff --name-only $BaseRef $HeadRef)
}
else {
    $ChangedFiles = @(
        git status --porcelain |
        ForEach-Object {
            if ($_.Length -ge 4) {
                $_.Substring(3).Trim()
            }
        }
    )
}

$ChangedFiles = @(
    $ChangedFiles |
    Where-Object { $_ } |
    ForEach-Object { $_.Replace("\", "/") } |
    Sort-Object -Unique
)

$SkillChanged = $false
$CoreChanged = $false
$OtherChanged = $false

Write-Host "`n=== CHANGED FILES ===" -ForegroundColor Cyan

foreach ($File in $ChangedFiles) {

    Write-Host $File

    $IsSkill = $false
    foreach ($Prefix in $SkillPrefixes) {
        if ($File.StartsWith($Prefix)) {
            $IsSkill = $true
            $SkillChanged = $true
            break
        }
    }

    if ($IsSkill) {
        continue
    }

    $IsCore = $CoreFiles -contains $File

    if (-not $IsCore) {
        foreach ($Prefix in $CorePrefixes) {
            if ($File.StartsWith($Prefix)) {
                $IsCore = $true
                break
            }
        }
    }

    if ($IsCore) {
        $CoreChanged = $true
    }
    else {
        $OtherChanged = $true
    }
}

if ($SkillChanged -and $CoreChanged) {
    $ChangeType = "CORE_AND_SKILL_UPDATE"
}
elseif ($CoreChanged) {
    $ChangeType = "CORE_UPDATE"
}
elseif ($SkillChanged) {
    $ChangeType = "SKILL_UPDATE"
}
elseif ($OtherChanged) {
    $ChangeType = "DOCS_OR_OTHER"
}
else {
    $ChangeType = "NO_CHANGE"
}

Write-Host "`n=== CHANGE CLASSIFICATION ===" -ForegroundColor Cyan
Write-Host "Skill changed : $SkillChanged"
Write-Host "Core changed  : $CoreChanged"
Write-Host "Other changed : $OtherChanged"
Write-Host "Change type   : $ChangeType" -ForegroundColor Green

if ($env:GITHUB_OUTPUT) {
    "skill_changed=$($SkillChanged.ToString().ToLower())" >> $env:GITHUB_OUTPUT
    "core_changed=$($CoreChanged.ToString().ToLower())" >> $env:GITHUB_OUTPUT
    "other_changed=$($OtherChanged.ToString().ToLower())" >> $env:GITHUB_OUTPUT
    "change_type=$ChangeType" >> $env:GITHUB_OUTPUT
}

