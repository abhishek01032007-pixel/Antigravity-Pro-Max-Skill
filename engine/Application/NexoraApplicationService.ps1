# NexoraApplicationService.ps1 - Master Unified Application Facade for Phase 6 Desktop UI & CLI

function Get-NexoraApplicationProjects {
    return Get-NexoraManagedProjects
}

function Add-NexoraApplicationProject {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,
        [string]$Name = $null,
        [switch]$AutoAnalyze
    )

    $regRes = Add-NexoraManagedProject -Path $Path -Name $Name
    if (-not $regRes.success) {
        return $regRes
    }

    if ($AutoAnalyze) {
        $canonical = Get-NexoraCanonicalPath -Path $Path
        Invoke-NexoraApplicationAnalyze -Path $canonical | Out-Null
    }

    return $regRes
}

function Remove-NexoraApplicationProject {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    return (Remove-NexoraManagedProject -ProjectId $ProjectId)
}

function Invoke-NexoraApplicationAnalyze {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    $resolved = Resolve-NexoraPath $Path
    if (-not (Test-Path $resolved)) {
        return [PSCustomObject]@{
            success = $false
            message = "Path does not exist: $resolved"
            analysis = $null
            recommendations = @()
        }
    }

    Set-NexoraEngineStatus -Status "analyzing"

    # 1. Run detection
    $analysis = Invoke-NexoraProjectScan -ProjectRoot $resolved
    Save-NexoraAnalysis -ProjectRoot $resolved -Analysis $analysis

    # 2. Update project metadata (.nexora/project.json)
    $projMeta = Get-NexoraProjectMetadata -ProjectRoot $resolved
    $projMeta.lastScan = (Get-Date).ToString("o")
    Save-NexoraProjectMetadata -ProjectRoot $resolved -Metadata $projMeta
    Add-NexoraProjectHistory -ProjectRoot $resolved -Action "PROJECT_ANALYZED" -Details @{
        projectType     = $analysis.projectType
        developmentMode = $analysis.developmentMode
    }

    # 3. Update global registry classification if project is registered
    $projectId = New-NexoraProjectId -CanonicalPath $resolved
    Update-NexoraManagedProjectClassification -ProjectId $projectId -PrimaryType $analysis.projectType -DevelopmentMode $analysis.developmentMode | Out-Null

    # 4. Generate recommendations
    $allSkills = Get-NexoraGlobalRegistry
    $recommendations = Get-NexoraSkillRecommendations -Analysis $analysis -AvailableSkills $allSkills

    # 5. Update skills.json
    $skillsData = Get-NexoraProjectSkills -ProjectRoot $resolved
    $skillsData.recommendedSkills = @($recommendations | ForEach-Object { $_.SkillId })
    Save-NexoraProjectSkills -ProjectRoot $resolved -SkillsData $skillsData

    Set-NexoraEngineStatus -Status "ready"

    return [PSCustomObject]@{
        success         = $true
        projectRoot     = $resolved
        projectId       = $projectId
        analysis        = $analysis
        recommendations = $recommendations
    }
}

function Get-NexoraApplicationProjectProfile {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj) {
        return [PSCustomObject]@{
            success = $false
            message = "Project ID not found in managed registry: $ProjectId"
        }
    }

    if (-not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success  = $false
            message  = "Project directory does not exist on disk: $($proj.path)"
            project  = $proj
            status   = "missing"
        }
    }

    $metadata = Get-NexoraProjectMetadata -ProjectRoot $proj.path
    $analysis = Get-NexoraAnalysis -ProjectRoot $proj.path
    $skills = Get-NexoraProjectSkills -ProjectRoot $proj.path
    $history = Get-NexoraProjectHistory -ProjectRoot $proj.path

    return [PSCustomObject]@{
        success     = $true
        project     = $proj
        metadata    = $metadata
        analysis    = $analysis
        skills      = $skills
        history     = $history
    }
}

function Get-NexoraApplicationRecommendations {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return @()
    }

    $analysis = Get-NexoraAnalysis -ProjectRoot $proj.path
    $allSkills = Get-NexoraGlobalRegistry
    return (Get-NexoraSkillRecommendations -Analysis $analysis -AvailableSkills $allSkills)
}

