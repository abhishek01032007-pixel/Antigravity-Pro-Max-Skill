@echo off
setlocal

title Nexora Skills Manager

set "ROOT=%~dp0"
set "ENGINE=%ROOT%engine\Core\NexoraEngine.ps1"
set "LEGACY_SELECTOR=%ROOT%Loaders\agy-project.ps1"

if exist "%ENGINE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ENGINE%" %*
    exit /b %ERRORLEVEL%
)

if exist "%LEGACY_SELECTOR%" (
    echo.
    echo ========================================
    echo        NEXORA SKILLS MANAGER
    echo ========================================
    echo.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%LEGACY_SELECTOR%" %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Neither Nexora Engine nor legacy project selector could be found.
echo.
pause
exit /b 1

