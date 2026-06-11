@echo off
cd /d "%~dp0"
echo Fixing npm registry to public npm...
call npm config set registry https://registry.npmjs.org/
echo Cleaning old broken install folders if present...
if exist node_modules rmdir /s /q node_modules
if exist package-lock-broken.json del package-lock-broken.json
echo Installing Mythic Quest dependencies...
call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo.
  echo Install failed. Close VS Code, browser dev server, and antivirus scan if it is locking node_modules.
  echo Then run this file again as Administrator.
  pause
  exit /b 1
)
echo Starting Mythic Quest 3D RPG...
call npm run dev
pause
