param(
    [Parameter(Position=0)]
    [ValidateSet("frontend","backend","qa","fullstack","default","status")]
    [string]$Mode = "status"
)

$LibraryRoot = Split-Path $PSScriptRoot -Parent

$FrontendRoot  = Join-Path $LibraryRoot "Frontend-Pro-Max"
$BackendRoot   = Join-Path $LibraryRoot "Backend-Pro-Max"
$QARoot        = Join-Path $LibraryRoot "QA-Debug-Pro-Max"
$FullstackRoot = Join-Path $LibraryRoot "Fullstack-Extras"

$PythonRoot = Join-Path $LibraryRoot "Backend-Frameworks\Python"
$NodeRoot   = Join-Path $LibraryRoot "Backend-Frameworks\NodeJS"

$ProjectRoot = (Get-Location).Path
$AgentsRoot  = Join-Path $ProjectRoot ".agents"
$SkillRoot   = Join-Path $AgentsRoot "skills"
$StateFile   = Join-Path $ProjectRoot ".agy-skills.json"

function Ensure-SkillRoot {
    if (-not (Test-Path $SkillRoot)) {
        New-Item -ItemType Directory -Path $SkillRoot -Force | Out-Null
    }
}

function Get-PackSkillNames($PackPath) {
    if (-not (Test-Path $PackPath)) {
        return @()
    }

    return @(
        Get-ChildItem $PackPath -Directory -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Name
    )
}

function Install-Pack($PackPath) {
    Ensure-SkillRoot

    if (-not (Test-Path $PackPath)) {
        Write-Host "[MISSING PACK] $PackPath" -ForegroundColor Red
        return
    }

    Get-ChildItem $PackPath -Directory |
    ForEach-Object {

        $skillMd = Join-Path $_.FullName "SKILL.md"

        if (-not (Test-Path $skillMd)) {
            Write-Host "[SKIP INVALID] $($_.Name)" -ForegroundColor Red
            return
        }

        $target = Join-Path $SkillRoot $_.Name

        if (Test-Path $target) {
            Remove-Item $target -Recurse -Force
        }

        Copy-Item $_.FullName $target -Recurse -Force
        Write-Host "[ACTIVE] $($_.Name)" -ForegroundColor Green
    }
}

function Remove-Pack($PackPath) {

    foreach ($name in (Get-PackSkillNames $PackPath)) {

        $target = Join-Path $SkillRoot $name

        if (Test-Path $target) {
            Remove-Item $target -Recurse -Force
        }
    }
}

function Remove-AllManagedSkills {

    $managedPacks = @(
        $FrontendRoot,
        $BackendRoot,
        $QARoot,
        $FullstackRoot,
        $PythonRoot,
        $NodeRoot
    )

    foreach ($pack in $managedPacks) {
        Remove-Pack $pack
    }
}

function Save-State(
    [bool]$Frontend,
    [bool]$Backend,
    [bool]$QA,
    [bool]$FullstackExtras,
    [string]$Framework,
    [string]$ModeName
) {

    $state = @{
        mode             = $ModeName
        frontend         = $Frontend
        backend          = $Backend
        qa               = $QA
        fullstackExtras  = $FullstackExtras
        framework        = $Framework
        updated          = (Get-Date).ToString("s")
    }

    $state |
        ConvertTo-Json |
        Set-Content $StateFile -Encoding UTF8
}

function Get-State {

    if (Test-Path $StateFile) {
        try {
            return Get-Content $StateFile -Raw | ConvertFrom-Json
        }
        catch {}
    }

    return [PSCustomObject]@{
        mode            = "default"
        frontend        = $false
        backend         = $false
        qa              = $false
        fullstackExtras = $false
        framework       = "none"
    }
}

function Ask-QA {

    Write-Host ""
    Write-Host "Add QA-Debug-Pro-Max for this project?" -ForegroundColor Cyan
    Write-Host "[Y] Yes"
    Write-Host "[N] No"
    Write-Host "[C] Cancel"

    while ($true) {

        $choice = (Read-Host "Choice").ToUpper()

        switch ($choice) {
            "Y" { return $true }
            "N" { return $false }
            "C" { return $null }
            default {
                Write-Host "Enter Y, N, or C." -ForegroundColor Yellow
            }
        }
    }
}

