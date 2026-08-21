# GlobalSkillRegistry.ps1 - Global Skill Repository, Catalog Indexer & Category Normalizer

$metaParser = Join-Path (Split-Path $PSScriptRoot -Parent) "Metadata\MetadataParser.ps1"
if (Test-Path $metaParser) { . $metaParser }

# Backward-compatible category normalization map
# Maps existing metadata categories to the expanded 16-category taxonomy
# without requiring SKILL.md file rewrites
$Script:NexoraCategoryMap = @{
    "frontend"          = "Frontend"
    "backend"           = "Backend"
    "qa-debug"          = "QA / Testing"
    "qa"                = "QA / Testing"
    "fullstack"         = "Full Stack"
    "full-stack"        = "Full Stack"
    "backend-framework" = "Backend"
    "general"           = "Tooling"
    "mobile"            = "Mobile"
    "desktop"           = "Desktop"
    "database"          = "Database"
    "cloud"             = "Cloud"
    "devops"            = "DevOps"
    "security"          = "Security"
    "architecture"      = "Architecture"
    "performance"       = "Performance"
    "accessibility"     = "Accessibility"
    "documentation"     = "Documentation"
    "tooling"           = "Tooling"
    "ai"                = "AI / ML"
    "ai/ml"             = "AI / ML"
}

# Skill-specific category overrides for more precise categorization
# Applied on top of pack-based heuristic categories, without touching SKILL.md files
$Script:NexoraSkillCategoryOverrides = @{
    "architect-review"                   = "Architecture"
    "architecture-patterns"              = "Architecture"
    "software_architecture"              = "Architecture"
    "security_audit"                     = "Security"
    "backend-security-coder"             = "Security"
    "web_performance_optimization"       = "Performance"
    "optimize_codebase"                  = "Performance"
    "mobile-developer"                   = "Mobile"
    "e2e-testing-patterns"               = "QA / Testing"
    "code_review"                        = "QA / Testing"
    "code-review-excellence"             = "QA / Testing"
    "document_api"                       = "Documentation"
}

function Resolve-NexoraSkillCategory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$RawCategory,
        [Parameter(Mandatory=$false)]
        [string]$SkillId = ""
    )

    # 1. Check skill-specific override first
    if ($SkillId -and $Script:NexoraSkillCategoryOverrides.ContainsKey($SkillId.ToLower())) {
        return $Script:NexoraSkillCategoryOverrides[$SkillId.ToLower()]
    }

    # 2. Check normalization map (lowercase lookup)
    $lowerCat = $RawCategory.ToLower()
    if ($Script:NexoraCategoryMap.ContainsKey($lowerCat)) {
        return $Script:NexoraCategoryMap[$lowerCat]
    }

    # 3. Return original if no mapping found
    return $RawCategory
}

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
                    $normalizedCategory = Resolve-NexoraSkillCategory -RawCategory $meta.category -SkillId $meta.id
                    $registry.Add([PSCustomObject]@{
                        Id                = $meta.id
                        Name              = $meta.name
                        Description       = $meta.description
                        Category          = $normalizedCategory
                        RawCategory       = $meta.category
                        Technology        = $meta.technology
                        Platform          = $meta.platform
                        Version           = $meta.version
                        Pack              = $pack
                        Path              = $folder.FullName
                        Status            = "Available"
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
                    $normalizedCategory = Resolve-NexoraSkillCategory -RawCategory $meta.category -SkillId $meta.id
                    $registry.Add([PSCustomObject]@{
                        Id                = $meta.id
                        Name              = $meta.name
                        Description       = $meta.description
                        Category          = $normalizedCategory
                        RawCategory       = $meta.category
                        Technology        = $meta.technology
                        Platform          = $meta.platform
                        Version           = $meta.version
                        Pack              = "Backend-Frameworks/$($sf.Name)"
                        Path              = $folder.FullName
                        Status            = "Available"
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

function Get-NexoraSkillCategories {
    return @(
        "Frontend",
        "Backend",
        "Full Stack",
        "Mobile",
        "Desktop",
        "Database",
        "Cloud",
        "DevOps",
        "QA / Testing",
        "Security",
        "Architecture",
        "Performance",
        "Accessibility",
        "Documentation",
        "Tooling",
        "AI / ML"
    )
}
