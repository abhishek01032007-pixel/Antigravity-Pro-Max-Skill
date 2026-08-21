# ConfigService.ps1 - Global and project configuration manager

$script:GlobalConfigPath = Join-Path $env:LOCALAPPDATA "NexoraSkillsManager\config.json"

function Get-NexoraDefaultConfig {
    return [PSCustomObject]@{
        version              = "1.0.0"
        installPath          = "C:\Antigravity Pro Max Skill"
        logLevel             = "INFO"
        defaultPlatform      = "antigravity"
        autoScanOnLaunch     = $true
        telemetry            = $false
        legacyCompatibility  = [PSCustomObject]@{
            supportAgpm    = $true
            legacyBinPath  = (Join-Path $env:LOCALAPPDATA "AntigravityProMax\bin")
        }
    }
}

function Get-NexoraConfig {
    $config = Get-NexoraDefaultConfig

    if (Test-Path $script:GlobalConfigPath) {
        try {
            $jsonContent = Get-Content $script:GlobalConfigPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
            if ($jsonContent) {
                if ($jsonContent.installPath) { $config.installPath = $jsonContent.installPath }
                if ($jsonContent.logLevel) { $config.logLevel = $jsonContent.logLevel }
                if ($jsonContent.defaultPlatform) { $config.defaultPlatform = $jsonContent.defaultPlatform }
            }
        }
        catch {}
    }

    # Environment variable overrides
    if ($env:NEXORA_INSTALL_PATH) {
        $config.installPath = $env:NEXORA_INSTALL_PATH
    }
    elseif ($env:AGPM_INSTALL_PATH) {
        $config.installPath = $env:AGPM_INSTALL_PATH
    }

    if ($env:NEXORA_LOG_LEVEL) {
        $config.logLevel = $env:NEXORA_LOG_LEVEL
    }

    return $config
}

function Set-NexoraConfig {
    param(
        [Parameter(Mandatory=$true)]
        [psobject]$Config
    )

    $parentDir = Split-Path $script:GlobalConfigPath -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $json = $Config | ConvertTo-Json -Depth 5
    Set-Content -Path $script:GlobalConfigPath -Value $json -Encoding UTF8
}
