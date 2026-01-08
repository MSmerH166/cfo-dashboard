# Diagnostic and Start Script
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "فحص وتشغيل نظام CFO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1] فحص Node.js..." -ForegroundColor Yellow
$nodeFound = $false
$nodePath = $null

# Try to find node in PATH
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodePath = $nodeCmd.Source
    $nodeFound = $true
    Write-Host "   ✅ Node.js موجود في PATH: $nodePath" -ForegroundColor Green
} else {
    # Search common locations
    $searchPaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:USERPROFILE\AppData\Local\Programs\nodejs\node.exe"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $nodePath = $path
            $nodeDir = [System.IO.Path]::GetDirectoryName($path)
            $env:Path = "$nodeDir;$env:Path"
            $nodeFound = $true
            Write-Host "   ✅ Node.js موجود في: $nodeDir" -ForegroundColor Green
            break
        }
    }
}

if (-not $nodeFound) {
    Write-Host "   ❌ Node.js غير موجود" -ForegroundColor Red
    Write-Host ""
    Write-Host "يرجى تثبيت Node.js من: https://nodejs.org" -ForegroundColor Yellow
    Write-Host "أو إعادة تشغيل Terminal بعد التثبيت" -ForegroundColor Yellow
    Read-Host "`nاضغط Enter للخروج"
    exit 1
}

$nodeVersion = node --version 2>&1
Write-Host "   الإصدار: $nodeVersion" -ForegroundColor Cyan
Write-Host ""

# Step 2: Check npm
Write-Host "[2] فحص npm..." -ForegroundColor Yellow
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
    Write-Host "   ✅ npm موجود" -ForegroundColor Green
    $npmVersion = npm --version 2>&1
    Write-Host "   الإصدار: $npmVersion" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ npm غير موجود" -ForegroundColor Red
    Read-Host "`nاضغط Enter للخروج"
    exit 1
}
Write-Host ""

# Step 3: Check if dependencies are installed
Write-Host "[3] فحص Dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules موجود" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules غير موجود - سيتم التثبيت..." -ForegroundColor Yellow
    Write-Host "   جاري تثبيت الحزم..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ فشل تثبيت الحزم" -ForegroundColor Red
        Read-Host "`nاضغط Enter للخروج"
        exit 1
    }
}
Write-Host ""

# Step 4: Check if ports are available
Write-Host "[4] فحص المنافذ..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($port3001) {
    Write-Host "   ⚠️  المنفذ 3001 مستخدم - قد يكون Backend يعمل بالفعل" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ المنفذ 3001 متاح" -ForegroundColor Green
}

if ($port5173) {
    Write-Host "   ⚠️  المنفذ 5173 مستخدم - قد يكون Frontend يعمل بالفعل" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ المنفذ 5173 متاح" -ForegroundColor Green
}
Write-Host ""

# Step 5: Start servers
Write-Host "[5] بدء تشغيل الخوادم..." -ForegroundColor Yellow
$currentDir = (Get-Location).Path

# Start Backend
Write-Host "   جاري تشغيل Backend..." -ForegroundColor Cyan
$backendScript = @"
cd '$currentDir'
`$env:Path='$env:Path'
npm run server
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-backend.ps1" -WindowStyle Normal
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "   جاري تشغيل Frontend..." -ForegroundColor Cyan
$frontendScript = @"
cd '$currentDir'
`$env:Path='$env:Path'
npm run dev
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend.ps1" -WindowStyle Normal
Start-Sleep -Seconds 6

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ تم تشغيل النظام!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Backend Server: http://localhost:3001" -ForegroundColor Green
Write-Host "🌐 Frontend App: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 بيانات الدخول:" -ForegroundColor Yellow
Write-Host "   Email: admin@bonyan.com"
Write-Host "   Password: admin123"
Write-Host ""

# Wait and open browser
Start-Sleep -Seconds 3
Write-Host "جاري فتح المتصفح..." -ForegroundColor Cyan
try {
    Start-Process "http://localhost:5173"
    Write-Host "✅ تم فتح المتصفح" -ForegroundColor Green
} catch {
    Write-Host "⚠️  لم يتم فتح المتصفح تلقائياً" -ForegroundColor Yellow
    Write-Host "يرجى فتح المتصفح يدوياً والانتقال إلى: http://localhost:5173" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "ملاحظة: الخوادم تعمل في نوافذ PowerShell منفصلة" -ForegroundColor Yellow
Write-Host "لا تغلق هذه النوافذ لإبقاء النظام يعمل" -ForegroundColor Yellow
Write-Host ""
Read-Host "اضغط Enter للخروج من هذا السكريبت"

