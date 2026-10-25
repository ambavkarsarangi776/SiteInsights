@echo off
title SiteInsight - MySQL Setup
cd /d "%~dp0"
echo ========================================================
echo   SiteInsight - MySQL Database Setup
echo ========================================================
echo.
echo Running database setup with credentials from .env...
echo.
node db/init.js
echo.
echo ========================================================
echo Setup finished. Press any key to exit.
pause >nul
