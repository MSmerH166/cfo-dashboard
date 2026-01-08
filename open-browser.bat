@echo off
chcp 65001 >nul
title Open CFO System in Browser

echo.
echo ============================================
echo    Opening CFO System in Browser
echo ============================================
echo.

REM Check if servers are running
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Frontend Server is not running on port 5173
    echo.
    echo Please start the system first using:
    echo   - START-HERE.bat
    echo   - or start-simple.bat
    echo.
    pause
    exit /b 1
)

echo Frontend Server is running
echo.

REM Try to open browser with multiple methods
echo Opening browser...

REM Method 1: Default browser
start "" http://localhost:5173
timeout /t 2 /nobreak >nul

REM Method 2: Try Chrome
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo Trying Chrome...
    start chrome http://localhost:5173
    timeout /t 1 /nobreak >nul
)

REM Method 3: Try Edge
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    echo Trying Edge...
    start msedge http://localhost:5173
    timeout /t 1 /nobreak >nul
)

REM Method 4: Try Firefox
where firefox >nul 2>&1
if %errorlevel% equ 0 (
    echo Trying Firefox...
    start firefox http://localhost:5173
    timeout /t 1 /nobreak >nul
)

echo.
echo ============================================
echo Browser should be opened now
echo ============================================
echo.
echo URL: http://localhost:5173
echo.
echo Login Credentials:
echo    Email: admin@bonyan.com
echo    Password: admin123
echo.
echo If browser didn't open, please open it manually and go to:
echo http://localhost:5173
echo.
pause
