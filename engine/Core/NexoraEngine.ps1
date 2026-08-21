# NexoraEngine.ps1 - Core Engine Bootstrap & Lifecycle Dispatcher

$ErrorActionPreference = "Stop"

$EngineRoot = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $EngineRoot -Parent

# Source Utilities
. (Join-Path $EngineRoot "Utils\PathUtils.ps1")
. (Join-Path $EngineRoot "Utils\OutputUtils.ps1")

# Source Core & Services
. (Join-Path $EngineRoot "Core\EventBus.ps1")
. (Join-Path $EngineRoot "Services\LoggingService.ps1")
. (Join-Path $EngineRoot "Services\ConfigService.ps1")
. (Join-Path $EngineRoot "Services\LockService.ps1")
. (Join-Path $EngineRoot "Services\ProjectService.ps1")

# Source Storage Layer
. (Join-Path $EngineRoot "Storage\ProjectMemory.ps1")
. (Join-Path $EngineRoot "Storage\SkillRegistry.ps1")

# Source Intelligence, Detection & Adapters
. (Join-Path $EngineRoot "Detection\ProjectDetector.ps1")
. (Join-Path $EngineRoot "Metadata\MetadataParser.ps1")
. (Join-Path $EngineRoot "Recommendations\RecommendationEngine.ps1")
. (Join-Path $EngineRoot "Adapters\PlatformAdapter.ps1")

# Source CLI Layer
. (Join-Path $EngineRoot "CLI\CommandParser.ps1")
. (Join-Path $EngineRoot "CLI\CommandRouter.ps1")

function Main {
    param([string[]]$CliArgs)

    try {
        Initialize-NexoraLogging -LogLevel "INFO"
        Write-NexoraLog -Level "DEBUG" -Component "Engine" -Message "Booting Nexora Engine..."

        $parsed = Parse-NexoraArguments -RawArgs $CliArgs
        $exitCode = Route-NexoraCommand -ParsedArgs $parsed

        if ($null -eq $exitCode) { $exitCode = 0 }
        exit $exitCode
    }
    catch {
        Write-NexoraError "Unhandled engine exception: $_"
        Write-NexoraLog -Level "FATAL" -Component "Engine" -Message "$($_.Exception.ToString())"
        exit 1
    }
}

Main -CliArgs $args
