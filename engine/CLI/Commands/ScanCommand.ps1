# ScanCommand.ps1 - Project Stack Inspection & Skill Recommendation Hook

function Invoke-ScanCommand {
    param(
        [psobject]$ParsedArgs
    )

    $targetPath = if ($ParsedArgs.Arguments.Count -gt 0) { $ParsedArgs.Arguments[0] } else { (Get-Location).Path }
    $resolved = Resolve-NexoraPath $targetPath

    if (-not (Test-Path $resolved)) {
        Write-NexoraError "Target directory does not exist: $resolved"
        return 1
    }

    # Run Detection
    $analysis = Invoke-NexoraProjectScan -ProjectRoot $resolved
    Save-NexoraAnalysis -ProjectRoot $resolved -Analysis $analysis

    # Update project metadata
    $projMeta = Get-NexoraProjectMetadata -ProjectRoot $resolved
    $projMeta.lastScan = (Get-Date).ToString("o")
    Save-NexoraProjectMetadata -ProjectRoot $resolved -Metadata $projMeta
    Add-NexoraProjectHistory -ProjectRoot $resolved -Action "PROJECT_SCANNED" -Details @{ projectType = $analysis.projectType }

    # Run Recommendations
    $allSkills = Get-NexoraSkillRegistry
    $recommended = Get-NexoraSkillRecommendations -Analysis $analysis -AvailableSkills $allSkills

    # Update skills.json
    $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolved
    $skillsData.recommendedSkills = @($recommended | ForEach-Object { $_.SkillId })
    Save-NexoraProjectSkills -ProjectRoot $resolved -SkillsData $skillsData

    # Auto-activation if requested
    $deployed = $null
    if ($ParsedArgs.Flags.ContainsKey("activate")) {
        $skillsToDeploy = @($allSkills | Where-Object { $skillsData.recommendedSkills -contains $_.Id })
        $deployed = Deploy-NexoraSkillsToPlatforms -ProjectRoot $resolved -SkillObjects $skillsToDeploy -Platforms @("antigravity")
        $skillsData.activeSkills = @($skillsToDeploy | ForEach-Object { $_.Id })
        Save-NexoraProjectSkills -ProjectRoot $resolved -SkillsData $skillsData
        Add-NexoraProjectHistory -ProjectRoot $resolved -Action "SKILLS_ACTIVATED_AUTO" -Details @{ count = $skillsToDeploy.Count }
    }

    if ($ParsedArgs.Flags.ContainsKey("json")) {
        [PSCustomObject]@{
            projectRoot     = $resolved
            analysis        = $analysis
            recommendations = $recommended
            deployed        = $deployed
        } | ConvertTo-Json -Depth 6 | Write-Host
        return 0
    }

    Write-NexoraBanner
    Write-Host "Project Scan Results: $(Split-Path $resolved -Leaf)" -ForegroundColor Yellow
    Write-Host "Path: $resolved" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "DETECTED STACK:" -ForegroundColor Cyan
    Write-Host "  Project Type : $($analysis.projectType)" -ForegroundColor Green
    Write-Host "  Technologies : $($analysis.detectedTechnologies -join ', ')" -ForegroundColor White
    if ($analysis.detectedFrameworks.Count -gt 0) {
        Write-Host "  Frameworks   : $($analysis.detectedFrameworks -join ', ')" -ForegroundColor White
    }
    Write-Host ""

    Write-Host "CONFIDENCE SCORES:" -ForegroundColor Cyan
    foreach ($k in $analysis.confidenceScores.Keys) {
        Write-Host "  - ${k}: $($analysis.confidenceScores[$k])%" -ForegroundColor DarkCyan
    }
    Write-Host ""

    Write-Host "RECOMMENDED SKILLS ($($recommended.Count) optimal matches):" -ForegroundColor Yellow
    $displayRecs = $recommended | Select-Object @{Name="Skill"; Expression={$_.SkillId}}, @{Name="Score"; Expression={$_.Score}}, @{Name="Match Reason"; Expression={$_.MatchReason}}
    $displayRecs | Format-Table -AutoSize | Out-String | Write-Host

    if ($ParsedArgs.Flags.ContainsKey("activate")) {
        Write-NexoraSuccess "Activated $($skillsData.activeSkills.Count) recommended skills in .agents/skills/"
    }
    else {
        Write-Host "Tip: Run 'nexora scan --activate' to deploy these skills to .agents/skills/" -ForegroundColor DarkYellow
    }
    Write-Host ""

    return 0
}
