# HelpFormatter.ps1 - Dynamic help and documentation renderer

function Show-NexoraHelp {
    param(
        [string]$Subcommand = $null
    )

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "        NEXORA SKILLS MANAGER (CLI)" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  nexora [command] [options] [path]"
    Write-Host ""
    Write-Host "COMMANDS:" -ForegroundColor Yellow
    Write-Host "  (none)        Launch interactive project selector & mode manager (default)"
    Write-Host "  scan          Inspect project technologies, stacks, and calculate confidence"
    Write-Host "  skills        List or search available skills across universal skill packs"
    Write-Host "  doctor        Verify runtime environment, paths, permissions, and skill health"
    Write-Host "  update        Check and synchronize core library updates"
    Write-Host "  rollback      Revert managed skills to previous backup snapshot"
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -h, --help    Show this help message and exit"
    Write-Host "  -v, --version Display current Nexora engine and skill pack versions"
    Write-Host "  -j, --json    Format command output as structured JSON"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  nexora"
    Write-Host "  nexora doctor"
    Write-Host "  nexora skills"
    Write-Host "  nexora skills search flutter"
    Write-Host "  nexora scan D:\Projects\MyMobileApp"
    Write-Host ""
}
