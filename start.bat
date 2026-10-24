@echo off
title SiteInsight
echo ==============================================
echo   SiteInsight - Website Speed Diagnosis
echo ==============================================
echo.
echo Starting local server on http://localhost:3001 ...
echo Opening your browser...
echo.

start "" http://localhost:3001
node server.js

pause
