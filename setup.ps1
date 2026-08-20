$ErrorActionPreference = "Stop"

$RepoOwner = "abhishek01032007-pixel"
$RepoName  = "Antigravity-Pro-Max-Skill"
$Branch    = "main"

$DefaultInstallPath = "C:\Antigravity Pro Max Skill"
$CommandBin = Join-Path $env:LOCALAPPDATA "AntigravityProMax\bin"

$RuntimeFolders = @(
    "Backend-Frameworks",
    "Backend-Pro-Max",
    "Frontend-Pro-Max",
    "Fullstack-Extras",
    "Loaders",
    "QA-Debug-Pro-Max"
)

$RuntimeFiles = @(
    "Start-Nexora-Skills-Manager.bat",
    "Start-Antigravity-Pro-Max.bat"
)

$NonRuntimeItems = @(
    "README.md",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "third-party-licenses",
    "install.ps1",
    "setup.ps1",
    ".gitignore",
    "agpm.cmd",
    "nexora.cmd",
    "nexora-version.json",
    "agpm-version.json"
)

$TempRoot = Join-Path $env:TEMP ("nexora-" + [guid]::NewGuid().ToString("N"))
$ZipPath  = Join-Path $TempRoot "source.zip"
$Extract  = Join-Path $TempRoot "source"

