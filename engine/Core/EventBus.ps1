# EventBus.ps1 - Synchronous Event Broker for Nexora Core

$script:NexoraEventHandlers = @{}

function Register-NexoraEvent {
    param(
        [Parameter(Mandatory=$true)]
        [string]$EventName,

        [Parameter(Mandatory=$true)]
        [scriptblock]$Handler
    )

    if (-not $script:NexoraEventHandlers.ContainsKey($EventName)) {
        $script:NexoraEventHandlers[$EventName] = [System.Collections.Generic.List[scriptblock]]::new()
    }

    $script:NexoraEventHandlers[$EventName].Add($Handler)
}

function Publish-NexoraEvent {
    param(
        [Parameter(Mandatory=$true)]
        [string]$EventName,

        [Parameter(Mandatory=$false)]
        [psobject]$EventData = $null
    )

    if ($script:NexoraEventHandlers.ContainsKey($EventName)) {
        foreach ($handler in $script:NexoraEventHandlers[$EventName]) {
            try {
                & $handler $EventData
            }
            catch {
                Write-Warning "Handler for event '$EventName' encountered an error: $_"
            }
        }
    }
}

function Clear-NexoraEvents {
    $script:NexoraEventHandlers.Clear()
}
