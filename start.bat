@echo off
title SiteInsight
cd /d "%~dp0"
echo ==============================================
echo   SiteInsight - Website Speed Diagnosis
echo ==============================================
echo.
echo Starting local server on http://localhost:3001 ...
echo.

:: Open browser after 2 seconds once server is ready
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3001'"

:: Run node server
node server.js

pause
