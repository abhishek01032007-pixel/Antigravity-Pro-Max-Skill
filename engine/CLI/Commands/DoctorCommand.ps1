# DoctorCommand.ps1 - Health and diagnostics verification

function Invoke-DoctorCommand {
    param(
        [psobject]$ParsedArgs
    )

    Write-NexoraBanner
    Write-Host "Running Nexora Diagnostics..." -ForegroundColor Yellow
    Write-Host ""

    $issues = [System.Collections.Generic.List[string]]::new()

    # 1. Check Runtime Location
    $runtimeLoc = Find-NexoraRuntimeLocation
    if (Test-Path $runtimeLoc) {
        Write-NexoraSuccess "Runtime location found: $runtimeLoc"
    }
    else {
        $issues.Add("Runtime location is missing: $runtimeLoc")
        Write-NexoraError "Runtime location missing: $runtimeLoc"
    }

    # 2. Check Command Bin & PATH
    $cmdBin = Join-Path $env:LOCALAPPDATA "AntigravityProMax\bin"
    $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
    if ($userPath -like "*$cmdBin*") {
        Write-NexoraSuccess "Command bin is registered in User PATH ($cmdBin)"
    }
    else {
        Write-NexoraWarn "Command bin is not in User PATH ($cmdBin)"
    }

    # 3. Check Commands
    $nexoraCmd = Join-Path $cmdBin "nexora.cmd"
    $agpmCmd = Join-Path $cmdBin "agpm.cmd"
    if (Test-Path $nexoraCmd) {
        Write-NexoraSuccess "Command launcher present: nexora.cmd"
    }
    else {
        $issues.Add("nexora.cmd is missing in $cmdBin")
        Write-NexoraError "nexora.cmd is missing in $cmdBin"
    }

    if (Test-Path $agpmCmd) {
        Write-NexoraSuccess "Compatibility launcher present: agpm.cmd"
    }
    else {
        Write-NexoraWarn "agpm.cmd is missing in $cmdBin"
    }

    # 4. Check Skill Library
    $skills = Get-NexoraSkillRegistry
    if ($skills.Count -gt 0) {
        Write-NexoraSuccess "Skill library indexed: $($skills.Count) valid skills found"
    }
    else {
        $issues.Add("Skill library is empty or unindexed.")
        Write-NexoraError "Skill library contains 0 valid skills"
    }

    # 5. Version File Sanity
    $root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
    $vFile = Join-Path $root "nexora-version.json"
    if (Test-Path $vFile) {
        $vData = Get-Content $vFile -Raw | ConvertFrom-Json
        Write-NexoraSuccess "Core version: $($vData.coreVersion) | SkillPack version: $($vData.skillPackVersion)"
    }
    else {
        $issues.Add("nexora-version.json missing")
        Write-NexoraError "nexora-version.json is missing"
    }

    Write-Host ""
    if ($issues.Count -eq 0) {
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "       NEXORA HEALTH CHECK: ALL OK" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        return 0
    }
    else {
        Write-Host "==============================================" -ForegroundColor Red
        Write-Host "       NEXORA HEALTH CHECK: $($issues.Count) ISSUES FOUND" -ForegroundColor Red
        Write-Host "==============================================" -ForegroundColor Red
        return 1
    }
}
