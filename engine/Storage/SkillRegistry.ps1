# SkillRegistry.ps1 - Skill Library Indexer & Discovery

function Get-NexoraSkillRegistry {
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

    $skills = [System.Collections.Generic.List[psobject]]::new()

    foreach ($pack in $packs) {
        $packPath = Join-Path $LibraryRoot $pack
        if (Test-Path $packPath) {
            $folders = Get-ChildItem $packPath -Directory -ErrorAction SilentlyContinue
            foreach ($folder in $folders) {
                $skillMd = Join-Path $folder.FullName "SKILL.md"
                if (Test-Path $skillMd) {
                    $skills.Add([PSCustomObject]@{
                        Id       = $folder.Name
                        Pack     = $pack
                        Category = $pack.Replace("-Pro-Max", "").Replace("-Extras", "")
                        Path     = $folder.FullName
                        Valid    = $true
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
                $skillMd = Join-Path $folder.FullName "SKILL.md"
                if (Test-Path $skillMd) {
                    $skills.Add([PSCustomObject]@{
                        Id       = $folder.Name
                        Pack     = "Backend-Frameworks/$($sf.Name)"
                        Category = "Framework-$($sf.Name)"
                        Path     = $folder.FullName
                        Valid    = $true
                    })
                }
            }
        }
    }

    return $skills.ToArray()
}
