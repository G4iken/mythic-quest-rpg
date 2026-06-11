@echo off
cd /d "%~dp0"
echo Setting npm registry to public npm...
call npm config set registry https://registry.npmjs.org/

echo Installing dependencies if needed...
if not exist node_modules call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo Install failed. Run RUN-WINDOWS-CLEAN-FIX.bat first.
  pause
  exit /b 1
)

echo Building web game...
call npm run build
if errorlevel 1 pause & exit /b 1

if not exist android (
  echo Creating Capacitor Android project...
  call npx cap add android
  if errorlevel 1 pause & exit /b 1
)

echo Syncing Capacitor Android project...
call npx cap sync android
if errorlevel 1 pause & exit /b 1

echo Forcing Android landscape orientation...
call npm run android:landscape
if errorlevel 1 pause & exit /b 1

echo Opening Android Studio...
call npx cap open android
pause
