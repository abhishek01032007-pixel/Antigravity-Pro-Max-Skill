# PathUtils.ps1 - Path sanitization and workspace boundary utilities

function Resolve-NexoraPath {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return (Get-Location).Path
    }

    if (Test-Path $Path) {
        return (Resolve-Path $Path).Path
    }

    return [System.IO.Path]::GetFullPath($Path)
}

function Test-PathIsSubfolder {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ChildPath,

        [Parameter(Mandatory=$true)]
        [string]$ParentPath
    )

    $normalizedChild = (Resolve-NexoraPath $ChildPath).TrimEnd('\', '/')
    $normalizedParent = (Resolve-NexoraPath $ParentPath).TrimEnd('\', '/')

    return $normalizedChild.StartsWith($normalizedParent, [System.StringComparison]::OrdinalIgnoreCase)
}

function Ensure-DirectoryExists {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
    return $Path
}
