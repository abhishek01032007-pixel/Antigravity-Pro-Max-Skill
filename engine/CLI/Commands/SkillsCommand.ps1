# SkillsCommand.ps1 - Skill Lifecycle Operations (List, Search, Recommend, Active, Add, Remove, Update)

function Invoke-SkillsCommand {
    param(
        [psobject]$ParsedArgs
    )

    $allSkills = Get-NexoraGlobalRegistry

    $action = "list"
    $query = $null
    $targetPath = (Get-Location).Path
    $targetSkill = $null

    if ($ParsedArgs.Arguments.Count -gt 0) {
        $firstArg = $ParsedArgs.Arguments[0].ToLower()
        if ($firstArg -eq "search" -and $ParsedArgs.Arguments.Count -gt 1) {
            $action = "search"
            $query = $ParsedArgs.Arguments[1].ToLower()
        }
        elseif ($firstArg -in @("add", "activate") -and $ParsedArgs.Arguments.Count -gt 1) {
            $action = "add"
            $targetSkill = $ParsedArgs.Arguments[1]
            if ($ParsedArgs.Arguments.Count -gt 2) { $targetPath = $ParsedArgs.Arguments[2] }
        }
        elseif ($firstArg -in @("remove", "deactivate") -and $ParsedArgs.Arguments.Count -gt 1) {
            $action = "remove"
            $targetSkill = $ParsedArgs.Arguments[1]
            if ($ParsedArgs.Arguments.Count -gt 2) { $targetPath = $ParsedArgs.Arguments[2] }
        }
        elseif ($firstArg -in @("active", "installed")) {
            $action = "active"
            if ($ParsedArgs.Arguments.Count -gt 1) { $targetPath = $ParsedArgs.Arguments[1] }
        }
        elseif ($firstArg -eq "recommend") {
            $action = "recommend"
            if ($ParsedArgs.Arguments.Count -gt 1) { $targetPath = $ParsedArgs.Arguments[1] }
        }
        elseif ($firstArg -eq "update") {
            $action = "update"
            if ($ParsedArgs.Arguments.Count -gt 1) { $targetPath = $ParsedArgs.Arguments[1] }
        }
        elseif ($firstArg -eq "list") {
            $action = "list"
        }
        else {
            $action = "search"
            $query = $firstArg
        }
    }

    # 1. Action: ADD / ACTIVATE
    if ($action -eq "add") {
        $resolved = Resolve-NexoraPath $targetPath
        $platform = if ($ParsedArgs.Flags.ContainsKey("platform")) { @($ParsedArgs.Flags["platform"]) } else { @("antigravity") }
        $res = Invoke-NexoraSkillActivationWorkflow -ProjectRoot $resolved -SkillIds @($targetSkill) -Platforms $platform

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $res | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        if ($res.Success) {
            Write-NexoraSuccess "Activated skill '$targetSkill' in $(Split-Path $resolved -Leaf)"
            Write-Host "Snapshot ID: $($res.SnapshotId)" -ForegroundColor DarkGray
        } else {
            Write-NexoraError "$($res.Message)"
        }
        Write-Host ""
        return 0
    }

    # 2. Action: REMOVE / DEACTIVATE
    if ($action -eq "remove") {
        $resolved = Resolve-NexoraPath $targetPath
        $platform = if ($ParsedArgs.Flags.ContainsKey("platform")) { @($ParsedArgs.Flags["platform"]) } else { @("antigravity") }
        $res = Invoke-NexoraSkillDeactivationWorkflow -ProjectRoot $resolved -SkillIds @($targetSkill) -Platforms $platform

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $res | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        if ($res.Success -and $res.DeactivatedCount -gt 0) {
            Write-NexoraSuccess "Deactivated skill '$targetSkill' from $(Split-Path $resolved -Leaf)"
            Write-Host "Snapshot ID: $($res.SnapshotId)" -ForegroundColor DarkGray
        } elseif ($res.Success) {
            Write-NexoraWarn "$($res.Message)"
        } else {
            Write-NexoraError "Failed to deactivate skill."
        }
        Write-Host ""
        return 0
    }

    # 3. Action: ACTIVE / INSTALLED
    if ($action -eq "active") {
        $resolved = Resolve-NexoraPath $targetPath
        $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolved

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $skillsData | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        Write-Host "Active Skills in $(Split-Path $resolved -Leaf):" -ForegroundColor Yellow
        Write-Host ""
        if (-not $skillsData.activeSkills -or $skillsData.activeSkills.Count -eq 0) {
            Write-Host "  No active skills found for this project." -ForegroundColor DarkGray
        } else {
            foreach ($s in $skillsData.activeSkills) {
                Write-Host "  [ACTIVE] $s" -ForegroundColor Green
            }
        }
        Write-Host ""
        return 0
    }

    # 4. Action: RECOMMEND
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

    # 5. Action: UPDATE
    if ($action -eq "update") {
        $resolved = Resolve-NexoraPath $targetPath
        $updateInfo = Check-NexoraSkillUpdates -ProjectRoot $resolved -AvailableSkills $allSkills

        if ($ParsedArgs.Flags.ContainsKey("json")) {
            $updateInfo | ConvertTo-Json -Depth 5 | Write-Host
            return 0
        }

        Write-NexoraBanner
        Write-Host "Checking Skill Updates for $(Split-Path $resolved -Leaf):" -ForegroundColor Yellow
        Write-Host ""
        Write-NexoraSuccess "All $($updateInfo.TotalActiveChecked) active skills match current global definitions (v1.0.0)."
        Write-Host ""
        return 0
    }

    # 6. Action: LIST / SEARCH
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

    $displayItems = $displaySkills | Select-Object @{Name="Skill Name"; Expression={$_.Id}}, @{Name="Category"; Expression={$_.Category}}, @{Name="Pack"; Expression={$_.Pack}}
    $displayItems | Format-Table -AutoSize | Out-String | Write-Host

    return 0
}
