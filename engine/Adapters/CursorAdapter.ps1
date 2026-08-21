# CursorAdapter.ps1 - Cursor IDE Rule Compiler & Remover

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

function Undeploy-CursorSkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds
    )

    $cursorDir = Join-Path $ProjectRoot ".cursor\rules"
    $removed = [System.Collections.Generic.List[string]]::new()

    foreach ($id in $SkillIds) {
        $destFile = Join-Path $cursorDir "$id.mdc"
        if (Test-Path $destFile) {
            Remove-Item -Path $destFile -Force -ErrorAction SilentlyContinue
            $removed.Add($id)
        }
    }

    return [PSCustomObject]@{
        Platform = "Cursor"
        TargetDirectory = $cursorDir
        RemovedSkills = $removed.ToArray()
    }
}
