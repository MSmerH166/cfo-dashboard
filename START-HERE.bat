@echo off
chcp 65001 >nul
title تشغيل نظام CFO
color 0A

echo.
echo ============================================
echo    تشغيل نظام CFO - التحليل المالي
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت!
    echo.
    echo يرجى تثبيت Node.js من:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js موجود
node --version
echo.

REM Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] npm غير موجود!
    pause
    exit /b 1
)

echo [✓] npm موجود
npm --version
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo [1/3] تثبيت الحزم...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [خطأ] فشل تثبيت الحزم
        pause
        exit /b 1
    )
    echo.
) else (
    echo [✓] الحزم مثبتة مسبقاً
    echo.
)

REM Start Backend
echo [2/3] بدء تشغيل Backend Server...
start "CFO Backend - Port 3001" cmd /k "title CFO Backend && npm run server"
timeout /t 5 /nobreak >nul

REM Start Frontend
echo [3/3] بدء تشغيل Frontend...
start "CFO Frontend - Port 5173" cmd /k "title CFO Frontend && npm run dev"
timeout /t 6 /nobreak >nul

echo.
echo ============================================
echo    ✅ النظام يعمل الآن!
echo ============================================
echo.
echo 🚀 Backend: http://localhost:3001
echo 🌐 Frontend: http://localhost:5173
echo.
echo 🔑 بيانات الدخول:
echo    Email: admin@bonyan.com
echo    Password: admin123
echo.
echo ============================================
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo تم فتح المتصفح تلقائياً
echo.
echo ملاحظة: الخوادم تعمل في نوافذ CMD منفصلة
echo لا تغلق هذه النوافذ لإبقاء النظام يعمل
echo.
pause

