Add-Type -AssemblyName System.Windows.Forms

$MainLoader = Join-Path $PSScriptRoot "agy-skills.ps1"

if (-not (Test-Path $MainLoader)) {
    Write-Host "[ERROR] Main loader not found:" -ForegroundColor Red
    Write-Host $MainLoader
    exit 1
}

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select the Antigravity project folder"
$dialog.ShowNewFolderButton = $false

$result = $dialog.ShowDialog()

if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Host "`nProject selection cancelled." -ForegroundColor Yellow
    exit
}

$ProjectRoot = $dialog.SelectedPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      ANTIGRAVITY PROJECT SELECTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Selected project:" -ForegroundColor Yellow
Write-Host $ProjectRoot
Write-Host ""

Write-Host "Choose development mode:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] Frontend Pro Max"
Write-Host "[2] Backend Pro Max"
Write-Host "[3] QA / Debug Pro Max"
Write-Host "[4] Full Stack Pro Max"
Write-Host "[5] Default Antigravity"
Write-Host "[6] Status"
Write-Host "[C] Cancel"

while ($true) {

    $choice = (Read-Host "`nSelection").ToUpper()

    switch ($choice) {

        "1" {
            $mode = "frontend"
            break
        }

        "2" {
            $mode = "backend"
            break
        }

        "3" {
            $mode = "qa"
            break
        }

        "4" {
            $mode = "fullstack"
            break
        }

        "5" {
            $mode = "default"
            break
        }

        "6" {
            $mode = "status"
            break
        }

        "C" {
            Write-Host "Cancelled." -ForegroundColor Yellow
            exit
        }

        default {
            Write-Host "Enter 1, 2, 3, 4, 5, 6, or C." -ForegroundColor Yellow
        }
    }

    if ($mode) {
        break
    }
}

Push-Location $ProjectRoot

try {

    & $MainLoader $mode

}
finally {

    Pop-Location
}

