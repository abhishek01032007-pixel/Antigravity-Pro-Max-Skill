# NexoraDesktopBridgeHost.ps1 - Persistent Worker Process Host for Nexora Desktop Bridge
# Reads single-line UTF-8 JSON commands from STDIN and emits single-line UTF-8 JSON responses to STDOUT.

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

# Determine engine root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$engineRoot = Resolve-Path (Join-Path $scriptDir "..\..\engine")
$repoRoot = Resolve-Path (Join-Path $engineRoot "..")

# Set active runtime path in session environment if not configured
if (-not $env:NEXORA_INSTALL_PATH -or -not (Test-Path $env:NEXORA_INSTALL_PATH)) {
    $env:NEXORA_INSTALL_PATH = $repoRoot.Path
}

# Load all required engine modules once into worker session
try {
    . (Join-Path $engineRoot "Utils\PathUtils.ps1")
    . (Join-Path $engineRoot "Utils\OutputUtils.ps1")
    . (Join-Path $engineRoot "Services\ProjectService.ps1")
    . (Join-Path $engineRoot "Storage\ProjectMemory.ps1")
    . (Join-Path $engineRoot "Storage\GlobalSkillRegistry.ps1")
    . (Join-Path $engineRoot "Detection\ProjectDetector.ps1")
    . (Join-Path $engineRoot "Metadata\MetadataParser.ps1")
    . (Join-Path $engineRoot "Recommendations\RecommendationEngine.ps1")
    . (Join-Path $engineRoot "Adapters\PlatformAdapter.ps1")
    . (Join-Path $engineRoot "Lifecycle\SkillLifecycleManager.ps1")
    . (Join-Path $engineRoot "Application\ProjectRegistryService.ps1")
    . (Join-Path $engineRoot "Application\StatusManager.ps1")
    . (Join-Path $engineRoot "Application\MultiProjectOrchestrator.ps1")
    . (Join-Path $engineRoot "Application\NexoraApplicationService.ps1")
    Set-NexoraEngineStatus -Status "ready"
    [Console]::Error.WriteLine("[NexoraBridgeHost] Engine modules loaded successfully.")
}
catch {
    [Console]::Error.WriteLine("[NexoraBridgeHost] Fatal: Failed to load engine modules: $_")
    exit 1
}

function Send-BridgeResponse {
    param(
        [Parameter(Mandatory=$true)]
        [string]$RequestId,
        [Parameter(Mandatory=$true)]
        [bool]$Success,
        $Data = $null,
        $ErrorObj = $null
    )

    $finalData = $Data
    if ($null -ne $Data -and $Data.PSObject.Properties["value"] -and $Data.PSObject.Properties["Count"] -and -not $Data.PSObject.Properties["id"]) {
        $finalData = @($Data.value)
    }

    $envelope = [ordered]@{
        schemaVersion = "1.0.0"
        requestId     = $RequestId
        success       = $Success
        data          = $finalData
        error         = $ErrorObj
    }

    # Convert to single line compact JSON
    $json = $envelope | ConvertTo-Json -Compress -Depth 10
    # Escape any newlines inside string values just in case
    $singleLineJson = $json.Replace("`r`n", " ").Replace("`n", " ").Replace("`r", " ")
    [Console]::Out.WriteLine($singleLineJson)
    [Console]::Out.Flush()
}

