# ProjectRegistryService.ps1 - Global Managed Project Registry
# Manages %LOCALAPPDATA%\NexoraSkillsManager\projects.json
# Project IDs are SHA-256 hash-based on canonical path for stability.

function Get-NexoraProjectRegistryPath {
    $localAppData = $env:LOCALAPPDATA
    if (-not $localAppData) {
        $localAppData = Join-Path $env:USERPROFILE "AppData\Local"
    }
    $metaDir = Join-Path $localAppData "NexoraSkillsManager"
    if (-not (Test-Path $metaDir)) {
        New-Item -ItemType Directory -Path $metaDir -Force | Out-Null
    }
    return (Join-Path $metaDir "projects.json")
}

function New-NexoraProjectId {
    param(
        [Parameter(Mandatory=$true)]
        [string]$CanonicalPath
    )
    # Generate a stable, deterministic ID from the canonical path
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($CanonicalPath.ToLower().TrimEnd('\', '/'))
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($bytes)
    $short = [System.BitConverter]::ToString($hash).Replace("-", "").Substring(0, 12).ToLower()
    return "proj_$short"
}

function Get-NexoraCanonicalPath {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )
    if (Test-Path $Path) {
        return (Resolve-Path $Path).Path.TrimEnd('\', '/')
    }
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Get-NexoraProjectRegistry {
    $registryFile = Get-NexoraProjectRegistryPath
    if (Test-Path $registryFile) {
        try {
            $data = Get-Content $registryFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($data.projects) { return $data }
        }
        catch {}
    }
    return [PSCustomObject]@{
        version     = "1.0.0"
        lastUpdated = (Get-Date).ToString("o")
        projects    = @()
    }
}

function Save-NexoraProjectRegistry {
    param(
        [Parameter(Mandatory=$true)]
        [psobject]$Registry
    )
    $Registry.lastUpdated = (Get-Date).ToString("o")
    $json = $Registry | ConvertTo-Json -Depth 6
    $registryFile = Get-NexoraProjectRegistryPath
    Set-Content -Path $registryFile -Value $json -Encoding UTF8
}

function Add-NexoraManagedProject {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,
        [string]$Name = $null
    )

    $canonical = Get-NexoraCanonicalPath -Path $Path

    # Validate path exists
    if (-not (Test-Path $canonical)) {
        return [PSCustomObject]@{
            success = $false
            message = "Project path does not exist: $canonical"
            projectId = $null
        }
    }

    $projectId = New-NexoraProjectId -CanonicalPath $canonical
    $registry = Get-NexoraProjectRegistry

    # Deduplicate: check both ID match and canonical path match
    $projectList = [System.Collections.Generic.List[psobject]]::new()
    $duplicate = $false
    if ($registry.projects) {
        foreach ($p in $registry.projects) {
            $projectList.Add($p)
            $existingCanonical = Get-NexoraCanonicalPath -Path $p.path
            if ($p.id -eq $projectId -or $existingCanonical -eq $canonical) {
                $duplicate = $true
            }
        }
    }

    if ($duplicate) {
        # Update lastOpened on the existing entry instead of adding a duplicate
        foreach ($p in $projectList) {
            $existingCanonical = Get-NexoraCanonicalPath -Path $p.path
            if ($p.id -eq $projectId -or $existingCanonical -eq $canonical) {
                $p.lastOpened = (Get-Date).ToString("o")
                break
            }
        }
        $registry.projects = $projectList.ToArray()
        Save-NexoraProjectRegistry -Registry $registry
        return [PSCustomObject]@{
            success = $true
            message = "Project already registered. Updated lastOpened."
            projectId = $projectId
        }
    }

    $displayName = if ($Name) { $Name } else { (Split-Path $canonical -Leaf) }

    $newProject = [PSCustomObject]@{
        id              = $projectId
        name            = $displayName
        path            = $canonical
        addedAt         = (Get-Date).ToString("o")
        lastOpened      = (Get-Date).ToString("o")
        primaryType     = "unknown"
        developmentMode = "mixed"
        status          = "ready"
    }

    $projectList.Add($newProject)
    $registry.projects = $projectList.ToArray()
    Save-NexoraProjectRegistry -Registry $registry

    return [PSCustomObject]@{
        success = $true
        message = "Project registered: $displayName"
        projectId = $projectId
    }
}

function Remove-NexoraManagedProject {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $registry = Get-NexoraProjectRegistry
    $kept = [System.Collections.Generic.List[psobject]]::new()
    $removed = $false

    if ($registry.projects) {
        foreach ($p in $registry.projects) {
            if ($p.id -eq $ProjectId) {
                $removed = $true
                # NOTE: We never delete project files, only the registry entry
            } else {
                $kept.Add($p)
            }
        }
    }

    if (-not $removed) {
        return [PSCustomObject]@{
            success = $false
            message = "Project ID not found in registry: $ProjectId"
        }
    }

    $registry.projects = $kept.ToArray()
    Save-NexoraProjectRegistry -Registry $registry

    return [PSCustomObject]@{
        success = $true
        message = "Project removed from Nexora registry. Project files remain untouched."
    }
}

function Get-NexoraManagedProjects {
    param(
        [switch]$ValidatePathsOnly
    )

    $registry = Get-NexoraProjectRegistry
    if (-not $registry.projects -or $registry.projects.Count -eq 0) {
        return @()
    }

    $projects = [System.Collections.Generic.List[psobject]]::new()
    foreach ($p in $registry.projects) {
        $pathExists = Test-Path $p.path
        $status = if ($pathExists) { $p.status } else { "missing" }

        $projects.Add([PSCustomObject]@{
            id              = $p.id
            name            = $p.name
            path            = $p.path
            addedAt         = $p.addedAt
            lastOpened      = $p.lastOpened
            primaryType     = $p.primaryType
            developmentMode = if ($p.PSObject.Properties["developmentMode"]) { $p.developmentMode } else { "mixed" }
            status          = $status
            pathExists      = $pathExists
        })
    }

    return ,$projects.ToArray()
}

function Find-NexoraManagedProjectById {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId
    )

    $all = Get-NexoraManagedProjects
    foreach ($p in $all) {
        if ($p.id -eq $ProjectId) {
            return $p
        }
    }
    return $null
}

function Update-NexoraManagedProjectClassification {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectId,
        [string]$PrimaryType = $null,
        [string]$DevelopmentMode = $null
    )

    $registry = Get-NexoraProjectRegistry
    $found = $false
    if ($registry.projects) {
        foreach ($p in $registry.projects) {
            if ($p.id -eq $ProjectId) {
                $found = $true
                if ($PrimaryType) {
                    if ($p.PSObject.Properties["primaryType"]) { $p.primaryType = $PrimaryType }
                    else { $p | Add-Member -NotePropertyName "primaryType" -NotePropertyValue $PrimaryType -Force }
                }
                if ($DevelopmentMode) {
                    if ($p.PSObject.Properties["developmentMode"]) { $p.developmentMode = $DevelopmentMode }
                    else { $p | Add-Member -NotePropertyName "developmentMode" -NotePropertyValue $DevelopmentMode -Force }
                }
                $p.lastOpened = (Get-Date).ToString("o")
                break
            }
        }
    }

    if ($found) {
        Save-NexoraProjectRegistry -Registry $registry
    }
    return $found
}
