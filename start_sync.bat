@echo off
TITLE QR Chat - Realtime Data Sync
COLOR 0B

echo ===================================================
echo    QR CHAT - LIVE DATA SYNC (RENDER -> LOCAL)
echo ===================================================
echo.
echo [INFO] This script pulls user data from the LIVE website
echo [INFO] and saves it to your LOCAL MySQL Workbench.
echo.
echo Press any key to start syncing...
pause >nul

:loop
cls
echo ===================================================
echo    SYNCING DATA... (%time%)
echo ===================================================
cd scripts
call node live_sync.js
cd ..
echo.
echo [INFO] Waiting 10 seconds before next sync...
timeout /t 10
goto loop
