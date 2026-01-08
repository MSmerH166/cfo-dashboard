# Quick Start Script
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "تشغيل نظام CFO - التحليل المالي" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Find Node.js
$nodePath = $null
$possiblePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nodePath = $path
        $nodeDir = [System.IO.Path]::GetDirectoryName($path)
        $env:Path = "$nodeDir;$env:Path"
        Write-Host "✅ تم العثور على Node.js في: $nodeDir" -ForegroundColor Green
        break
    }
}

# Check if node is now available
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd -and -not $nodePath) {
    Write-Host "❌ Node.js غير موجود" -ForegroundColor Red
    Write-Host "يرجى تثبيت Node.js من https://nodejs.org" -ForegroundColor Yellow
    Write-Host "أو إعادة تشغيل Terminal بعد تثبيت Node.js" -ForegroundColor Yellow
    Read-Host "اضغط Enter للخروج"
    exit 1
}

$nodeVersion = node --version 2>&1
Write-Host "   الإصدار: $nodeVersion" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] تثبيت Dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل تثبيت الحزم" -ForegroundColor Red
    Write-Host "يرجى التحقق من اتصال الإنترنت وإعادة المحاولة" -ForegroundColor Yellow
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host ""
Write-Host "[2/3] بدء تشغيل Backend Server..." -ForegroundColor Yellow
$currentDir = Get-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; `$env:Path='$env:Path'; npm run server" -WindowStyle Normal
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "[3/3] بدء تشغيل Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; `$env:Path='$env:Path'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 6

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🚀 Backend Server: http://localhost:3001" -ForegroundColor Green
Write-Host "🌐 Frontend App: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 بيانات الدخول:" -ForegroundColor Yellow
Write-Host "   Email: admin@bonyan.com"
Write-Host "   Password: admin123"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Wait a bit more and open browser
Start-Sleep -Seconds 3
Write-Host "جاري فتح المتصفح..." -ForegroundColor Cyan
try {
    Start-Process "http://localhost:5173"
    Write-Host "✅ تم فتح المتصفح تلقائياً" -ForegroundColor Green
} catch {
    Write-Host "⚠️  لم يتم فتح المتصفح تلقائياً" -ForegroundColor Yellow
    Write-Host "يرجى فتح المتصفح يدوياً والانتقال إلى: http://localhost:5173" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "ملاحظة: الخوادم تعمل في نوافذ PowerShell منفصلة" -ForegroundColor Yellow
Write-Host "لا تغلق هذه النوافذ لإبقاء النظام يعمل" -ForegroundColor Yellow
Write-Host ""
Read-Host "اضغط Enter للخروج من هذا السكريبت (الخوادم ستستمر في العمل)"
