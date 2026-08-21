# StartCommand.ps1 - Application Core Startup & Backend State Bootstrap Hook

function Invoke-StartCommand {
    param(
        [psobject]$ParsedArgs
    )

    # Initialize application state through unified facade
    $appState = Initialize-NexoraApplicationState

    if ($ParsedArgs.Flags.ContainsKey("json")) {
        $appState | ConvertTo-Json -Depth 6 | Write-Host
        return 0
    }

    Write-NexoraBanner
    Write-Host "Nexora Application Core Initialized" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Engine Status : $($appState.engineStatus)" -ForegroundColor Cyan
    Write-Host "  Runtime Path  : $($appState.runtimePath)" -ForegroundColor White
    Write-Host "  Projects Total: $($appState.projectCount) managed project(s)" -ForegroundColor White
    Write-Host "  Version Status: $($appState.updateStatus.currentVersion) ($($appState.updateStatus.channel))" -ForegroundColor White
    Write-Host ""

    if ($appState.projectCount -gt 0) {
        Write-Host "Managed Projects:" -ForegroundColor Yellow
        foreach ($p in $appState.projects) {
            $statusColor = if ($p.status -eq "ready") { "Green" } else { "Red" }
            Write-Host "  - " -NoNewline
            Write-Host "$($p.name)" -ForegroundColor White -NoNewline
            Write-Host " [$($p.primaryType)] " -ForegroundColor DarkCyan -NoNewline
            Write-Host "($($p.status))" -ForegroundColor $statusColor
            Write-Host "    $($p.path)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
    else {
        Write-Host "Tip: Register your first project with 'nexora projects add <path>'." -ForegroundColor DarkYellow
        Write-Host ""
    }

    Write-Host "Ready for Phase 6 Desktop UI / Control Center launch." -ForegroundColor DarkCyan
    Write-Host ""

    return 0
}
