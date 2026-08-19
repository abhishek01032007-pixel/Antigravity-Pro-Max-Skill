@echo off
setlocal

title Antigravity Pro Max

set "ROOT=%~dp0"
set "SELECTOR=%ROOT%Loaders\agy-project.ps1"

echo.
echo ========================================
echo        ANTIGRAVITY PRO MAX
echo ========================================
echo.

if not exist "%SELECTOR%" (
    echo [ERROR] Project selector was not found.
    echo.
    echo Expected:
    echo %SELECTOR%
    echo.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SELECTOR%"

echo.
pause