# Main event loop over STDIN
while ($null -ne ($line = [Console]::In.ReadLine())) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $reqId = "req_unknown"
    try {
        $req = $null
        try {
            $req = $line | ConvertFrom-Json
        }
        catch {
            [Console]::Error.WriteLine("[NexoraBridgeHost] Malformed JSON line received: $line")
            Send-BridgeResponse -RequestId "req_malformed" -Success $false -ErrorObj @{
                code      = "MALFORMED_JSON"
                message   = "Invalid JSON string received on STDIN."
                retryable = $false
            }
            continue
        }

        if ($req -and $req.PSObject.Properties["requestId"] -and $req.requestId) {
            $reqId = $req.requestId
        }

        $op = if ($req -and $req.PSObject.Properties["operation"]) { $req.operation } else { $null }
        $payload = if ($req -and $req.PSObject.Properties["payload"] -and $req.payload) { $req.payload } else { [PSCustomObject]@{} }

        if (-not $op) {
            Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{
                code      = "INVALID_OPERATION"
                message   = "Missing operation field in request envelope."
                retryable = $false
            }
            continue
        }

        # Dispatch whitelist of 25 authoritative frozen operations
        switch ($op) {
            # --- Application & System ---
            "application.initialize" {
                $res = Initialize-NexoraApplicationState
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "application.status" {
                $res = Get-NexoraApplicationStatus
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "updates.status" {
                $res = Get-NexoraApplicationUpdateStatus
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }

            # --- Project Registry & Context ---
            "projects.list" {
                $res = Get-NexoraApplicationProjects
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "projects.validate" {
                $rawPath = $payload.path
                if ($null -eq $rawPath -or $rawPath -isnot [string] -or [string]::IsNullOrWhiteSpace($rawPath)) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Parameter 'path' must be a non-empty string"; retryable = $false }
                } else {
                    try {
                        $fullPath = [System.IO.Path]::GetFullPath($rawPath)
                        $exists = Test-Path -LiteralPath $fullPath
                        $isDir = $false
                        $isAccessible = $false
                        $reason = $null

                        if (-not $exists) {
                            $reason = "Path does not exist"
                        } else {
                            $item = Get-Item -LiteralPath $fullPath -ErrorAction SilentlyContinue
                            if ($null -ne $item) {
                                $isDir = $item.PSIsContainer
                                $isAccessible = $true
                                if (-not $isDir) {
                                    $reason = "Path is a file, not a directory"
                                }
                            } else {
                                $reason = "Directory path is inaccessible"
                            }
                        }

                        $isValid = $exists -and $isDir -and $isAccessible
                        Send-BridgeResponse -RequestId $reqId -Success $true -Data @{
                            isValid      = $isValid
                            path         = $fullPath
                            isDirectory  = $isDir
                            isAccessible = $isAccessible
                            reason       = $reason
                        }
                    }
                    catch {
                        Send-BridgeResponse -RequestId $reqId -Success $true -Data @{
                            isValid      = $false
                            path         = $rawPath
                            isDirectory  = $false
                            isAccessible = $false
                            reason       = "Invalid path syntax: $($_.Exception.Message)"
                        }
                    }
                }
            }
            "projects.add" {
                $path = $payload.path
                $name = if ($payload.PSObject.Properties["name"]) { $payload.name } else { $null }
                $autoAnalyze = if ($payload.PSObject.Properties["autoAnalyze"]) { [bool]$payload.autoAnalyze } else { $true }
                if (-not $path -or $path -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'path' parameter"; retryable = $false }
                } else {
                    $res = Add-NexoraApplicationProject -Path $path -Name $name -AutoAnalyze:$autoAnalyze
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "OPERATION_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }
            "projects.remove" {
                $projectId = $payload.projectId
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Remove-NexoraApplicationProject -ProjectId $projectId
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "OPERATION_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }
            "projects.profile" {
                $projectId = $payload.projectId
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraApplicationProjectProfile -ProjectId $projectId
                    Send-BridgeResponse -RequestId $reqId -Success ($null -ne $res) -Data $res
                }
            }
            "projects.analyze" {
                $path = $payload.path
                if (-not $path -or $path -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'path' parameter"; retryable = $false }
                } else {
                    $res = Invoke-NexoraApplicationAnalyze -Path $path
                    Send-BridgeResponse -RequestId $reqId -Success ($null -ne $res) -Data $res
                }
            }

            # --- Working Context ---
            "context.get" {
                $projectId = $payload.projectId
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraProjectWorkingContext -ProjectId $projectId
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "OPERATION_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }
            "context.set" {
                $projectId = $payload.projectId
                $mode = if ($payload.PSObject.Properties["mode"]) { $payload.mode } elseif ($payload.PSObject.Properties["workingMode"]) { $payload.workingMode } else { $null }
                $target = if ($payload.PSObject.Properties["target"]) { $payload.target } else { $null }
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Set-NexoraProjectWorkingContext -ProjectId $projectId -WorkingMode $mode -Target $target
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "OPERATION_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }

            # --- Recommendations & Skills ---
            "recommendations.get" {
                $projectId = $payload.projectId
                $mode = if ($payload.PSObject.Properties["mode"]) { $payload.mode } elseif ($payload.PSObject.Properties["workingMode"]) { $payload.workingMode } else { $null }
                $target = if ($payload.PSObject.Properties["target"]) { $payload.target } else { $null }
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraApplicationRecommendations -ProjectId $projectId -WorkingMode $mode -Target $target
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                }
            }
            "skills.catalog" {
                $res = Get-NexoraApplicationAvailableSkills
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "skills.active" {
                $projectId = $payload.projectId
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraApplicationActiveSkills -ProjectId $projectId
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                }
            }
            "skills.activate" {
                $projectId = $payload.projectId
                $rawSkillIds = $payload.skillIds
                $rawPlatforms = $payload.platforms
                $skillIds = if ($null -ne $rawSkillIds) { @($rawSkillIds) } else { @() }
                $platforms = if ($null -ne $rawPlatforms) { @($rawPlatforms) } else { @("antigravity") }
                if (-not $projectId -or $projectId -isnot [string] -or $null -eq $rawSkillIds -or $rawSkillIds -is [string] -or $skillIds.Count -eq 0) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Parameter 'projectId' must be string and 'skillIds' must be a non-empty array"; retryable = $false }
                } else {
                    $cleanSkillIds = [string[]]($skillIds | ForEach-Object { "$_" })
                    $cleanPlatforms = [string[]]($platforms | ForEach-Object { "$_" })
                    $res = Invoke-NexoraApplicationActivateSkills -ProjectId $projectId -SkillIds $cleanSkillIds -Platforms $cleanPlatforms
                    Send-BridgeResponse -RequestId $reqId -Success $res.Success -Data $res -ErrorObj $(if (-not $res.Success) { @{ code = "ACTIVATION_FAILED"; message = $res.Message; retryable = $false } } else { $null })
                }
            }
            "skills.deactivate" {
                $projectId = $payload.projectId
                $skillId = $payload.skillId
                $platforms = if ($payload.PSObject.Properties["platforms"]) { @($payload.platforms) } else { @("antigravity") }
                if (-not $projectId -or $projectId -isnot [string] -or -not $skillId -or $skillId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing string projectId or skillId parameter"; retryable = $false }
                } else {
                    $res = Invoke-NexoraApplicationDeactivateSkill -ProjectId $projectId -SkillId $skillId -Platforms $platforms
                    Send-BridgeResponse -RequestId $reqId -Success $res.Success -Data $res -ErrorObj $(if (-not $res.Success) { @{ code = "DEACTIVATION_FAILED"; message = $res.Message; retryable = $false } } else { $null })
                }
            }
            "skills.usage" {
                $skillId = $payload.skillId
                if (-not $skillId -or $skillId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'skillId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraApplicationSkillUsage -SkillId $skillId
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                }
            }
            "skills.globalRemoval.preview" {
                $skillId = $payload.skillId
                if (-not $skillId -or $skillId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'skillId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraApplicationGlobalRemovalPreview -SkillId $skillId
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                }
            }
            "skills.globalRemoval.execute" {
                $skillId = $payload.skillId
                $token = $payload.confirmationToken
                if (-not $skillId -or $skillId -isnot [string] -or -not $token -or $token -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing string skillId or confirmationToken parameter"; retryable = $false }
                } else {
                    $res = Invoke-NexoraApplicationGlobalRemoval -SkillId $skillId -ConfirmationToken $token
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "REMOVAL_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }

            # --- Platforms & Preferences ---
            "platforms.list" {
                $res = Get-NexoraSupportedPlatforms
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "platforms.preferences.get" {
                $projectId = $payload.projectId
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Get-NexoraProjectPlatformPreferences -ProjectId $projectId
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data @{ projectId = $projectId; platforms = $res }
                }
            }
            "platforms.preferences.set" {
                $projectId = $payload.projectId
                $platforms = if ($payload.PSObject.Properties["platforms"]) { @($payload.platforms) } else { @("antigravity") }
                if (-not $projectId -or $projectId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Missing required string 'projectId' parameter"; retryable = $false }
                } else {
                    $res = Set-NexoraProjectPlatformPreferences -ProjectId $projectId -Platforms $platforms
                    Send-BridgeResponse -RequestId $reqId -Success $res.success -Data $res -ErrorObj $(if (-not $res.success) { @{ code = "OPERATION_FAILED"; message = $res.message; retryable = $false } } else { $null })
                }
            }

            # --- Diagnostics & Health ---
            "doctor.run" {
                $res = Invoke-NexoraApplicationDoctor -Repair:$false
                Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
            }
            "doctor.repair" {
                $categoryId = if ($payload.PSObject.Properties["categoryId"]) { $payload.categoryId } else { $null }
                if ($categoryId -and $categoryId -isnot [string]) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Parameter 'categoryId' must be a string"; retryable = $false }
                } else {
                    $res = Invoke-NexoraApplicationDoctor -Repair:$true -CategoryId $categoryId
                    if ($res.PSObject.Properties["success"] -and $res.success -eq $false) {
                        Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_CATEGORY"; message = $res.message; retryable = $false }
                    } else {
                        Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                    }
                }
            }

            # --- Activity & Updates ---
            "activity.list" {
                $projectId = if ($payload.PSObject.Properties["projectId"]) { $payload.projectId } else { $null }
                $limitRaw = if ($payload.PSObject.Properties["limit"]) { $payload.limit } else { 50 }
                if ($null -ne $limitRaw -and ($limitRaw -isnot [int] -and $limitRaw -isnot [long] -or $limitRaw -le 0)) {
                    Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{ code = "INVALID_PAYLOAD"; message = "Parameter 'limit' must be a positive integer"; retryable = $false }
                } else {
                    $limit = [int]$limitRaw
                    $res = Get-NexoraApplicationActivityLogs -ProjectId $projectId -Limit $limit
                    Send-BridgeResponse -RequestId $reqId -Success $true -Data $res
                }
            }

            default {
                Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{
                    code      = "UNKNOWN_OPERATION"
                    message   = "Operation '$op' is not recognized by the bridge dispatcher."
                    retryable = $false
                }
            }
        }
    }
    catch {
        $errMessage = if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { "$_" }
        [Console]::Error.WriteLine("[NexoraBridgeHost] Error processing request $reqId : $errMessage")
        Send-BridgeResponse -RequestId $reqId -Success $false -ErrorObj @{
            code      = "INTERNAL_ERROR"
            message   = $errMessage
            retryable = $false
        }
    }
}

[Console]::Error.WriteLine("[NexoraBridgeHost] Exiting worker loop.")
