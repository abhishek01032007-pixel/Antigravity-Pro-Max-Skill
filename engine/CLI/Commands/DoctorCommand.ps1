# DoctorCommand.ps1 - Nexora Diagnostic & Self-Healing Health Check

function Invoke-DoctorCommand {
    param(
        [psobject]$ParsedArgs
    )

    $repair = $ParsedArgs.Flags.ContainsKey("repair")
    $jsonOut = $ParsedArgs.Flags.ContainsKey("json")

    $checks = [System.Collections.Generic.List[psobject]]::new()

    # 1. Check Runtime Location & Metadata
    $runtimePath = Resolve-NexoraInstalledRuntimePath
    $meta = Get-NexoraInstallationMetadata

    $metaInstallPath = if ($meta) { if ($meta.PSObject.Properties["installPath"] -and $meta.installPath) { $meta.installPath } elseif ($meta.PSObject.Properties["runtimeRoot"] -and $meta.runtimeRoot) { $meta.runtimeRoot } else { $null } } else { $null }
    $hasMeta = ($null -ne $metaInstallPath -and (Test-Path -LiteralPath $metaInstallPath))
    $checks.Add([PSCustomObject]@{
        Name   = "Installation Metadata"
        Status = if ($hasMeta) { "OK" } else { "WARN" }
        Detail = if ($hasMeta) { "Resolved via install.json: $metaInstallPath" } else { "install.json not found or missing installPath" }
    })

    # 2. Check Engine Entrypoint
    $engineFile = if ($runtimePath) { Join-Path $runtimePath "engine\Core\NexoraEngine.ps1" } else { $null }
    $hasEngine = ($engineFile -and (Test-Path $engineFile))
    $checks.Add([PSCustomObject]@{
        Name   = "Engine Core Entrypoint"
        Status = if ($hasEngine) { "OK" } else { "FAIL" }
        Detail = if ($hasEngine) { "Found: $engineFile" } else { "NexoraEngine.ps1 missing" }
    })

    # 3. Check Universal Skill Catalog
    $allSkills = Get-NexoraGlobalRegistry -LibraryRoot $runtimePath
    $hasSkills = ($allSkills.Count -ge 48)
    $checks.Add([PSCustomObject]@{
        Name   = "Universal Skill Catalog"
        Status = if ($hasSkills) { "OK" } else { "WARN" }
        Detail = "Loaded $($allSkills.Count)/48 available skills"
    })

    # 4. Check Command Shims & PATH
    $LocalApp = $env:LOCALAPPDATA
    if (-not $LocalApp) { $LocalApp = Join-Path $env:USERPROFILE "AppData\Local" }
    $binDir = Join-Path $LocalApp "NexoraSkillsManager\bin"
    $nexoraCmd = Join-Path $binDir "nexora.cmd"
    $hasCmd = (Test-Path $nexoraCmd)

    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $hasPath = ($UserPath -and $UserPath -like "*$binDir*")

    $checks.Add([PSCustomObject]@{
        Name   = "CLI Command Registration"
        Status = if ($hasCmd -and $hasPath) { "OK" } else { "WARN" }
        Detail = if ($hasCmd -and $hasPath) { "nexora.cmd active and registered in PATH" } else { "Command shim or PATH registration missing" }
    })

    # 5. Check Legacy Compatibility
    $agpmCmd = Join-Path $binDir "agpm.cmd"
    $hasAgpm = (Test-Path $agpmCmd)
    $checks.Add([PSCustomObject]@{
        Name   = "Legacy agpm Compatibility"
        Status = if ($hasAgpm) { "OK" } else { "WARN" }
        Detail = if ($hasAgpm) { "agpm.cmd backward compatibility active" } else { "agpm.cmd shim missing" }
    })

    # Auto-Repair if requested
    $repairsApplied = @()
    if ($repair) {
        $repairs = [System.Collections.Generic.List[string]]::new()
        
        # Repair Metadata
        if (-not $hasMeta) {
            $effectivePath = if ($runtimePath) { $runtimePath } else { (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) }
            Save-NexoraInstallationMetadata -InstallPath $effectivePath -Version "1.0.0" | Out-Null
            $repairs.Add("Restored install.json metadata pointing to $effectivePath")
        }

        # Repair Command Shims & PATH
        if (-not $hasCmd -or -not $hasAgpm -or -not $hasPath) {
            if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }

            $cmdContent = @'
@echo off
setlocal EnableExtensions
if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)
set "META=%LOCALAPPDATA%\NexoraSkillsManager\install.json"
if exist "%META%" (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-Content '%META%' -Raw | ConvertFrom-Json).installPath"`) do set "NEXORA_INSTALL_PATH=%%I"
)
if defined NEXORA_INSTALL_PATH if exist "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" (
    call "%NEXORA_INSTALL_PATH%\Start-Nexora-Skills-Manager.bat" %*
    exit /b %ERRORLEVEL%
)
echo [ERROR] Nexora Skills Manager runtime could not be located.
exit /b 1
'@
            Set-Content -Path $nexoraCmd -Value $cmdContent -Encoding ASCII
            Set-Content -Path $agpmCmd -Value "call `"%~dp0\nexora.cmd`" %*" -Encoding ASCII

            if (-not $hasPath) {
                $NewPath = if ($UserPath) { "$UserPath;$binDir" } else { $binDir }
                [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
            }
            $repairs.Add("Restored CLI command shims and PATH bindings")
        }

        $repairsApplied = $repairs.ToArray()
    }

    if ($jsonOut) {
        [PSCustomObject]@{
            runtimePath    = $runtimePath
            checks         = $checks
            repairsApplied = $repairsApplied
        } | ConvertTo-Json -Depth 4 | Write-Host
        return 0
    }

    Write-NexoraBanner
    Write-Host "Nexora Diagnostic Doctor:" -ForegroundColor Yellow
    Write-Host ""

    foreach ($c in $checks) {
        $color = switch ($c.Status) {
            "OK"   { "Green" }
            "WARN" { "Yellow" }
            "FAIL" { "Red" }
        }
        Write-Host "  [$($c.Status)] " -ForegroundColor $color -NoNewline
        Write-Host "$($c.Name): " -ForegroundColor White -NoNewline
        Write-Host "$($c.Detail)" -ForegroundColor DarkGray
    }

    Write-Host ""
    if ($repairsApplied.Count -gt 0) {
        Write-Host "Repairs Applied:" -ForegroundColor Cyan
        foreach ($r in $repairsApplied) {
            Write-Host "  - $r" -ForegroundColor Green
        }
        Write-Host ""
    }
    elseif (-not $repair -and ($checks | Where-Object { $_.Status -ne "OK" })) {
        Write-Host "Tip: Run 'nexora doctor --repair' to automatically heal configuration." -ForegroundColor DarkYellow
        Write-Host ""
    }

    return 0
}
