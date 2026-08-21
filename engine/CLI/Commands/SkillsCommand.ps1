# SkillsCommand.ps1 - Skill Library Listing, Inspection & Recommendation

function Invoke-SkillsCommand {
    param(
        [psobject]$ParsedArgs
    )

    $allSkills = Get-NexoraSkillRegistry

    $action = "list"
    $query = $null
    $targetPath = (Get-Location).Path

    if ($ParsedArgs.Arguments.Count -gt 0) {
        $firstArg = $ParsedArgs.Arguments[0].ToLower()
        if ($firstArg -eq "search" -and $ParsedArgs.Arguments.Count -gt 1) {
            $action = "search"
            $query = $ParsedArgs.Arguments[1].ToLower()
        }
        elseif ($firstArg -eq "recommend") {
            $action = "recommend"
            if ($ParsedArgs.Arguments.Count -gt 1) {
                $targetPath = $ParsedArgs.Arguments[1]
            }
        }
        elseif ($firstArg -eq "installed") {
            $action = "installed"
            if ($ParsedArgs.Arguments.Count -gt 1) {
                $targetPath = $ParsedArgs.Arguments[1]
            }
        }
        elseif ($firstArg -eq "list") {
            $action = "list"
        }
        else {
            $action = "search"
            $query = $firstArg
        }
    }

    if ($action -eq "recommend") {
        $resolved = Resolve-NexoraPath $targetPath
        $analysis = Invoke-NexoraProjectScan -ProjectRoot $resolved
        $recommended = Get-NexoraSkillRecommendations -Analysis $analysis -AvailableSkills $allSkills

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $recommended | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        Write-Host "Recommended Skills for $(Split-Path $resolved -Leaf) ($($recommended.Count) matches):" -ForegroundColor Yellow
        Write-Host ""
        $display = $recommended | Select-Object @{Name="Skill"; Expression={$_.SkillId}}, @{Name="Score"; Expression={$_.Score}}, @{Name="Reason"; Expression={$_.MatchReason}}
        $display | Format-Table -AutoSize | Out-String | Write-Host
        return 0
    }

    if ($action -eq "installed") {
        $resolved = Resolve-NexoraPath $targetPath
        $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolved

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $skillsData | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        Write-Host "Installed Skills in $(Split-Path $resolved -Leaf):" -ForegroundColor Yellow
        Write-Host ""
        if ($skillsData.activeSkills.Count -eq 0) {
            Write-Host "  No skills currently active in this project." -ForegroundColor DarkGray
        } else {
            foreach ($s in $skillsData.activeSkills) {
                Write-Host "  [ACTIVE] $s" -ForegroundColor Green
            }
        }
        Write-Host ""
        return 0
    }

    # Search & List logic
    $displaySkills = $allSkills
    if ($action -eq "search" -and $query) {
        $displaySkills = @($allSkills | Where-Object { $_.Id.ToLower() -like "*$query*" -or $_.Pack.ToLower() -like "*$query*" })
    }

    if ($ParsedArgs.Flags.ContainsKey("json")) {
        $displaySkills | ConvertTo-Json -Depth 3 | Write-Host
        return 0
    }

    Write-NexoraBanner
    if ($action -eq "search") {
        Write-Host "Search Results for '$query' ($($displaySkills.Count) found):" -ForegroundColor Yellow
    }
    else {
        Write-Host "Universal Skill Library ($($displaySkills.Count) available skills):" -ForegroundColor Yellow
    }
    Write-Host ""

    $displayItems = $displaySkills | Select-Object @{Name="Skill Name"; Expression={$_.Id}}, @{Name="Pack Category"; Expression={$_.Pack}}
    $displayItems | Format-Table -AutoSize | Out-String | Write-Host

    return 0
}
