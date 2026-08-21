# CommandRouter.ps1 - Command Router and Execution Dispatcher

. (Join-Path $PSScriptRoot "HelpFormatter.ps1")
. (Join-Path $PSScriptRoot "Commands\InteractiveCommand.ps1")
. (Join-Path $PSScriptRoot "Commands\DoctorCommand.ps1")
. (Join-Path $PSScriptRoot "Commands\SkillsCommand.ps1")
. (Join-Path $PSScriptRoot "Commands\ScanCommand.ps1")
. (Join-Path $PSScriptRoot "Commands\UpdateCommand.ps1")
. (Join-Path $PSScriptRoot "Commands\RollbackCommand.ps1")

function Route-NexoraCommand {
    param(
        [psobject]$ParsedArgs
    )

    if ($ParsedArgs.Flags.ContainsKey("help") -or $ParsedArgs.Command -eq "help") {
        Show-NexoraHelp $ParsedArgs.Arguments[0]
        return 0
    }

    if ($ParsedArgs.Flags.ContainsKey("version") -or $ParsedArgs.Command -eq "version") {
        $root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
        $vFile = Join-Path $root "nexora-version.json"
        if (Test-Path $vFile) {
            $v = Get-Content $vFile -Raw | ConvertFrom-Json
            Write-Host "Nexora Core Version: $($v.coreVersion)" -ForegroundColor Cyan
            Write-Host "Skill Pack Version : $($v.skillPackVersion)" -ForegroundColor Cyan
        }
        else {
            Write-Host "Nexora Core Version: 1.0.0" -ForegroundColor Cyan
        }
        return 0
    }

    switch ($ParsedArgs.Command) {
        $null        { return (Invoke-InteractiveCommand $ParsedArgs) }
        "interactive"{ return (Invoke-InteractiveCommand $ParsedArgs) }
        "doctor"     { return (Invoke-DoctorCommand $ParsedArgs) }
        "skills"     { return (Invoke-SkillsCommand $ParsedArgs) }
        "scan"       { return (Invoke-ScanCommand $ParsedArgs) }
        "update"     { return (Invoke-UpdateCommand $ParsedArgs) }
        "rollback"   { return (Invoke-RollbackCommand $ParsedArgs) }
        default {
            Write-NexoraError "Unknown command '$($ParsedArgs.Command)'"
            Write-Host "Run 'nexora --help' for available commands." -ForegroundColor Yellow
            return 1
        }
    }
}
