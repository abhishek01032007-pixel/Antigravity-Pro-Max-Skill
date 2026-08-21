# ProjectsCommand.ps1 - Global Managed Project CLI Subcommands

function Invoke-ProjectsCommand {
    param(
        [psobject]$ParsedArgs
    )

    $subcommand = if ($ParsedArgs.Arguments.Count -gt 0) { $ParsedArgs.Arguments[0].ToLower() } else { "list" }
    $jsonOut = $ParsedArgs.Flags.ContainsKey("json")

    switch ($subcommand) {
        "list" {
            $projects = Get-NexoraApplicationProjects
            if ($jsonOut) {
                $projects | ConvertTo-Json -Depth 4 | Write-Host
                return 0
            }

            Write-NexoraBanner
            Write-Host "Nexora Managed Projects ($($projects.Count) total):" -ForegroundColor Yellow
            Write-Host ""

            if ($projects.Count -eq 0) {
                Write-Host "  No managed projects registered yet." -ForegroundColor DarkGray
                Write-Host "  Run 'nexora projects add <path>' to register a project." -ForegroundColor DarkYellow
                Write-Host ""
                return 0
            }

            $display = $projects | Select-Object @{Name="ID"; Expression={$_.id}}, @{Name="Name"; Expression={$_.name}}, @{Name="Type"; Expression={$_.primaryType}}, @{Name="Mode"; Expression={$_.developmentMode}}, @{Name="Status"; Expression={$_.status}}, @{Name="Path"; Expression={$_.path}}
            $display | Format-Table -AutoSize | Out-String | Write-Host
            return 0
        }

        "add" {
            if ($ParsedArgs.Arguments.Count -lt 2) {
                Write-NexoraError "Usage: nexora projects add <path> [name]"
                return 1
            }

            $targetPath = $ParsedArgs.Arguments[1]
            $customName = if ($ParsedArgs.Arguments.Count -gt 2) { $ParsedArgs.Arguments[2] } else { $null }

            $result = Add-NexoraApplicationProject -Path $targetPath -Name $customName -AutoAnalyze
            if ($jsonOut) {
                $result | ConvertTo-Json -Depth 4 | Write-Host
                return $(if ($result.success) { 0 } else { 1 })
            }

            if ($result.success) {
                Write-NexoraSuccess "$($result.message) (ID: $($result.projectId))"
                return 0
            }
            else {
                Write-NexoraError $result.message
                return 1
            }
        }

        "remove" {
            if ($ParsedArgs.Arguments.Count -lt 2) {
                Write-NexoraError "Usage: nexora projects remove <projectId>"
                return 1
            }

            $projectId = $ParsedArgs.Arguments[1]
            $result = Remove-NexoraApplicationProject -ProjectId $projectId

            if ($jsonOut) {
                $result | ConvertTo-Json -Depth 4 | Write-Host
                return $(if ($result.success) { 0 } else { 1 })
            }

            if ($result.success) {
                Write-NexoraSuccess $result.message
                return 0
            }
            else {
                Write-NexoraError $result.message
                return 1
            }
        }

        "profile" {
            if ($ParsedArgs.Arguments.Count -lt 2) {
                Write-NexoraError "Usage: nexora projects profile <projectId>"
                return 1
            }

            $projectId = $ParsedArgs.Arguments[1]
            $profile = Get-NexoraApplicationProjectProfile -ProjectId $projectId

            if ($jsonOut) {
                $profile | ConvertTo-Json -Depth 6 | Write-Host
                return $(if ($profile.success) { 0 } else { 1 })
            }

            if (-not $profile.success) {
                Write-NexoraError $profile.message
                return 1
            }

            Write-NexoraBanner
            Write-Host "Project Profile: $($profile.project.name)" -ForegroundColor Yellow
            Write-Host "  ID     : $($profile.project.id)" -ForegroundColor White
            Write-Host "  Path   : $($profile.project.path)" -ForegroundColor DarkGray
            Write-Host "  Type   : $($profile.analysis.projectType)" -ForegroundColor Green
            Write-Host "  Mode   : $($profile.analysis.developmentMode)" -ForegroundColor Green
            Write-Host "  Active : $($profile.skills.activeSkills.Count) skill(s)" -ForegroundColor Cyan
            Write-Host "  History: $($profile.history.Count) event(s)" -ForegroundColor DarkCyan
            Write-Host ""
            return 0
        }

        default {
            Write-NexoraError "Unknown projects subcommand '$subcommand'. Available: list, add, remove, profile."
            return 1
        }
    }
}