function Get-NexoraApplicationAvailableSkills {
    return (Get-NexoraGlobalRegistry)
}

function Get-NexoraApplicationActiveSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return @()
    }

    $skillsData = Get-NexoraProjectSkills -ProjectRoot $proj.path
    if ($skillsData.activeSkills) {
        return @($skillsData.activeSkills)
    }
    return @()
}

function Invoke-NexoraApplicationActivateSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds,
        [string[]]$Platforms = @("antigravity")
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success = $false
            message = "Project not found or path missing: $ProjectId"
        }
    }

    Set-NexoraEngineStatus -Status "activating"
    Set-NexoraOperationState -State "running" -OperationName "skill_activation"

    $result = Invoke-NexoraSkillActivationWorkflow -ProjectRoot $proj.path -SkillIds $SkillIds -Platforms $Platforms

    Set-NexoraOperationState -State $(if ($result.Success) { "completed" } else { "failed" }) -OperationName "skill_activation"
    Set-NexoraEngineStatus -Status "ready"

    return $result
}

function Invoke-NexoraApplicationDeactivateSkill {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [Parameter(Mandatory=$true)]
        [string]$SkillId,
        [string[]]$Platforms = @("antigravity")
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success = $false
            message = "Project not found or path missing: $ProjectId"
        }
    }

    Set-NexoraEngineStatus -Status "deactivating"
    Set-NexoraOperationState -State "running" -OperationName "skill_deactivation"

    $result = Invoke-NexoraSkillDeactivationWorkflow -ProjectRoot $proj.path -SkillIds @($SkillId) -Platforms $Platforms

    Set-NexoraOperationState -State $(if ($result.Success) { "completed" } else { "failed" }) -OperationName "skill_deactivation"
    Set-NexoraEngineStatus -Status "ready"

    return $result
}

function Get-NexoraApplicationSkillUsage {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId
    )
    return (Get-NexoraCrossProjectSkillUsage -SkillId $SkillId)
}

function Get-NexoraApplicationGlobalRemovalPreview {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId
    )
    return (Get-NexoraGlobalSkillRemovalPreview -SkillId $SkillId)
}

function Invoke-NexoraApplicationGlobalRemoval {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId,
        [Parameter(Mandatory=$true)]
        [string]$ConfirmationToken,
        [string[]]$Platforms = @("antigravity")
    )

    Set-NexoraEngineStatus -Status "deactivating"
    Set-NexoraOperationState -State "running" -OperationName "global_skill_removal"

    $result = Invoke-NexoraGlobalSkillRemoval -SkillId $SkillId -ConfirmationToken $ConfirmationToken -Platforms $Platforms

    Set-NexoraOperationState -State $(if ($result.success) { "completed" } else { "failed" }) -OperationName "global_skill_removal"
    Set-NexoraEngineStatus -Status "ready"

    return $result
}

function Get-NexoraApplicationStatus {
    return (Get-NexoraSystemStatus)
}

function Get-NexoraApplicationUpdateStatus {
    $runtimePath = Resolve-NexoraInstalledRuntimePath
    $vFile = if ($runtimePath) { Join-Path $runtimePath "nexora-version.json" } else { $null }
    $currentVersion = "1.0.0"
    if ($vFile -and (Test-Path $vFile)) {
        try {
            $v = Get-Content $vFile -Raw | ConvertFrom-Json
            if ($v.coreVersion) { $currentVersion = $v.coreVersion }
        } catch {}
    }

    Set-NexoraUpdateStatus -Status "up_to_date"

    return [PSCustomObject]@{
        currentVersion  = $currentVersion
        latestVersion   = $currentVersion
        updateAvailable = $false
        channel         = "stable"
        checkedAt       = (Get-Date).ToString("o")
    }
}

