# ProjectService.ps1 - Installation Metadata and Path Resolution Service

function Get-NexoraInstallationMetadataPath {
    $localAppData = $env:LOCALAPPDATA
    if (-not $localAppData) {
        $localAppData = Join-Path $env:USERPROFILE "AppData\Local"
    }
    $metaDir = Join-Path $localAppData "NexoraSkillsManager"
    if (-not (Test-Path $metaDir)) {
        New-Item -ItemType Directory -Path $metaDir -Force | Out-Null
    }
    return (Join-Path $metaDir "install.json")
}

function Get-NexoraInstallationMetadata {
    $metaFile = Get-NexoraInstallationMetadataPath
    if (Test-Path $metaFile) {
        try {
            return Get-Content $metaFile -Raw -Encoding UTF8 | ConvertFrom-Json
        }
        catch {}
    }
    return $null
}

function Save-NexoraInstallationMetadata {
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallPath,
        [string]$Version = "1.0.0",
        [string]$InstallMethod = "one_line_powershell",
        [string]$Channel = "stable"
    )

    $metaFile = Get-NexoraInstallationMetadataPath
    $meta = [PSCustomObject]@{
        installPath   = $InstallPath
        version       = $Version
        engineEntry   = "engine\Core\NexoraEngine.ps1"
        launcherBatch = "Start-Nexora-Skills-Manager.bat"
        installedAt   = (Get-Date).ToString("o")
        installMethod = $InstallMethod
        channel       = $Channel
    }

    $json = $meta | ConvertTo-Json -Depth 4
    Set-Content -Path $metaFile -Value $json -Encoding UTF8
    return $meta
}

function Resolve-NexoraInstalledRuntimePath {
    # 1. Fast lookup: Environment variable
    if ($env:NEXORA_INSTALL_PATH -and (Test-Path $env:NEXORA_INSTALL_PATH)) {
        return $env:NEXORA_INSTALL_PATH
    }

    # 2. Authoritative persistent metadata: install.json
    $meta = Get-NexoraInstallationMetadata
    if ($meta -and $meta.installPath -and (Test-Path $meta.installPath)) {
        return $meta.installPath
    }

    # 3. Default path
    $localAppData = $env:LOCALAPPDATA
    if (-not $localAppData) { $localAppData = Join-Path $env:USERPROFILE "AppData\Local" }
    $defaultApp = Join-Path $localAppData "NexoraSkillsManager\runtime"
    if (Test-Path $defaultApp) {
        return $defaultApp
    }

    # 4. Legacy environment variable
    if ($env:AGPM_INSTALL_PATH -and (Test-Path $env:AGPM_INSTALL_PATH)) {
        return $env:AGPM_INSTALL_PATH
    }

    # 5. Legacy drive scan fallback
    $mountedDrives = Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root
    foreach ($driveRoot in $mountedDrives) {
        $candidateNexora = Join-Path $driveRoot "Nexora Skills Manager"
        if (Test-Path (Join-Path $candidateNexora "Start-Nexora-Skills-Manager.bat")) {
            return $candidateNexora
        }
        $candidateAgpm = Join-Path $driveRoot "Antigravity Pro Max Skill"
        if (Test-Path (Join-Path $candidateAgpm "Start-Nexora-Skills-Manager.bat")) {
            return $candidateAgpm
        }
    }

    return $null
}
