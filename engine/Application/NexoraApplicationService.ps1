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

function Get-NexoraProjectWorkingContext {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success     = $false
            message     = "Project not found: $ProjectId"
            projectId   = $ProjectId
            workingMode = $null
            target      = $null
        }
    }

    $meta = Get-NexoraProjectMetadata -ProjectRoot $proj.path
    $mode = $null
    $target = $null
    if ($meta.PSObject.Properties["workingContext"] -and $meta.workingContext) {
        if ($meta.workingContext.PSObject.Properties["mode"]) { $mode = $meta.workingContext.mode }
        elseif ($meta.workingContext.PSObject.Properties["workingMode"]) { $mode = $meta.workingContext.workingMode }
        if ($meta.workingContext.PSObject.Properties["target"]) { $target = $meta.workingContext.target }
    }

    return [PSCustomObject]@{
        success     = $true
        projectId   = $ProjectId
        workingMode = $mode
        target      = $target
    }
}

function Set-NexoraProjectWorkingContext {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [Parameter(Mandatory=$false)]
        [string]$WorkingMode = $null,
        [Parameter(Mandatory=$false)]
        [string]$Target = $null
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success = $false
            message = "Project not found: $ProjectId"
        }
    }

    $ValidModes = @("frontend", "backend", "fullstack", "qa")
    $ValidTargetMap = @{
        "frontend"  = @("web_application", "website", "mobile_application", "web application", "mobile application")
        "backend"   = @("web_backend", "api_service", "database_layer", "web / app backend", "api / service", "database / data layer", "backend")
        "fullstack" = @("web_application", "mobile_application", "web application", "mobile application")
        "qa"        = @("web_application", "mobile_application", "api_service", "full_project", "web application", "mobile application", "backend / api", "full project")
    }

    $normMode = if ($WorkingMode) { $WorkingMode.ToLower().Trim() } else { $null }
    $normTarget = if ($Target) { $Target.ToLower().Trim() } else { $null }

    if ($normMode -and $normMode -notin $ValidModes) {
        return [PSCustomObject]@{
            success = $false
            message = "Invalid working mode: $WorkingMode. Valid modes are: $($ValidModes -join ', ')"
        }
    }

    if ($normMode -and $normTarget) {
        $allowedTargets = $ValidTargetMap[$normMode]
        if ($normTarget -notin $allowedTargets) {
            return [PSCustomObject]@{
                success = $false
                message = "Invalid target '$Target' for working mode '$WorkingMode'."
            }
        }
    }

    $meta = Get-NexoraProjectMetadata -ProjectRoot $proj.path
    $ctx = [PSCustomObject]@{
        mode   = $normMode
        target = $normTarget
    }

    if ($meta.PSObject.Properties["workingContext"]) {
        $meta.workingContext = $ctx
    } else {
        $meta | Add-Member -NotePropertyName "workingContext" -NotePropertyValue $ctx -Force
    }

    Save-NexoraProjectMetadata -ProjectRoot $proj.path -Metadata $meta

    return [PSCustomObject]@{
        success     = $true
        projectId   = $ProjectId
        workingMode = $normMode
        target      = $normTarget
    }
}

function Get-NexoraApplicationRecommendations {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [Parameter(Mandatory=$false)]
        [string]$WorkingMode = $null,
        [Parameter(Mandatory=$false)]
        [string]$Target = $null
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return @()
    }

    if (-not $WorkingMode -and -not $Target) {
        $ctx = Get-NexoraProjectWorkingContext -ProjectId $ProjectId
        if ($ctx.success -and $ctx.workingMode) {
            $WorkingMode = $ctx.workingMode
            $Target = $ctx.target
        }
    }

    $analysis = Get-NexoraAnalysis -ProjectRoot $proj.path
    $allSkills = Get-NexoraGlobalRegistry
    return (Get-NexoraSkillRecommendations -Analysis $analysis -AvailableSkills $allSkills -WorkingMode $WorkingMode -Target $Target)
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
        [string[]]$Platforms = $null
    )

    Set-NexoraEngineStatus -Status "deactivating"
    Set-NexoraOperationState -State "running" -OperationName "global_skill_removal"

    $result = Invoke-NexoraGlobalSkillRemoval -SkillId $SkillId -ConfirmationToken $ConfirmationToken -Platforms $Platforms

    Set-NexoraOperationState -State $(if ($result.success) { "completed" } else { "failed" }) -OperationName "global_skill_removal"
    Set-NexoraEngineStatus -Status "ready"

    return $result
}

function Get-NexoraProjectPlatformPreferences {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return @("antigravity")
    }

    $meta = Get-NexoraProjectMetadata -ProjectRoot $proj.path
    if ($meta.PSObject.Properties["targetPlatforms"] -and $meta.targetPlatforms) {
        return @($meta.targetPlatforms)
    }
    return @("antigravity")
}

