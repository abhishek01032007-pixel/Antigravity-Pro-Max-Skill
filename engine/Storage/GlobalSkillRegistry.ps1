# GlobalSkillRegistry.ps1 - Global Skill Repository and Available Catalog Indexer

function Get-NexoraGlobalRegistry {
    param(
        [Parameter(Mandatory=$false)]
        [string]$LibraryRoot = $null
    )

    if (-not $LibraryRoot) {
        $LibraryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    }

    $packs = @(
        "Frontend-Pro-Max",
        "Backend-Pro-Max",
        "QA-Debug-Pro-Max",
        "Fullstack-Extras"
    )

    $registry = [System.Collections.Generic.List[psobject]]::new()

    foreach ($pack in $packs) {
        $packPath = Join-Path $LibraryRoot $pack
        if (Test-Path $packPath) {
            $folders = Get-ChildItem $packPath -Directory -ErrorAction SilentlyContinue
            foreach ($folder in $folders) {
                $meta = Parse-NexoraSkillMetadata -SkillDirectory $folder.FullName
                if ($meta) {
                    $registry.Add([PSCustomObject]@{
                        Id          = $meta.id
                        Name        = $meta.name
                        Description = $meta.description
                        Category    = $meta.category
                        Technology  = $meta.technology
                        Platform    = $meta.platform
                        Version     = $meta.version
                        Pack        = $pack
                        Path        = $folder.FullName
                        Status      = "Available"
                    })
                }
            }
        }
    }

    # Backend Frameworks
    $frameworkRoot = Join-Path $LibraryRoot "Backend-Frameworks"
    if (Test-Path $frameworkRoot) {
        $subFrameworks = Get-ChildItem $frameworkRoot -Directory -ErrorAction SilentlyContinue
        foreach ($sf in $subFrameworks) {
            $fwSkills = Get-ChildItem $sf.FullName -Directory -ErrorAction SilentlyContinue
            foreach ($folder in $fwSkills) {
                $meta = Parse-NexoraSkillMetadata -SkillDirectory $folder.FullName
                if ($meta) {
                    $registry.Add([PSCustomObject]@{
                        Id          = $meta.id
                        Name        = $meta.name
                        Description = $meta.description
                        Category    = $meta.category
                        Technology  = $meta.technology
                        Platform    = $meta.platform
                        Version     = $meta.version
                        Pack        = "Backend-Frameworks/$($sf.Name)"
                        Path        = $folder.FullName
                        Status      = "Available"
                    })
                }
            }
        }
    }

    return ,$registry.ToArray()
}

function Find-NexoraGlobalSkillById {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillId,
        [Parameter(Mandatory=$false)]
        [string]$LibraryRoot = $null
    )

    $all = Get-NexoraGlobalRegistry -LibraryRoot $LibraryRoot
    foreach ($s in $all) {
        if ($s.Id.ToLower() -eq $SkillId.ToLower()) {
            return $s
        }
    }
    return $null
}
