# Sync-Version.ps1 - Synchronizes versions across version.json and Inno Setup installers

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$NexoraVersionFile = Join-Path $RepoRoot "nexora-version.json"
$AgpmVersionFile   = Join-Path $RepoRoot "agpm-version.json"
$NexoraInstaller   = Join-Path $RepoRoot "Nexora-Skills-Manager-Setup.iss"
$AgpmInstaller     = Join-Path $RepoRoot "Antigravity-Pro-Max-Setup.iss"

if (-not (Test-Path $NexoraVersionFile) -and -not (Test-Path $AgpmVersionFile)) {
    throw "Missing version files: nexora-version.json / agpm-version.json"
}

if (Test-Path $NexoraVersionFile) {
    $VersionData = Get-Content $NexoraVersionFile -Raw | ConvertFrom-Json
}
else {
    $VersionData = Get-Content $AgpmVersionFile -Raw | ConvertFrom-Json
}

$CoreVersion = [string]$VersionData.coreVersion
$SkillPackVersion = [string]$VersionData.skillPackVersion

if ($CoreVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "Invalid coreVersion '$CoreVersion'. Expected X.Y.Z"
}

$NormalizedJson = @{
    coreVersion      = $CoreVersion
    skillPackVersion = if ($SkillPackVersion) { $SkillPackVersion } else { $CoreVersion }
} | ConvertTo-Json

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText($NexoraVersionFile, $NormalizedJson + [Environment]::NewLine, $Utf8NoBom)
[System.IO.File]::WriteAllText($AgpmVersionFile, $NormalizedJson + [Environment]::NewLine, $Utf8NoBom)

# Update Nexora Installer
if (Test-Path $NexoraInstaller) {
    $Original = [System.IO.File]::ReadAllText($NexoraInstaller)
    $Updated = $Original -replace '#define MyAppVersion "[^"]+"', "#define MyAppVersion `"$CoreVersion`""
    $Updated = $Updated -replace 'OutputBaseFilename=Nexora-Skills-Manager-Setup-[^\r\n]+', "OutputBaseFilename=Nexora-Skills-Manager-Setup-$CoreVersion"
    if ($Updated -ne $Original) {
        [System.IO.File]::WriteAllText($NexoraInstaller, $Updated, $Utf8NoBom)
    }
}

# Update Legacy Installer
if (Test-Path $AgpmInstaller) {
    $Original = [System.IO.File]::ReadAllText($AgpmInstaller)
    $Updated = $Original -replace '#define MyAppVersion "[^"]+"', "#define MyAppVersion `"$CoreVersion`""
    $Updated = $Updated -replace 'OutputBaseFilename=Antigravity-Pro-Max-Setup-[^\r\n]+', "OutputBaseFilename=Antigravity-Pro-Max-Setup-$CoreVersion"
    if ($Updated -ne $Original) {
        [System.IO.File]::WriteAllText($AgpmInstaller, $Updated, $Utf8NoBom)
    }
}

Write-Host "Core version      : $CoreVersion" -ForegroundColor Green
Write-Host "Skill pack version: $($NormalizedJson | ConvertFrom-Json | Select-Object -ExpandProperty skillPackVersion)" -ForegroundColor Green
Write-Host "Installer Sync    : Complete" -ForegroundColor Green
