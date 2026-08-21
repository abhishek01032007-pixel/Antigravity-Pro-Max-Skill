# AntigravityAdapter.ps1 - Native Google Antigravity Skill Deployer & Undeployer

function Deploy-AntigravitySkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [array]$SkillObjects
    )

    $targetDir = Join-Path $ProjectRoot ".agents\skills"
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $deployed = [System.Collections.Generic.List[string]]::new()

    foreach ($skill in $SkillObjects) {
        $dest = Join-Path $targetDir $skill.Id
        if (Test-Path $skill.Path) {
            Copy-Item -Path $skill.Path -Destination $dest -Recurse -Force | Out-Null
            $deployed.Add($skill.Id)
        }
    }

    return [PSCustomObject]@{
        Platform = "Antigravity"
        TargetDirectory = $targetDir
        DeployedSkills = $deployed.ToArray()
    }
}

function Undeploy-AntigravitySkills {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory=$true)]
        [string[]]$SkillIds
    )

    $targetDir = Join-Path $ProjectRoot ".agents\skills"
    $removed = [System.Collections.Generic.List[string]]::new()

    foreach ($id in $SkillIds) {
        $dest = Join-Path $targetDir $id
        if (Test-Path $dest) {
            Remove-Item -Path $dest -Recurse -Force -ErrorAction SilentlyContinue
            $removed.Add($id)
        }
    }

    return [PSCustomObject]@{
        Platform = "Antigravity"
        TargetDirectory = $targetDir
        RemovedSkills = $removed.ToArray()
    }
}
