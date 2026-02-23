@echo off
TITLE QR Chat - Realtime Data Sync
COLOR 0B

echo ===================================================
echo    QR CHAT - LIVE DATA SYNC (RENDER -> LOCAL)
echo ===================================================
echo.
echo [INFO] This script syncs data between LIVE website and LOCAL MySQL.
echo [INFO] It AUTOMATICALLY RESTORES data if the Cloud server restarts.
echo [INFO] Keep this window open to ensure permanent data safety.
echo.
echo Press any key to start syncing...
pause >nul

:loop
cls
echo ===================================================
echo    SYNCING DATA... (%time%)
echo ===================================================
call node scripts/live_sync.js
echo.
echo [INFO] Waiting 10 seconds before next sync...
timeout /t 10
goto loop