function Remove-Temp {
    if (Test-Path $TempRoot) {
        Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Write-Step {
    param(
        [string]$Step,
        [string]$Message
    )

    Write-Host "[$Step] $Message" -ForegroundColor Cyan
}

function Find-ExistingRuntime {
    foreach ($letter in [char[]]([char]'C'..[char]'Z')) {
        $candidateNexora = "$letter`:\Nexora Skills Manager"
        if (
            (Test-Path $candidateNexora) -and
            (Test-Path (Join-Path $candidateNexora "Start-Nexora-Skills-Manager.bat"))
        ) {
            return $candidateNexora
        }

        $candidate = "$letter`:\Antigravity Pro Max Skill"
        if (
            (Test-Path $candidate) -and
            (
                (Test-Path (Join-Path $candidate "Start-Nexora-Skills-Manager.bat")) -or
                (Test-Path (Join-Path $candidate "Start-Antigravity-Pro-Max.bat"))
            )
        ) {
            return $candidate
        }
    }

    return $null
}

try {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "        NEXORA SKILLS MANAGER INSTALLER" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""

    Write-Step "1/7" "Detecting installation"

    if ($env:NEXORA_INSTALL_PATH) {
        $InstallPath = $env:NEXORA_INSTALL_PATH
        Write-Host "      Custom location detected (NEXORA_INSTALL_PATH)" -ForegroundColor Green
    }
    elseif ($env:AGPM_INSTALL_PATH) {
        $InstallPath = $env:AGPM_INSTALL_PATH
        Write-Host "      Legacy location detected (AGPM_INSTALL_PATH)" -ForegroundColor Green
    }
    else {
        $ExistingRuntime = Find-ExistingRuntime

        if ($ExistingRuntime) {
            $InstallPath = $ExistingRuntime
            Write-Host "      Existing runtime found" -ForegroundColor Green
        }
        else {
            $InstallPath = $DefaultInstallPath
            Write-Host "      Using default location" -ForegroundColor Green
        }
    }

    Write-Host "      $InstallPath" -ForegroundColor DarkGray


    Write-Step "2/7" "Preparing download"

    New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $Extract -Force | Out-Null

    $DownloadUrl =
        "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.zip"

    Write-Host "      Ready" -ForegroundColor Green


    Write-Step "3/7" "Downloading Nexora Skills Manager"

    Invoke-WebRequest `
        -Uri $DownloadUrl `
        -OutFile $ZipPath `
        -UseBasicParsing

    Write-Host "      Downloaded" -ForegroundColor Green


    Write-Step "4/7" "Preparing runtime"

    Expand-Archive `
        -Path $ZipPath `
        -DestinationPath $Extract `
        -Force

    $Source = Get-ChildItem $Extract -Directory |
        Where-Object { $_.Name -like "$RepoName-*" -or $_.Name -like "Nexora-Skills-Manager-*" } |
        Select-Object -First 1

    if (-not $Source) {
        throw "Downloaded repository package could not be located."
    }

    foreach ($folder in $RuntimeFolders) {
        if (-not (Test-Path (Join-Path $Source.FullName $folder))) {
            throw "Required runtime folder missing: $folder"
        }
    }

    foreach ($file in $RuntimeFiles) {
        if (-not (Test-Path (Join-Path $Source.FullName $file))) {
            throw "Required runtime file missing: $file"
        }
    }

    Write-Host "      Runtime verified" -ForegroundColor Green


    Write-Step "5/7" "Installing skill packs"

    New-Item `
        -ItemType Directory `
        -Path $InstallPath `
        -Force |
        Out-Null

    foreach ($item in $NonRuntimeItems) {
        $path = Join-Path $InstallPath $item

        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force
        }
    }

    foreach ($folder in $RuntimeFolders) {
        $src = Join-Path $Source.FullName $folder
        $dst = Join-Path $InstallPath $folder

        if (Test-Path $dst) {
            Remove-Item $dst -Recurse -Force
        }

        Copy-Item `
            -Path $src `
            -Destination $dst `
            -Recurse `
            -Force
    }

    foreach ($file in $RuntimeFiles) {
        Copy-Item `
            -Path (Join-Path $Source.FullName $file) `
            -Destination (Join-Path $InstallPath $file) `
            -Force
    }

    Write-Host "      Runtime installed" -ForegroundColor Green


    Write-Step "6/7" "Installing Nexora and legacy AGPM commands"

    New-Item `
        -ItemType Directory `
        -Path $CommandBin `
        -Force |
        Out-Null

    $NexoraLines = @(
        '@echo off',
        'setlocal EnableExtensions',
        '',
        'for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (',
        '    if exist "%%D:\Nexora Skills Manager\Start-Nexora-Skills-Manager.bat" (',
        '        call "%%D:\Nexora Skills Manager\Start-Nexora-Skills-Manager.bat" %*',
        '        exit /b %ERRORLEVEL%',
        '    )',
        '    if exist "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" (',
        '        call "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" %*',
        '        exit /b %ERRORLEVEL%',
        '    )',
        '    if exist "%%D:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat" (',
        '        call "%%D:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat" %*',
        '        exit /b %ERRORLEVEL%',
        '    )',
        ')',
        '',
        'echo.',
        'echo ========================================',
        'echo      NEXORA SKILLS MANAGER NOT FOUND',
        'echo ========================================',
        'echo.',
        'echo Expected runtime folder:',
        'echo   ^<Drive^>:\Antigravity Pro Max Skill',
        'echo.',
        'echo Run the installer again if the folder was removed.',
        'echo.',
        'pause',
        'exit /b 1'
    )

    Set-Content `
        -Path (Join-Path $CommandBin "nexora.cmd") `
        -Value $NexoraLines `
        -Encoding ASCII

    $AgpmLines = @(
        '@echo off',
        'setlocal EnableExtensions',
        '',
        'echo.',
        'echo ===============================================================================',
        'echo  [NOTICE] The ''agpm'' command has transitioned to ''nexora'' (Nexora Skills Manager).',
        'echo           Please use ''nexora'' in the future. Forwarding command...',
        'echo ===============================================================================',
        'echo.',
        '',
        'if exist "%~dp0nexora.cmd" (',
        '    call "%~dp0nexora.cmd" %*',
        '    exit /b %ERRORLEVEL%',
        ')',
        '',
        'for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (',
        '    if exist "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" (',
        '        call "%%D:\Antigravity Pro Max Skill\Start-Nexora-Skills-Manager.bat" %*',
        '        exit /b %ERRORLEVEL%',
        '    )',
        '    if exist "%%D:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat" (',
        '        call "%%D:\Antigravity Pro Max Skill\Start-Antigravity-Pro-Max.bat" %*',
        '        exit /b %ERRORLEVEL%',
        '    )',
        ')',
        '',
        'echo.',
        'echo ========================================',
        'echo      NEXORA SKILLS MANAGER NOT FOUND',
        'echo ========================================',
        'echo.',
        'echo Expected runtime folder:',
        'echo   ^<Drive^>:\Antigravity Pro Max Skill',
        'echo.',
        'echo Run the installer again if the folder was removed.',
        'echo.',
        'pause',
        'exit /b 1'
    )

    Set-Content `
        -Path (Join-Path $CommandBin "agpm.cmd") `
        -Value $AgpmLines `
        -Encoding ASCII

    $UserPath =
        [Environment]::GetEnvironmentVariable(
            "Path",
            [EnvironmentVariableTarget]::User
        )

    $UserParts = @(
        $UserPath -split ";" |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    if ($UserParts -notcontains $CommandBin) {
        $NewUserPath = (($UserParts + $CommandBin) -join ";")

        [Environment]::SetEnvironmentVariable(
            "Path",
            $NewUserPath,
            [EnvironmentVariableTarget]::User
        )
    }

    $CurrentParts = @(
        $env:Path -split ";" |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    if ($CurrentParts -notcontains $CommandBin) {
        $env:Path = $env:Path.TrimEnd(";") + ";" + $CommandBin
    }

    Write-Host "      Command ready: nexora (and legacy agpm)" -ForegroundColor Green


    Write-Step "7/7" "Final verification"

    foreach ($folder in $RuntimeFolders) {
        if (-not (Test-Path (Join-Path $InstallPath $folder))) {
            throw "Verification failed: $folder"
        }
    }

    foreach ($file in $RuntimeFiles) {
        if (-not (Test-Path (Join-Path $InstallPath $file))) {
            throw "Verification failed: $file"
        }
    }

    if (-not (Test-Path (Join-Path $CommandBin "nexora.cmd"))) {
        throw "Verification failed: nexora command."
    }

    if (-not (Test-Path (Join-Path $CommandBin "agpm.cmd"))) {
        throw "Verification failed: agpm command."
    }

    Remove-Temp

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "          NEXORA SKILLS MANAGER READY" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installed at:" -ForegroundColor White
    Write-Host "  $InstallPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Start Nexora Skills Manager with:" -ForegroundColor White
    Write-Host ""
    Write-Host "  nexora" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Legacy 'agpm' command is also enabled for compatibility." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "No Antigravity project was selected or modified." `
        -ForegroundColor DarkGray
    Write-Host ""
}
catch {
    Remove-Temp

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host "             INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""

    exit 1
}




