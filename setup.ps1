# setup.ps1 - Nexora Skills Manager Universal Windows Bootstrap Installer
param(
    [string]$InstallPath = $null,
    [string]$StateRoot = $null,
    [string]$DesktopRoot = $null,
    [string]$BinDir = $null,
    [string]$SourceDir = $null,
    [string]$DesktopSourceDir = $null,
    [switch]$SkipPathRegistration,
    [switch]$SkipShortcut,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

$RepoOwner = "abhishek01032007-pixel"
$RepoName  = "Nexora-Skills-Manager"
$DefaultBranch = "main"

$LocalApp = $env:LOCALAPPDATA
if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }

$TempRoot = Join-Path $env:TEMP ("nexora-bootstrap-" + [guid]::NewGuid().ToString("N"))
$ZipPath  = Join-Path $TempRoot "release.zip"
$Extract  = Join-Path $TempRoot "extracted"

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "[$Step] $Message" -ForegroundColor Cyan
}

try {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "        NEXORA SKILLS MANAGER INSTALLER" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""

    # 1. Resolve source: if SourceDir provided (or local repo detected), use local; otherwise download
    $resolvedSource = $SourceDir
    if (-not $resolvedSource -and (Test-Path (Join-Path $PSScriptRoot "nexora-version.json"))) {
        $resolvedSource = $PSScriptRoot
    }

    if (-not $resolvedSource) {
        Write-Step "1/4" "Preparing release download..."
        New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
        New-Item -ItemType Directory -Path $Extract -Force | Out-Null

        Write-Step "2/4" "Downloading verified release package..."
        $DownloadUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$DefaultBranch.zip"

        Invoke-WebRequest `
            -Uri $DownloadUrl `
            -OutFile $ZipPath `
            -UseBasicParsing

        Write-Host "      Downloaded release successfully" -ForegroundColor Green

        Expand-Archive -Path $ZipPath -DestinationPath $Extract -Force
        $Source = Get-ChildItem $Extract -Directory |
            Where-Object { $_.Name -like "$RepoName-*" -or $_.Name -like "Antigravity-Pro-Max-*" } |
            Select-Object -First 1

        if (-not $Source) {
            throw "Extracted release archive structure is invalid."
        }
        $resolvedSource = $Source.FullName
    }

    # 2. Dot-source the installer module from resolved source
    $installerModule = Join-Path $resolvedSource "engine\Install\NexoraInstaller.ps1"
    if (-not (Test-Path $installerModule)) {
        throw "Installer engine missing from source at: $installerModule"
    }
    . $installerModule

    # 3. Deploy unified installation
    Write-Step "3/4" "Deploying Shared Runtime, Packaged Desktop & CLI..."
    $installParams = @{
        InstallRoot          = $InstallPath
        StateRoot            = $StateRoot
        DesktopRoot          = $DesktopRoot
        BinDir               = $BinDir
        SourceDir            = $resolvedSource
        DesktopSourceDir     = $DesktopSourceDir
        SkipPathRegistration = $SkipPathRegistration
        SkipShortcut         = $SkipShortcut
        NonInteractive       = $NonInteractive
    }

    $result = Install-NexoraUnified @installParams

    # 4. Final verification and report
    Write-Step "4/4" "Verifying installation integrity..."
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "     NEXORA SKILLS MANAGER INSTALLED!" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Shared Runtime:     $($result.runtimeRoot)" -ForegroundColor White
    Write-Host "Desktop Host:       $($result.desktopExecutable)" -ForegroundColor White
    Write-Host "CLI Command:        $($result.cliShim)" -ForegroundColor White
    Write-Host "Version:            $($result.version)" -ForegroundColor White
    Write-Host ""
    Write-Host "Open a new terminal and type: nexora" -ForegroundColor Yellow
    Write-Host "Or launch 'Nexora Skills Manager' from Start Menu" -ForegroundColor Yellow
    Write-Host ""
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
