@echo off
TITLE QR Chat - Project Demo Mode
COLOR 0A

echo ===================================================
echo       QR CHAT - PROJECT DEMO STARTUP SCRIPT
echo ===================================================
echo.
echo [INFO] This script runs the application LOCALLY.
echo [INFO] It connects directly to your MySQL Workbench.
echo [INFO] Use this for your Viva/Presentation.
echo.

:: 1. Check MySQL Connection
echo [STEP 1/3] Checking Database Connection...
cd server
call node check_local_db.js
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Could not connect to MySQL Workbench!
    echo Please ensure MySQL is running and credentials in .env are correct.
    pause
    exit
)
cd ..

:: 2. Start Backend Server
echo.
echo [STEP 2/3] Starting Backend Server...
start "QR Chat Server" cmd /k "cd server && npm start"
timeout /t 5 >nul

:: 3. Start Frontend Client
echo.
echo [STEP 3/3] Starting Frontend Website...
start "QR Chat Client" cmd /k "cd client && npm run dev"

:: 4. Open Browser
echo.
echo [SUCCESS] Application started! Opening browser...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ===================================================
echo    DEMO RUNNING - DO NOT CLOSE THIS WINDOW
echo ===================================================
echo.
echo Data will be stored in your MySQL Workbench 'chate' database.
echo New registrations will also be logged to 'DEMO_LOGS.txt'.
echo.
pause
