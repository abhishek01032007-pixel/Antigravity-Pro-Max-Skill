$ErrorActionPreference = "Stop"

$installPath = "C:\Antigravity Pro Max Skill"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         NEXORA SKILLS MANAGER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Preparing installation..." -ForegroundColor Yellow

if (-not (Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
}

Write-Host "      OK" -ForegroundColor Green


Write-Host "[2/4] Installing Nexora Skills Manager..." -ForegroundColor Yellow

Get-ChildItem $PSScriptRoot -Force |
Where-Object {
    $_.Name -ne "install.ps1"
} |
ForEach-Object {
    Copy-Item $_.FullName $installPath -Recurse -Force
}

Write-Host "      OK" -ForegroundColor Green


Write-Host "[3/4] Verifying installation..." -ForegroundColor Yellow

$required = @(
    "Frontend-Pro-Max",
    "Backend-Pro-Max",
    "Backend-Frameworks",
    "QA-Debug-Pro-Max",
    "Fullstack-Extras",
    "Loaders",
    "engine",
    "Start-Nexora-Skills-Manager.bat",
    "Start-Antigravity-Pro-Max.bat",
    "README.md",
    "THIRD_PARTY_NOTICES.md",
    "third-party-licenses"
)

$failed = $false

foreach ($item in $required) {

    $path = Join-Path $installPath $item

    if (-not (Test-Path $path)) {
        Write-Host "      MISSING: $item" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    throw "Installation verification failed."
}

Write-Host "      All required files verified." -ForegroundColor Green


Write-Host "[4/4] Installation complete." -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "   NEXORA SKILLS MANAGER INSTALLED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Installed to:" -ForegroundColor White
Write-Host "C:\Antigravity Pro Max Skill" -ForegroundColor Cyan
Write-Host ""

Write-Host "Nexora Skills Manager is ready to use." -ForegroundColor Green
Write-Host ""
Write-Host "No project has been changed." -ForegroundColor DarkGray
Write-Host ""

Write-Host "When you want to use it, run:" -ForegroundColor White
Write-Host "Start-Nexora-Skills-Manager.bat" -ForegroundColor Cyan
Write-Host "or legacy:" -ForegroundColor White
Write-Host "Start-Antigravity-Pro-Max.bat" -ForegroundColor Yellow
Write-Host ""

