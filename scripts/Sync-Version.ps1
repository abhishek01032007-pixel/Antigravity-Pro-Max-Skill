$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$VersionFile = Join-Path $RepoRoot "agpm-version.json"
$InstallerFile = Join-Path $RepoRoot "Antigravity-Pro-Max-Setup.iss"

if (-not (Test-Path $VersionFile)) {
    throw "Missing version file: $VersionFile"
}

if (-not (Test-Path $InstallerFile)) {
    throw "Missing installer file: $InstallerFile"
}

$VersionData = Get-Content $VersionFile -Raw | ConvertFrom-Json
$CoreVersion = [string]$VersionData.coreVersion

if ($CoreVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "Invalid coreVersion '$CoreVersion'. Expected X.Y.Z"
}

$Original = [System.IO.File]::ReadAllText($InstallerFile)

$Updated = $Original -replace `
    '#define MyAppVersion "[^"]+"', `
    "#define MyAppVersion `"$CoreVersion`""

$Updated = $Updated -replace `
    'OutputBaseFilename=Antigravity-Pro-Max-Setup-[^\r\n]+', `
    "OutputBaseFilename=Antigravity-Pro-Max-Setup-$CoreVersion"

if ($Updated -ne $Original) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($InstallerFile, $Updated, $Utf8NoBom)

    Write-Host "Installer version updated." -ForegroundColor Green
}
else {
    Write-Host "Installer already matches core version. No file rewrite needed." -ForegroundColor Green
}

Write-Host "Core version: $CoreVersion"
Write-Host "Installer: Antigravity-Pro-Max-Setup-$CoreVersion.exe"
