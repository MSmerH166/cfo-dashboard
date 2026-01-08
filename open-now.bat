@echo off
chcp 65001 >nul
title Open CFO System

echo.
echo ============================================
echo    Opening CFO System in Browser
echo ============================================
echo.

REM Check if server is running
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend Server is running
    echo.
    echo Opening browser...
    echo.
    start http://localhost:5173
    timeout /t 1 /nobreak >nul
    start chrome http://localhost:5173 2>nul
    start msedge http://localhost:5173 2>nul
    echo.
    echo Browser opened!
    echo.
    echo URL: http://localhost:5173
    echo.
    echo Login Credentials:
    echo    Email: admin@bonyan.com
    echo    Password: admin123
    echo.
) else (
    echo Frontend Server is NOT running
    echo.
    echo Please start the system first:
    echo   1. Double-click: START-HERE.bat
    echo   2. Wait for CMD windows to open
    echo   3. Then run this file again
    echo.
    echo Or open browser manually and go to:
    echo   http://localhost:5173
    echo.
)

pause

