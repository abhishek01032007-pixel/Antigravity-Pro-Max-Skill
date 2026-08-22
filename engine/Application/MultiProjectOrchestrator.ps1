# MultiProjectOrchestrator.ps1 - Cross-Project Skill Association & Safe Multi-Project Lifecycle Operations

$Script:ActiveConfirmationTokens = @{}

function Get-NexoraCrossProjectSkillUsage {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId
    )

    $normalizedSkillId = $SkillId.ToLower()
    $managedProjects = Get-NexoraManagedProjects
    $usingProjects = [System.Collections.Generic.List[psobject]]::new()

    foreach ($proj in $managedProjects) {
        if (-not $proj.pathExists) { continue }

        $skillsFile = Join-Path $proj.path ".nexora\skills.json"
        if (Test-Path $skillsFile) {
            try {
                $skillsData = Get-Content $skillsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                $activeList = @()
                if ($skillsData.activeSkills) {
                    $activeList = @($skillsData.activeSkills | ForEach-Object { $_.ToString().ToLower() })
                }

                if ($activeList -contains $normalizedSkillId) {
                    $usingProjects.Add([PSCustomObject]@{
                        id   = $proj.id
                        name = $proj.name
                        path = $proj.path
                    })
                }
            }
            catch {}
        }
    }

    return @($usingProjects.ToArray())
}

function New-NexoraProjectSetFingerprint {
    param(
        [Parameter(Mandatory=$false)]
        [AllowEmptyCollection()]
        [string[]]$ProjectIds = @()
    )
    $sorted = @($ProjectIds | Sort-Object -Unique)
    $joined = $sorted -join "|"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($joined)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function Get-NexoraGlobalSkillRemovalPreview {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId
    )

    $normalizedSkillId = $SkillId.ToLower()
    $affectedProjects = Get-NexoraCrossProjectSkillUsage -SkillId $normalizedSkillId
    $affectedIds = @($affectedProjects | ForEach-Object { $_.id })
    $fingerprint = New-NexoraProjectSetFingerprint -ProjectIds $affectedIds

    $now = Get-Date
    $expiresAt = $now.AddMinutes(5)
    $tokenId = "tok_" + [guid]::NewGuid().ToString("N").Substring(0, 16)

    # Store token in memory bound to operation, skill, project set, and expiry
    $Script:ActiveConfirmationTokens[$tokenId] = @{
        TokenId            = $tokenId
        Operation          = "remove_skill_all_projects"
        SkillId            = $normalizedSkillId
        ProjectIds         = $affectedIds
        ProjectFingerprint = $fingerprint
        CreatedAt          = $now
        ExpiresAt          = $expiresAt
    }

    return [PSCustomObject]@{
        operation            = "remove_skill_all_projects"
        skillId              = $SkillId
        affectedProjects     = $affectedProjects
        affectedCount        = $affectedProjects.Count
        destructive          = $true
        requiresConfirmation = $true
        confirmationToken    = $tokenId
        expiresAt            = $expiresAt.ToString("o")
    }
}

function Invoke-NexoraGlobalSkillRemoval {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId,
        [Parameter(Mandatory=$true)]
        [string]$ConfirmationToken,
        [string[]]$Platforms = $null
    )

    $normalizedSkillId = $SkillId.ToLower()

    # 1. Validate Token Existence
    if (-not $Script:ActiveConfirmationTokens.ContainsKey($ConfirmationToken)) {
        return [PSCustomObject]@{
            success      = $false
            message      = "Invalid or expired confirmation token."
            totalAffected= 0
            results      = @()
        }
    }

    $tokenData = $Script:ActiveConfirmationTokens[$ConfirmationToken]

    # 2. Invalidate token immediately to prevent replay attacks
    $Script:ActiveConfirmationTokens.Remove($ConfirmationToken) | Out-Null

    # 3. Check Expiration
    if ((Get-Date) -gt $tokenData.ExpiresAt) {
        return [PSCustomObject]@{
            success      = $false
            message      = "Confirmation token has expired. Please request a new preview."
            totalAffected= 0
            results      = @()
        }
    }

    # 4. Check Operation and Skill Binding
    if ($tokenData.Operation -ne "remove_skill_all_projects" -or $tokenData.SkillId -ne $normalizedSkillId) {
        return [PSCustomObject]@{
            success      = $false
            message      = "Confirmation token does not match the requested operation or skill."
            totalAffected= 0
            results      = @()
        }
    }

    # 5. Check Affected Project Set Invalidation
    $currentAffected = Get-NexoraCrossProjectSkillUsage -SkillId $normalizedSkillId
    $currentIds = @($currentAffected | ForEach-Object { $_.id })
    $currentFingerprint = New-NexoraProjectSetFingerprint -ProjectIds $currentIds

    if ($currentFingerprint -ne $tokenData.ProjectFingerprint) {
        return [PSCustomObject]@{
            success      = $false
            message      = "The set of affected projects has changed since the preview was generated. Operation aborted for safety."
            totalAffected= $currentAffected.Count
            results      = @()
        }
    }

    if ($currentAffected.Count -eq 0) {
        return [PSCustomObject]@{
            success      = $true
            message      = "Skill is not active in any registered managed project."
            totalAffected= 0
            results      = @()
        }
    }

    # 6. Sequential Execution across all affected projects
    $results = [System.Collections.Generic.List[psobject]]::new()
    $successCount = 0
    $failureCount = 0

    foreach ($proj in $currentAffected) {
        try {
            $projPlatforms = if ($Platforms -and $Platforms.Count -gt 0 -and $Platforms[0] -ne "authoritative") {
                $Platforms
            } else {
                $pMeta = Get-NexoraProjectMetadata -ProjectRoot $proj.path
                if ($pMeta.PSObject.Properties["targetPlatforms"] -and $pMeta.targetPlatforms) {
                    @($pMeta.targetPlatforms)
                } else {
                    @("antigravity")
                }
            }
            $deactResult = Deactivate-NexoraSkills -ProjectRoot $proj.path -SkillIds @($SkillId) -Platforms $projPlatforms
            if ($deactResult.Success) {
                $successCount++
                $results.Add([PSCustomObject]@{
                    projectId = $proj.id
                    name      = $proj.name
                    path      = $proj.path
                    success   = $true
                    snapshotId= $deactResult.SnapshotId
                    message   = "Deactivated successfully"
                })
            }
            else {
                $failureCount++
                $results.Add([PSCustomObject]@{
                    projectId = $proj.id
                    name      = $proj.name
                    path      = $proj.path
                    success   = $false
                    snapshotId= $null
                    message   = $deactResult.Message
                })
            }
        }
        catch {
            $failureCount++
            $results.Add([PSCustomObject]@{
                projectId = $proj.id
                name      = $proj.name
                path      = $proj.path
                success   = $false
                snapshotId= $null
                message   = $_.Exception.Message
            })
        }
    }

    $overallSuccess = ($failureCount -eq 0)

    return [PSCustomObject]@{
        success       = $overallSuccess
        message       = if ($overallSuccess) { "Skill deactivated across all $($successCount) managed projects." } else { "Deactivation completed with partial failures ($successCount succeeded, $failureCount failed)." }
        totalAffected = $currentAffected.Count
        successCount  = $successCount
        failureCount  = $failureCount
        results       = $results.ToArray()
    }
}
