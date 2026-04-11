@echo off
echo [1/4] Building Web Assets (Vite)...
call npm run build

if %ERRORLEVEL% neq 0 (
    echo.
    echo !!!!!!!! Error occurred during npm build !!!!!!!!
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Syncing with Capacitor...
call npx cap sync android

echo [3/4] Navigating to Android folder...
cd android

echo [4/4] Generating APK (Gradle)...
call gradlew assembleDebug

echo.
echo ======================================================
echo BUILD FINISHED SUCCESSFULLY!
echo You can find your APK in: android\app\build\outputs\apk\debug\
echo ======================================================
pause