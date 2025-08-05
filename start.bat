@echo off
echo.
echo  ========================
echo   Starting Lemur App...
echo  ========================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Run the Node.js start script
node start-app.js

pause