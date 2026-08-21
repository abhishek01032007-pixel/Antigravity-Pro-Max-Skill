# MetadataParser.ps1 - Universal Skill Metadata Extractor & Frontmatter Parser

function Parse-NexoraSkillMetadata {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SkillDirectory
    )

    $skillMd = Join-Path $SkillDirectory "SKILL.md"
    if (-not (Test-Path $skillMd)) {
        return $null
    }

    $folderName = Split-Path $SkillDirectory -Leaf
    $parentPack = Split-Path (Split-Path $SkillDirectory -Parent) -Leaf

    # Default metadata schema
    $metadata = [PSCustomObject]@{
        id           = $folderName
        name         = $folderName
        description  = ""
        category     = "General"
        technology   = "generic"
        platform     = "all"
        version      = "1.0.0"
        dependencies = @()
        conflicts    = @()
        priority     = 50
        path         = $SkillDirectory
        hasFullDoc   = $true
    }

    # Heuristic category/technology derivation from pack location
    if ($parentPack -eq "Frontend-Pro-Max") {
        $metadata.category = "Frontend"
        if ($folderName -like "*flutter*" -or $folderName -like "*mobile*") {
            $metadata.technology = "flutter"
        } elseif ($folderName -like "*react*" -or $folderName -like "*web*") {
            $metadata.technology = "react"
        }
    }
    elseif ($parentPack -eq "Backend-Pro-Max") {
        $metadata.category = "Backend"
    }
    elseif ($parentPack -eq "QA-Debug-Pro-Max") {
        $metadata.category = "QA-Debug"
        if ($folderName -like "*dart*" -or $folderName -like "*flutter*") {
            $metadata.technology = "flutter"
        }
    }
    elseif ($parentPack -eq "Python") {
        $metadata.category = "Backend-Framework"
        $metadata.technology = "python"
    }
    elseif ($parentPack -eq "NodeJS") {
        $metadata.category = "Backend-Framework"
        $metadata.technology = "nodejs"
    }
    elseif ($parentPack -eq "Fullstack-Extras") {
        $metadata.category = "Fullstack"
    }

    # Parse YAML frontmatter if present
    $lines = Get-Content $skillMd -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($lines -and $lines.Count -gt 0 -and $lines[0].Trim() -eq "---") {
        $inFrontmatter = $true
        $fmLines = @()
        for ($i = 1; $i -lt $lines.Count; $i++) {
            if ($lines[$i].Trim() -eq "---") {
                $inFrontmatter = $false
                break
            }
            $fmLines += $lines[$i]
        }

        foreach ($fLine in $fmLines) {
            if ($fLine -match "^name:\s*(.+)$") {
                $metadata.name = $matches[1].Trim('"', "'", ' ')
            }
            elseif ($fLine -match "^description:\s*(.+)$") {
                $metadata.description = $matches[1].Trim('"', "'", ' ')
            }
            elseif ($fLine -match "^category:\s*(.+)$") {
                $metadata.category = $matches[1].Trim('"', "'", ' ')
            }
            elseif ($fLine -match "^technology:\s*(.+)$") {
                $metadata.technology = $matches[1].Trim('"', "'", ' ').ToLower()
            }
            elseif ($fLine -match "^platform:\s*(.+)$") {
                $metadata.platform = $matches[1].Trim('"', "'", ' ').ToLower()
            }
            elseif ($fLine -match "^version:\s*(.+)$") {
                $metadata.version = $matches[1].Trim('"', "'", ' ')
            }
            elseif ($fLine -match "^priority:\s*(\d+)$") {
                $metadata.priority = [int]$matches[1]
            }
        }
    }

    return $metadata
}
