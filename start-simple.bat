@echo off
chcp 65001 >nul
echo ============================================
echo تشغيل نظام CFO - التحليل المالي
echo ============================================
echo.

echo [1/3] تثبيت Dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ فشل تثبيت الحزم
    pause
    exit /b 1
)

echo.
echo [2/3] بدء تشغيل Backend Server...
start "Backend Server" cmd /k "npm run server"
timeout /t 5 /nobreak >nul

echo.
echo [3/3] بدء تشغيل Frontend...
start "Frontend Dev Server" cmd /k "npm run dev"
timeout /t 6 /nobreak >nul

echo.
echo ============================================
echo 🚀 Backend Server: http://localhost:3001
echo 🌐 Frontend App: http://localhost:5173
echo.
echo 🔑 بيانات الدخول:
echo    Email: admin@bonyan.com
echo    Password: admin123
echo ============================================
echo.

timeout /t 8 /nobreak >nul

echo.
echo جاري فتح المتصفح...
REM Try multiple methods to open browser
start "" http://localhost:5173
timeout /t 1 /nobreak >nul

REM Try Chrome if available
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start chrome http://localhost:5173
)

REM Try Edge if available  
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start msedge http://localhost:5173
)

echo.
echo ✅ تم محاولة فتح المتصفح
echo.
echo إذا لم يفتح المتصفح تلقائياً، يرجى فتحه يدوياً والانتقال إلى:
echo http://localhost:5173
echo.
echo ملاحظة: الخوادم تعمل في نوافذ CMD منفصلة
echo لا تغلق هذه النوافذ لإبقاء النظام يعمل
echo.
pause

