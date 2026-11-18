@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer to start REBUILD locally.
  pause
  exit /b 1
)
node scripts\serve.mjs 51789 --open
if errorlevel 1 pause
