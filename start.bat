@echo off
echo ============================================
echo تشغيل نظام CFO - التحليل المالي
echo ============================================
echo.

echo [1/2] تثبيت Dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ فشل تثبيت الحزم
    pause
    exit /b 1
)

echo.
echo [2/2] بدء تشغيل النظام...
echo.
echo 🚀 Backend Server: http://localhost:3001
echo 🌐 Frontend App: http://localhost:5173
echo.
echo 🔑 بيانات الدخول:
echo    Email: admin@bonyan.com
echo    Password: admin123
echo.
echo ============================================
echo يرجى عدم إغلاق هذه النافذة
echo ============================================
echo.

start /B npm run server
timeout /t 3 /nobreak >nul
start /B npm run dev

echo.
echo ✅ النظام يعمل الآن!
echo.
echo للوصول للنظام: http://localhost:5173
echo.

pause
