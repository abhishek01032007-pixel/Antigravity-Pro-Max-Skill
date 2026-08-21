# SkillsCommand.ps1 - Skill Library Listing & Inspection

function Invoke-SkillsCommand {
    param(
        [psobject]$ParsedArgs
    )

    $skills = Get-NexoraSkillRegistry

    $action = "list"
    $query = $null

    if ($ParsedArgs.Arguments.Count -gt 0) {
        $firstArg = $ParsedArgs.Arguments[0].ToLower()
        if ($firstArg -eq "search" -and $ParsedArgs.Arguments.Count -gt 1) {
            $action = "search"
            $query = $ParsedArgs.Arguments[1].ToLower()
        }
        elseif ($firstArg -eq "list") {
            $action = "list"
        }
        else {
            $action = "search"
            $query = $firstArg
        }
    }

    if ($action -eq "search" -and $query) {
        $skills = @($skills | Where-Object { $_.Id.ToLower() -like "*$query*" -or $_.Pack.ToLower() -like "*$query*" })
    }

    if ($ParsedArgs.Flags.ContainsKey("json")) {
        $skills | ConvertTo-Json -Depth 3 | Write-Host
        return 0
    }

    Write-NexoraBanner
    if ($action -eq "search") {
        Write-Host "Search Results for '$query' ($($skills.Count) found):" -ForegroundColor Yellow
    }
    else {
        Write-Host "Universal Skill Library ($($skills.Count) available skills):" -ForegroundColor Yellow
    }
    Write-Host ""

    $displayItems = $skills | Select-Object @{Name="Skill Name"; Expression={$_.Id}}, @{Name="Pack Category"; Expression={$_.Pack}}
    $displayItems | Format-Table -AutoSize | Out-String | Write-Host

    return 0
}
