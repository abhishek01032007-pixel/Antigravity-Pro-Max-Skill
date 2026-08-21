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
    Write-Host "  (none)                         Launch interactive project selector & mode manager (default)"
    Write-Host "  scan [path]                    Inspect project technologies, stacks, and calculate confidence"
    Write-Host "  skills list                    List available skills in universal global catalog"
    Write-Host "  skills active [path]           List active skills in the target project"
    Write-Host "  skills add <skill> [path]      Activate a skill into target project (.agents/skills/)"
    Write-Host "  skills remove <skill> [path]   Safely deactivate and remove a skill from target project"
    Write-Host "  skills recommend [path]        Inspect and display recommended skills for target project"
    Write-Host "  skills update [path]           Verify and synchronize skill versions with global registry"
    Write-Host "  doctor                         Verify runtime environment, paths, permissions, and skill health"
    Write-Host "  rollback [path]                Revert managed skills to previous backup snapshot"
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -h, --help                     Show this help message and exit"
    Write-Host "  -v, --version                  Display current Nexora engine and skill pack versions"
    Write-Host "  -j, --json                     Format command output as structured JSON"
    Write-Host "  --platform <name>              Target platform (antigravity, cursor, copilot)"
    Write-Host "  --activate                     Auto-activate recommended skills during scan"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  nexora"
    Write-Host "  nexora doctor"
    Write-Host "  nexora scan D:\Projects\MyMobileApp"
    Write-Host "  nexora skills add flutter-build-responsive-layout D:\Projects\MyMobileApp"
    Write-Host "  nexora skills remove flutter-build-responsive-layout D:\Projects\MyMobileApp"
    Write-Host "  nexora rollback D:\Projects\MyMobileApp"
    Write-Host ""
}
