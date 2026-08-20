$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$NexoraVersionFile = Join-Path $RepoRoot "nexora-version.json"
$AgpmVersionFile   = Join-Path $RepoRoot "agpm-version.json"
$InstallerFile     = Join-Path $RepoRoot "Antigravity-Pro-Max-Setup.iss"

if (-not (Test-Path $NexoraVersionFile) -and -not (Test-Path $AgpmVersionFile)) {
    throw "Missing version files: nexora-version.json / agpm-version.json"
}

if (-not (Test-Path $InstallerFile)) {
    throw "Missing installer file: $InstallerFile"
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

$Original = [System.IO.File]::ReadAllText($InstallerFile)

$Updated = $Original -replace `
    '#define MyAppVersion "[^"]+"', `
    "#define MyAppVersion `"$CoreVersion`""

$Updated = $Updated -replace `
    'OutputBaseFilename=Antigravity-Pro-Max-Setup-[^\r\n]+', `
    "OutputBaseFilename=Antigravity-Pro-Max-Setup-$CoreVersion"

if ($Updated -ne $Original) {
    [System.IO.File]::WriteAllText($InstallerFile, $Updated, $Utf8NoBom)
    Write-Host "Installer version updated." -ForegroundColor Green
}
else {
    Write-Host "Installer already matches core version. No file rewrite needed." -ForegroundColor Green
}

Write-Host "Core version      : $CoreVersion"
Write-Host "Skill pack version: $($NormalizedJson | ConvertFrom-Json | Select-Object -ExpandProperty skillPackVersion)"
Write-Host "Installer         : Antigravity-Pro-Max-Setup-$CoreVersion.exe"

