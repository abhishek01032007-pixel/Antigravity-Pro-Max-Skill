# LoggingService.ps1 - Multi-level structured logger

$script:CurrentLogLevel = "INFO"
$script:LogFilePath = $null

function Initialize-NexoraLogging {
    param(
        [string]$ProjectRoot = $null,
        [string]$LogLevel = "INFO"
    )

    $script:CurrentLogLevel = $LogLevel.ToUpper()

    if ($ProjectRoot -and (Test-Path $ProjectRoot)) {
        $logDir = Join-Path $ProjectRoot ".nexora\logs"
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $today = (Get-Date).ToString("yyyyMMdd")
        $script:LogFilePath = Join-Path $logDir "nexora-$today.log"
    }
    else {
        $globalLogDir = Join-Path $env:LOCALAPPDATA "NexoraSkillsManager\logs"
        if (-not (Test-Path $globalLogDir)) {
            New-Item -ItemType Directory -Path $globalLogDir -Force | Out-Null
        }
        $script:LogFilePath = Join-Path $globalLogDir "nexora-core.log"
    }
}

function Write-NexoraLog {
    param(
        [ValidateSet("DEBUG", "INFO", "WARN", "ERROR", "FATAL")]
        [string]$Level,
        [string]$Component,
        [string]$Message
    )

    $levelHierarchy = @{
        "DEBUG" = 1
        "INFO"  = 2
        "WARN"  = 3
        "ERROR" = 4
        "FATAL" = 5
    }

    $currentPriority = if ($levelHierarchy.ContainsKey($script:CurrentLogLevel)) { $levelHierarchy[$script:CurrentLogLevel] } else { 2 }
    $msgPriority = $levelHierarchy[$Level]

    if ($msgPriority -ge $currentPriority) {
        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        $formatted = "[$timestamp] [$($Level.PadRight(5))] [$Component] $Message"

        if ($script:LogFilePath) {
            try {
                Add-Content -Path $script:LogFilePath -Value $formatted -Encoding UTF8 -ErrorAction SilentlyContinue
            }
            catch {}
        }
    }
}
