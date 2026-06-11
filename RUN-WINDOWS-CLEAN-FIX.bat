@echo off
cd /d "%~dp0"
echo Force cleaning npm + project install state...
call npm config set registry https://registry.npmjs.org/
call npm cache clean --force
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json ren package-lock.json package-lock-broken.json
echo Installing fresh dependencies from public npm registry...
call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 pause & exit /b 1
echo Starting Mythic Quest 3D RPG...
call npm run dev
pause
