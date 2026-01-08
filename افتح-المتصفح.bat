@echo off
chcp 65001 >nul
title فتح نظام CFO في المتصفح

echo.
echo ============================================
echo    فتح نظام CFO في المتصفح
echo ============================================
echo.

REM Check if servers are running
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Frontend Server غير نشط على المنفذ 5173
    echo.
    echo يرجى تشغيل النظام أولاً باستخدام:
    echo   - START-HERE.bat
    echo   - أو start-simple.bat
    echo.
    pause
    exit /b 1
)

echo ✅ Frontend Server يعمل
echo.

REM Try to open browser with multiple methods
echo جاري فتح المتصفح...

REM Method 1: Default browser
start "" http://localhost:5173
timeout /t 2 /nobreak >nul

REM Method 2: Try Chrome
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo محاولة فتح Chrome...
    start chrome http://localhost:5173
    timeout /t 1 /nobreak >nul
)

REM Method 3: Try Edge
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    echo محاولة فتح Edge...
    start msedge http://localhost:5173
    timeout /t 1 /nobreak >nul
)

REM Method 4: Try Firefox
where firefox >nul 2>&1
if %errorlevel% equ 0 (
    echo محاولة فتح Firefox...
    start firefox http://localhost:5173
    timeout /t 1 /nobreak >nul
)

echo.
echo ============================================
echo ✅ تم فتح المتصفح
echo ============================================
echo.
echo العنوان: http://localhost:5173
echo.
echo 🔑 بيانات الدخول:
echo    Email: admin@bonyan.com
echo    Password: admin123
echo.
echo إذا لم يفتح المتصفح، يرجى فتحه يدوياً والانتقال إلى:
echo http://localhost:5173
echo.
pause

