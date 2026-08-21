# CursorAdapter.ps1 - Cursor IDE Rule Compiler

function Deploy-CursorSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [array]$SkillObjects
    )

    $cursorDir = Join-Path $ProjectRoot ".cursor\rules"
    if (-not (Test-Path $cursorDir)) {
        New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null
    }

    $deployed = [System.Collections.Generic.List[string]]::new()

    foreach ($skill in $SkillObjects) {
        $skillMd = Join-Path $skill.Path "SKILL.md"
        if (Test-Path $skillMd) {
            $destFile = Join-Path $cursorDir "$($skill.Id).mdc"
            Copy-Item -Path $skillMd -Destination $destFile -Force | Out-Null
            $deployed.Add($skill.Id)
        }
    }

    return [PSCustomObject]@{
        Platform = "Cursor"
        TargetDirectory = $cursorDir
        DeployedSkills = $deployed.ToArray()
    }
}