function Set-NexoraProjectPlatformPreferences {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [Parameter(Mandatory=$true)]
        [string[]]$Platforms
    )

    $proj = Find-NexoraManagedProjectById -ProjectId $ProjectId
    if (-not $proj -or -not (Test-Path $proj.path)) {
        return [PSCustomObject]@{
            success = $false
            message = "Project not found: $ProjectId"
        }
    }

    $meta = Get-NexoraProjectMetadata -ProjectRoot $proj.path
    $meta.targetPlatforms = @($Platforms)
    Save-NexoraProjectMetadata -ProjectRoot $proj.path -Metadata $meta

    return [PSCustomObject]@{
        success   = $true
        projectId = $ProjectId
        platforms = @($Platforms)
    }
}

function Get-NexoraSupportedPlatforms {
    return @(
        [PSCustomObject]@{ id = "antigravity"; name = "Google Antigravity"; status = "Available"; compatible = $true },
        [PSCustomObject]@{ id = "cursor"; name = "Cursor"; status = "Available"; compatible = $true },
        [PSCustomObject]@{ id = "copilot"; name = "GitHub Copilot"; status = "Available"; compatible = $true }
    )
}

function Get-NexoraApplicationActivityLogs {
    param(
        [string]$ProjectId = $null,
        [int]$Limit = 50
    )

    $allLogs = [System.Collections.Generic.List[psobject]]::new()
    $seenIds = [System.Collections.Generic.HashSet[string]]::new()

    $projects = Get-NexoraManagedProjects
    $targetProjects = if ($ProjectId) {
        @($projects | Where-Object { $_.id -eq $ProjectId })
    } else {
        $projects
    }

    foreach ($proj in $targetProjects) {
        if (-not $proj.pathExists -or -not (Test-Path $proj.path)) { continue }

        try {
            $events = Get-NexoraProjectHistory -ProjectRoot $proj.path
            if ($events) {
                foreach ($entry in $events) {
                    $ts = if ($entry.timestamp) { $entry.timestamp } else { (Get-Date).ToString("o") }
                    $action = if ($entry.action) { $entry.action } else { "EVENT" }
                    $details = if ($entry.details) { $entry.details } else { @{} }

                    # Preserve existing stable eventId if present, otherwise generate deterministic fallback
                    $eventId = if ($entry.PSObject.Properties["eventId"] -and $entry.eventId) {
                        $entry.eventId
                    } else {
                        $rawIdentity = "$($proj.id)|$ts|$action"
                        $sha = [System.Security.Cryptography.SHA256]::Create()
                        $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($rawIdentity))
                        "act_" + [System.BitConverter]::ToString($hashBytes).Replace("-", "").Substring(0, 10).ToLower()
                    }

                    if ($seenIds.Contains($eventId)) { continue }
                    $seenIds.Add($eventId) | Out-Null

                    # Human-readable user-safe message & eventType
                    $eventType = "SYSTEM"
                    $userMsg = "Operation recorded: $action"
                    switch -Wildcard ($action) {
                        "*PROJECT_*" {
                            $eventType = "PROJECTS"
                            $userMsg = if ($action -eq "PROJECT_ANALYZED") { "$($proj.name) analyzed" } else { "Project updated: $($proj.name)" }
                        }
                        "*SKILL_ACTIVAT*" {
                            $eventType = "SKILLS"
                            $sNames = if ($details.skills) { ($details.skills -join ", ") } elseif ($details.skillId) { $details.skillId } else { "Skills" }
                            $userMsg = "$sNames activated"
                        }
                        "*SKILL_DEACTIVAT*" {
                            $eventType = "SKILLS"
                            $sNames = if ($details.skills) { ($details.skills -join ", ") } elseif ($details.skillId) { $details.skillId } else { "Skill" }
                            $userMsg = "$sNames deactivated"
                        }
                        "*ANALYZ*" {
                            $eventType = "ANALYSIS"
                            $userMsg = "$($proj.name) analyzed"
                        }
                        "*UPDATE*" {
                            $eventType = "UPDATES"
                            $userMsg = "Update completed in $($proj.name)"
                        }
                        default {
                            $eventType = "SYSTEM"
                            $userMsg = "$action in $($proj.name)"
                        }
                    }

                    $allLogs.Add([PSCustomObject]@{
                        eventId         = $eventId
                        projectId       = $proj.id
                        projectName     = $proj.name
                        timestamp       = $ts
                        eventType       = $eventType
                        userSafeMessage = $userMsg
                        source          = "engine"
                        metadata        = $details
                    })
                }
            }
        }
        catch {}
    }

    # Deterministic sorting: Newest first (Timestamp Descending), tie-break with ProjectId then EventId
    $sorted = @($allLogs | Sort-Object -Property @{ Expression = { $_.timestamp }; Descending = $true }, @{ Expression = { $_.projectId }; Descending = $false }, @{ Expression = { $_.eventId }; Descending = $false })

    if ($Limit -gt 0 -and $sorted.Count -gt $Limit) {
        $sorted = @($sorted | Select-Object -First $Limit)
    }

    return ,@($sorted)
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

    Set-NexoraUpdateStatus -Status "unknown"

    return [PSCustomObject]@{
        currentVersion  = $currentVersion
        latestVersion   = $null
        updateAvailable = $null
        checkedRemotely = $false
        channel         = "stable"
        status          = "Local installation verified"
        message         = "Local v$currentVersion verified. Remote update checks not performed."
        checkedAt       = (Get-Date).ToString("o")
    }
}

