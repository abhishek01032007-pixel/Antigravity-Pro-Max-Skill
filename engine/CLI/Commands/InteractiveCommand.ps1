# InteractiveCommand.ps1 - Encapsulates interactive UI and project loader

function Invoke-InteractiveCommand {
    param(
        [psobject]$ParsedArgs
    )

    $root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
    $selector = Join-Path $root "Loaders\agy-project.ps1"

    if (-not (Test-Path $selector)) {
        Write-NexoraError "Project selector not found: $selector"
        return 1
    }

    & $selector @($ParsedArgs.Arguments)
    return $LASTEXITCODE
}