function Ask-BackendFramework {

    Write-Host ""
    Write-Host "Choose optional backend framework:" -ForegroundColor Cyan
    Write-Host "[1] Generic / None"
    Write-Host "[2] Python / FastAPI"
    Write-Host "[3] NodeJS"
    Write-Host "[C] Cancel"

    while ($true) {

        $choice = (Read-Host "Selection").ToUpper()

        switch ($choice) {
            "1" { return "none" }
            "2" { return "python-fastapi" }
            "3" { return "nodejs" }
            "C" { return $null }
            default {
                Write-Host "Enter 1, 2, 3, or C." -ForegroundColor Yellow
            }
        }
    }
}

function Install-Framework($Framework) {

    switch ($Framework) {
        "python-fastapi" { Install-Pack $PythonRoot }
        "nodejs"         { Install-Pack $NodeRoot }
    }
}

function Show-Status {

    $state = Get-State

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "       ANTIGRAVITY SKILL STATUS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Project:"
    Write-Host $ProjectRoot -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Frontend Pro Max   :" $(if ($state.frontend) {"ACTIVE"} else {"OFF"})
    Write-Host "Backend Pro Max    :" $(if ($state.backend) {"ACTIVE"} else {"OFF"})
    Write-Host "QA / Debug Pro Max :" $(if ($state.qa) {"ACTIVE"} else {"OFF"})
    Write-Host "Fullstack Extras   :" $(if ($state.fullstackExtras) {"ACTIVE"} else {"OFF"})
    Write-Host "Backend Framework  :" $state.framework

    Write-Host ""
    Write-Host "Mode:"
    Write-Host $state.mode -ForegroundColor Green

    $valid = 0
    $invalid = 0

    if (Test-Path $SkillRoot) {

        $skills = @(Get-ChildItem $SkillRoot -Directory -ErrorAction SilentlyContinue)

        foreach ($skill in $skills) {

            if (Test-Path (Join-Path $skill.FullName "SKILL.md")) {
                $valid++
            }
            else {
                $invalid++
            }
        }

        Write-Host ""
        Write-Host "Project skill folders : $($skills.Count)"
        Write-Host "Valid SKILL.md        : $valid"
        Write-Host "Invalid               : $invalid"
        Write-Host "Skill location        : $SkillRoot"
    }
    else {
        Write-Host ""
        Write-Host "Project skill folders : 0"
    }

    Write-Host "========================================"
}

switch ($Mode) {

    "frontend" {

        $qaChoice = Ask-QA
        if ($null -eq $qaChoice) {
            Write-Host "Cancelled."
            exit
        }

        Remove-AllManagedSkills

        Install-Pack $FrontendRoot

        if ($qaChoice) {
            Install-Pack $QARoot
        }

        $modeName = if ($qaChoice) {
            "FRONTEND + QA PRO MAX"
        }
        else {
            "FRONTEND PRO MAX"
        }

        Save-State $true $false $qaChoice $false "none" $modeName
        Show-Status
    }

    "backend" {

        $qaChoice = Ask-QA
        if ($null -eq $qaChoice) {
            Write-Host "Cancelled."
            exit
        }

        $framework = Ask-BackendFramework
        if ($null -eq $framework) {
            Write-Host "Cancelled."
            exit
        }

        Remove-AllManagedSkills

        Install-Pack $BackendRoot
        Install-Framework $framework

        if ($qaChoice) {
            Install-Pack $QARoot
        }

        $modeName = if ($qaChoice) {
            "BACKEND + QA PRO MAX"
        }
        else {
            "BACKEND PRO MAX"
        }

        Save-State $false $true $qaChoice $false $framework $modeName
        Show-Status
    }

    "qa" {

        Remove-AllManagedSkills

        Install-Pack $QARoot

        Save-State $false $false $true $false "none" "QA / DEBUG PRO MAX"
        Show-Status
    }

    "fullstack" {

        $framework = Ask-BackendFramework
        if ($null -eq $framework) {
            Write-Host "Cancelled."
            exit
        }

        Remove-AllManagedSkills

        Install-Pack $FrontendRoot
        Install-Pack $BackendRoot
        Install-Pack $QARoot
        Install-Pack $FullstackRoot
        Install-Framework $framework

        Save-State $true $true $true $true $framework "FULL STACK PRO MAX"
        Show-Status
    }

    "default" {

        Remove-AllManagedSkills

        Save-State $false $false $false $false "none" "DEFAULT ANTIGRAVITY"
        Show-Status
    }

    "status" {

        Show-Status
    }
}

