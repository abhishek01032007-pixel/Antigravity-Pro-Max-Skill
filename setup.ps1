# setup.ps1 - Nexora Skills Manager Universal Windows Bootstrap Installer
param(
    [string]$InstallPath = $null,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

$RepoOwner = "abhishek01032007-pixel"
$RepoName  = "Nexora-Skills-Manager"
$DefaultBranch = "main"

$LocalApp = $env:LOCALAPPDATA
if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }

$DefaultInstallPath = Join-Path $LocalApp "NexoraSkillsManager\runtime"
$NexoraBinDir = Join-Path $LocalApp "NexoraSkillsManager\bin"
$LegacyBinDir = Join-Path $LocalApp "AntigravityProMax\bin"

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

    # 1. Target Directory Resolution
    Write-Step "1/6" "Resolving installation directory..."
    if ($InstallPath) {
        # Explicit parameter provided
        Write-Host "      Custom path specified: $InstallPath" -ForegroundColor Green
    }
    elseif ($env:NEXORA_INSTALL_PATH) {
        $InstallPath = $env:NEXORA_INSTALL_PATH
        Write-Host "      Using NEXORA_INSTALL_PATH: $InstallPath" -ForegroundColor Green
    }
    else {
        $InstallPath = $DefaultInstallPath
        Write-Host "      Default location: $InstallPath" -ForegroundColor Green
    }

    # 2. Prepare Temp Staging
    Write-Step "2/6" "Preparing release download..."
    New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $Extract -Force | Out-Null

    # 3. Download Release Archive from GitHub
    Write-Step "3/6" "Downloading latest verified release..."
    $DownloadUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$DefaultBranch.zip"

    Invoke-WebRequest `
        -Uri $DownloadUrl `
        -OutFile $ZipPath `
        -UseBasicParsing

    Write-Host "      Downloaded package successfully" -ForegroundColor Green

    # 4. Extract and Deploy Runtime
    Write-Step "4/6" "Deploying Nexora Core Engine & Universal Skills..."
    Expand-Archive -Path $ZipPath -DestinationPath $Extract -Force

    $Source = Get-ChildItem $Extract -Directory |
        Where-Object { $_.Name -like "$RepoName-*" -or $_.Name -like "Antigravity-Pro-Max-*" } |
        Select-Object -First 1

    if (-not $Source) {
        throw "Extracted release archive structure is invalid."
    }

    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    $RuntimeFolders = @("engine", "Loaders", "Frontend-Pro-Max", "Backend-Pro-Max", "QA-Debug-Pro-Max", "Fullstack-Extras", "Backend-Frameworks")
    foreach ($f in $RuntimeFolders) {
        $srcDir = Join-Path $Source.FullName $f
        $dstDir = Join-Path $InstallPath $f
        if (Test-Path $srcDir) {
            if (Test-Path $dstDir) { Remove-Item -Path $dstDir -Recurse -Force -ErrorAction SilentlyContinue }
            Copy-Item -Path $srcDir -Destination $dstDir -Recurse -Force
        }
    }

    $RuntimeFiles = @("Start-Nexora-Skills-Manager.bat", "Start-Antigravity-Pro-Max.bat", "nexora-version.json", "agpm-version.json", "README.md", "LICENSE")
    foreach ($rf in $RuntimeFiles) {
        $srcFile = Join-Path $Source.FullName $rf
        if (Test-Path $srcFile) {
            Copy-Item -Path $srcFile -Destination (Join-Path $InstallPath $rf) -Force
        }
    }

    # 5. Persist Authoritative Metadata & Environment Variables
    Write-Step "5/6" "Persisting installation records & commands..."
    
    # Save install.json
    $metaDir = Join-Path $LocalApp "NexoraSkillsManager"
    if (-not (Test-Path $metaDir)) { New-Item -ItemType Directory -Path $metaDir -Force | Out-Null }
    $metaFile = Join-Path $metaDir "install.json"
    
    $meta = [PSCustomObject]@{
        installPath   = $InstallPath
        version       = "1.0.0"
        engineEntry   = "engine\Core\NexoraEngine.ps1"
        launcherBatch = "Start-Nexora-Skills-Manager.bat"
        installedAt   = (Get-Date).ToString("o")
        installMethod = "one_line_powershell"
        channel       = "stable"
    }
    $meta | ConvertTo-Json -Depth 4 | Set-Content -Path $metaFile -Encoding UTF8

    # Set fast user environment variable
    [Environment]::SetEnvironmentVariable("NEXORA_INSTALL_PATH", $InstallPath, "User")
    $env:NEXORA_INSTALL_PATH = $InstallPath

    # Create command shims
    if (-not (Test-Path $NexoraBinDir)) { New-Item -ItemType Directory -Path $NexoraBinDir -Force | Out-Null }

    $nexoraCmdContent = @'
@echo off
setlocal EnableExtensions

if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)

set "META=%LOCALAPPDATA%\NexoraSkillsManager\install.json"
if exist "%META%" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-Content '%META%' -Raw | ConvertFrom-Json).installPath"`) do set "NEXORA_INSTALL_PATH=%%I"
)

if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)

for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%D:\Nexora Skills Manager\Start-Nexora-Skills-Manager.bat" (
        call "%%D:\Nexora Skills Manager\Start-Nexora-Skills-Manager.bat" %*
        exit /b %ERRORLEVEL%
    )
    if exist "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" (
        call "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" %*
        exit /b %ERRORLEVEL%
    )
)

echo [ERROR] Nexora Skills Manager runtime could not be located.
echo Please run the setup script again to repair your installation.
exit /b 1
'@

    Set-Content -Path (Join-Path $NexoraBinDir "nexora.cmd") -Value $nexoraCmdContent -Encoding ASCII

    $agpmCmdContent = @'
@echo off
setlocal EnableExtensions
echo.
echo ===============================================================================
echo  [NOTICE] The 'agpm' command has transitioned to 'nexora' (Nexora Skills Manager).
echo           Please use 'nexora' in the future. Forwarding command...
echo ===============================================================================
echo.
call "%~dp0\nexora.cmd" %*
exit /b %ERRORLEVEL%
'@

    Set-Content -Path (Join-Path $NexoraBinDir "agpm.cmd") -Value $agpmCmdContent -Encoding ASCII

    # If legacy bin folder exists, update it too for backward compatibility
    if (Test-Path $LegacyBinDir) {
        Set-Content -Path (Join-Path $LegacyBinDir "nexora.cmd") -Value $nexoraCmdContent -Encoding ASCII
        Set-Content -Path (Join-Path $LegacyBinDir "agpm.cmd") -Value $agpmCmdContent -Encoding ASCII
    }

    # Register NexoraBinDir in User PATH
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$NexoraBinDir*") {
        $NewPath = if ($UserPath) { "$UserPath;$NexoraBinDir" } else { $NexoraBinDir }
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        $env:Path = "$env:Path;$NexoraBinDir"
    }

    # 6. Verification
    Write-Step "6/6" "Verifying installation integrity..."
    $engineEntry = Join-Path $InstallPath "engine\Core\NexoraEngine.ps1"
    if (-not (Test-Path $engineEntry)) {
        throw "Engine entrypoint missing: $engineEntry"
    }

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "     NEXORA SKILLS MANAGER INSTALLED!" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installation Path: $InstallPath" -ForegroundColor White
    Write-Host "Command Registered: nexora (and legacy agpm)" -ForegroundColor White
    Write-Host ""
    Write-Host "Open a new terminal and type: nexora" -ForegroundColor Yellow
    Write-Host ""
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
