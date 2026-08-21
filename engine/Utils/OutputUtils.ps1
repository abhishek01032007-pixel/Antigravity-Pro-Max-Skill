# OutputUtils.ps1 - Terminal rendering, banners, and table formatters

function Write-NexoraBanner {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "            NEXORA SKILLS MANAGER" -ForegroundColor Cyan
    Write-Host "      Modular AI Agent Skill Orchestration" -ForegroundColor DarkCyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-NexoraSuccess {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-NexoraInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-NexoraWarn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-NexoraError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-NexoraTable {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Items,

        [Parameter(Mandatory=$true)]
        [array]$Columns
    )

    $Items | Format-Table -Property $Columns -AutoSize | Out-String | Write-Host
}
