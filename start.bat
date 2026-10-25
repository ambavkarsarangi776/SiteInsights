@echo off
title SiteInsight
cd /d "%~dp0"
echo ==============================================
echo   SiteInsight - Website Speed Diagnosis
echo ==============================================
echo.

:: Free port 3001 if a previous instance is already holding it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting local server on http://localhost:3001 ...
echo.

:: Open browser after 2 seconds once server is ready
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3001'"

:: Run node server
node server.js

pause
