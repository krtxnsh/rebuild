@echo off
setlocal
cd /d "%~dp0"
set "REBUILD_PYTHON=C:\Program Files\Blender Foundation\Blender 5.3\5.3\python\bin\python.exe"
set "REBUILD_PORT=51789"
set "REBUILD_URL=http://127.0.0.1:%REBUILD_PORT%/"

if not exist "%REBUILD_PYTHON%" (
  echo REBUILD could not find its local Python runtime.
  echo Expected: %REBUILD_PYTHON%
  echo.
  echo Press any key to close.
  pause >nul
  exit /b 1
)

start "REBUILD local server" /min "%REBUILD_PYTHON%" -m http.server %REBUILD_PORT% --bind 127.0.0.1

rem Give the server a moment to bind before opening the game.
ping 127.0.0.1 -n 3 >nul
if not "%REBUILD_NO_BROWSER%"=="1" start "" "%REBUILD_URL%"
