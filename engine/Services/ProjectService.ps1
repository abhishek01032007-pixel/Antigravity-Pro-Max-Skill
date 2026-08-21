# ProjectService.ps1 - Project workspace resolution and validation

function Get-NexoraActiveProject {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Path = $null
    )

    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        if (Test-Path $Path) {
            return (Resolve-Path $Path).Path
        }
        throw "Specified project path does not exist: $Path"
    }

    $current = (Get-Location).Path
    return $current
}

function Find-NexoraRuntimeLocation {
    if ($env:NEXORA_INSTALL_PATH -and (Test-Path $env:NEXORA_INSTALL_PATH)) {
        return $env:NEXORA_INSTALL_PATH
    }

    if ($env:AGPM_INSTALL_PATH -and (Test-Path $env:AGPM_INSTALL_PATH)) {
        return $env:AGPM_INSTALL_PATH
    }

    foreach ($letter in [char[]]([char]'C'..[char]'Z')) {
        $candNexora = "$letter`:\Nexora Skills Manager"
        if (Test-Path $candNexora) { return $candNexora }

        $candAgpm = "$letter`:\Antigravity Pro Max Skill"
        if (Test-Path $candAgpm) { return $candAgpm }
    }

    return "C:\Antigravity Pro Max Skill"
}