function Invoke-NexoraApplicationDoctor {
    param(
        [switch]$Repair
    )

    Set-NexoraEngineStatus -Status $(if ($Repair) { "repairing" } else { "ready" })
    
    # Run structured doctor check
    $runtimePath = Resolve-NexoraInstalledRuntimePath
    $meta = Get-NexoraInstallationMetadata
    $hasMeta = ($null -ne $meta -and (Test-Path $meta.installPath))
    
    $engineFile = if ($runtimePath) { Join-Path $runtimePath "engine\Core\NexoraEngine.ps1" } else { $null }
    $hasEngine = ($engineFile -and (Test-Path $engineFile))

    $allSkills = Get-NexoraGlobalRegistry -LibraryRoot $runtimePath
    $hasSkills = ($allSkills.Count -ge 48)

    $localApp = $env:LOCALAPPDATA
    if (-not $localApp) { $localApp = Join-Path $env:USERPROFILE "AppData\Local" }
    $binDir = Join-Path $localApp "NexoraSkillsManager\bin"
    $hasCmd = (Test-Path (Join-Path $binDir "nexora.cmd"))
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $hasPath = ($userPath -and $userPath -like "*$binDir*")
    $hasAgpm = (Test-Path (Join-Path $binDir "agpm.cmd"))

    $checks = @(
        [PSCustomObject]@{ Name = "Installation Metadata"; Status = if ($hasMeta) { "OK" } else { "WARN" }; Detail = if ($hasMeta) { $meta.installPath } else { "Missing install.json" } }
        [PSCustomObject]@{ Name = "Engine Core Entrypoint"; Status = if ($hasEngine) { "OK" } else { "FAIL" }; Detail = if ($hasEngine) { $engineFile } else { "Missing NexoraEngine.ps1" } }
        [PSCustomObject]@{ Name = "Universal Skill Catalog"; Status = if ($hasSkills) { "OK" } else { "WARN" }; Detail = "Loaded $($allSkills.Count)/48 available skills" }
        [PSCustomObject]@{ Name = "CLI Command Registration"; Status = if ($hasCmd -and $hasPath) { "OK" } else { "WARN" }; Detail = if ($hasCmd -and $hasPath) { "Active in PATH" } else { "Missing command or PATH registration" } }
        [PSCustomObject]@{ Name = "Legacy agpm Compatibility"; Status = if ($hasAgpm) { "OK" } else { "WARN" }; Detail = if ($hasAgpm) { "Active" } else { "agpm.cmd missing" } }
    )

    $repairsApplied = @()
    if ($Repair) {
        # Delegate repair logic through DoctorCommand
        $repCmd = [PSCustomObject]@{ Flags = @{ "repair" = $true; "json" = $true }; Arguments = [System.Collections.Generic.List[string]]::new() }
        Invoke-DoctorCommand $repCmd | Out-Null
    }

    Set-NexoraEngineStatus -Status "ready"

    return [PSCustomObject]@{
        healthy        = ($checks | Where-Object { $_.Status -eq "FAIL" }).Count -eq 0
        runtimePath    = $runtimePath
        checks         = $checks
        repairsApplied = $repairsApplied
    }
}

function Initialize-NexoraApplicationState {
    # 1. Set starting status
    Set-NexoraEngineStatus -Status "starting"

    # 2. Resolve runtime
    $runtimePath = Resolve-NexoraInstalledRuntimePath
    $engineHealthy = ($runtimePath -and (Test-Path (Join-Path $runtimePath "engine\Core\NexoraEngine.ps1")))

    # 3. Load managed projects
    $projects = Get-NexoraManagedProjects

    # 4. Check update status
    $updateStatus = Get-NexoraApplicationUpdateStatus

    # 5. Set ready status
    Set-NexoraEngineStatus -Status "ready"

    $systemStatus = Get-NexoraSystemStatus

    return [PSCustomObject]@{
        success       = $true
        engineStatus  = $systemStatus.engineStatus
        runtimePath   = $runtimePath
        engineHealthy = $engineHealthy
        projectCount  = $projects.Count
        projects      = $projects
        updateStatus  = $updateStatus
        status        = $systemStatus
        initializedAt = (Get-Date).ToString("o")
    }
}
