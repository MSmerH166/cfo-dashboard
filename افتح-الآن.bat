@echo off
chcp 65001 >nul
title فتح نظام CFO

echo.
echo ============================================
echo    فتح نظام CFO في المتصفح
echo ============================================
echo.

REM Check if server is running
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend Server يعمل
    echo.
    echo جاري فتح المتصفح...
    echo.
    start http://localhost:5173
    timeout /t 1 /nobreak >nul
    start chrome http://localhost:5173 2>nul
    start msedge http://localhost:5173 2>nul
    echo.
    echo ✅ تم فتح المتصفح
    echo.
    echo العنوان: http://localhost:5173
    echo.
    echo 🔑 بيانات الدخول:
    echo    Email: admin@bonyan.com
    echo    Password: admin123
    echo.
) else (
    echo ⚠️  Frontend Server غير نشط
    echo.
    echo يرجى تشغيل النظام أولاً:
    echo   1. انقر نقراً مزدوجاً على: START-HERE.bat
    echo   2. انتظر حتى تفتح نوافذ CMD
    echo   3. ثم شغّل هذا الملف مرة أخرى
    echo.
    echo أو افتح المتصفح يدوياً وانتقل إلى:
    echo   http://localhost:5173
    echo.
)

pause