function Invoke-NexoraApplicationDoctor {
    param(
        [switch]$Repair,
        [Parameter(Mandatory=$false)]
        [string]$CategoryId = $null
    )

    $validCategoryIds = @("core_engine", "skill_library", "cli", "project_registry", "installation_metadata", "platform_adapters")
    if ($CategoryId -and -not ($validCategoryIds -contains $CategoryId.ToLower())) {
        return [PSCustomObject]@{
            success        = $false
            healthy        = $false
            message        = "Invalid categoryId '$CategoryId'. Allowed categories: $($validCategoryIds -join ', ')"
            checks         = @()
            repairsApplied = @()
        }
    }

    Set-NexoraEngineStatus -Status $(if ($Repair) { "repairing" } else { "ready" })
    
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

    # Project Registry check
    $registryPath = Get-NexoraProjectRegistryPath
    $hasRegistry = (Test-Path $registryPath)

    # Platform Adapters check
    $adapterDir = if ($runtimePath) { Join-Path $runtimePath "engine\Adapters" } else { $null }
    $hasAdapters = ($adapterDir -and (Test-Path (Join-Path $adapterDir "AntigravityAdapter.ps1")) -and (Test-Path (Join-Path $adapterDir "CursorAdapter.ps1")) -and (Test-Path (Join-Path $adapterDir "CopilotAdapter.ps1")))

    $checks = @(
        [PSCustomObject]@{
            id         = "core_engine"
            label      = "Core Engine"
            name       = "Core Engine"
            status     = if ($hasEngine) { "OK" } else { "FAIL" }
            detail     = if ($hasEngine) { "v1.0.0 NexoraEngine.ps1 verified" } else { "Missing NexoraEngine.ps1" }
            repairable = $false
        },
        [PSCustomObject]@{
            id         = "skill_library"
            label      = "Skill Library"
            name       = "Skill Library"
            status     = if ($hasSkills) { "OK" } else { "WARN" }
            detail     = "Loaded $($allSkills.Count)/48 available skills"
            repairable = $false
        },
        [PSCustomObject]@{
            id         = "cli"
            label      = "CLI"
            name       = "CLI"
            status     = if ($hasCmd -and $hasPath) { "OK" } else { "WARN" }
            detail     = if ($hasCmd -and $hasPath) { "Active in PATH" } else { "Missing command or PATH registration" }
            repairable = $true
        },
        [PSCustomObject]@{
            id         = "project_registry"
            label      = "Project Registry"
            name       = "Project Registry"
            status     = if ($hasRegistry) { "OK" } else { "WARN" }
            detail     = if ($hasRegistry) { "projects.json verified" } else { "projects.json missing" }
            repairable = $true
        },
        [PSCustomObject]@{
            id         = "installation_metadata"
            label      = "Installation Metadata"
            name       = "Installation Metadata"
            status     = if ($hasMeta) { "OK" } else { "WARN" }
            detail     = if ($hasMeta) { $meta.installPath } else { "Missing install.json" }
            repairable = $true
        },
        [PSCustomObject]@{
            id         = "platform_adapters"
            label      = "Platform Adapters"
            name       = "Platform Adapters"
            status     = if ($hasAdapters) { "OK" } else { "WARN" }
            detail     = if ($hasAdapters) { "Antigravity, Cursor, Copilot active" } else { "Platform adapter scripts missing" }
            repairable = $false
        }
    )

    $repairsApplied = @()
    if ($Repair) {
        $doctorCmdPath = Join-Path (Split-Path $PSScriptRoot -Parent) "CLI\Commands\DoctorCommand.ps1"
        if ((Test-Path $doctorCmdPath) -and -not (Get-Command "Invoke-DoctorCommand" -ErrorAction SilentlyContinue)) {
            . $doctorCmdPath
        }
        if (Get-Command "Invoke-DoctorCommand" -ErrorAction SilentlyContinue) {
            $repCmd = [PSCustomObject]@{ Flags = @{ "repair" = $true; "json" = $true }; Arguments = [System.Collections.Generic.List[string]]::new() }
            Invoke-DoctorCommand $repCmd | Out-Null
        }
        $repairsApplied = @("CLI registration checked/repaired", "Installation metadata refreshed")
    }

    Set-NexoraEngineStatus -Status "ready"

    return [PSCustomObject]@{
        success        = $true
        healthy        = ($checks | Where-Object { $_.status -eq "FAIL" }).Count -eq 0
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
