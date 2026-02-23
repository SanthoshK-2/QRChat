@echo off
TITLE Check Aiven Cloud Data
COLOR 0A

echo ===================================================
echo       CHECKING AIVEN CLOUD DATABASE DATA
echo ===================================================
echo.
echo [INFO] Connecting to Render API to verify stored data...
echo.

call node scripts/check_cloud_data.js

echo.
echo ===================================================
echo [INFO] If you see data above, your database is SAFE.
echo [INFO] In MySQL Workbench, please REFRESH the Schemas.
echo ===================================================
echo.
pause
