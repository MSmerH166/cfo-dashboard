# CFO Dashboard Windows Deployment Script
# Usage: .\deploy-windows.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CFO Dashboard - Windows Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green

# Check npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

$npmVersion = npm --version
Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Setup environment
Write-Host "[3/6] Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file with your settings" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  .env.example not found, creating basic .env" -ForegroundColor Yellow
        @"
PORT=3001
JWT_SECRET=change-this-to-a-strong-secret-key-in-production
NODE_ENV=production
VITE_API_URL=http://localhost:3001/api
"@ | Out-File -FilePath .env -Encoding UTF8
    }
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}
Write-Host ""

# Build frontend
Write-Host "[4/6] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built" -ForegroundColor Green
Write-Host ""

# Create logs directory
Write-Host "[5/6] Creating logs directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path logs -Force | Out-Null
Write-Host "✅ Logs directory created" -ForegroundColor Green
Write-Host ""

# Check PM2
Write-Host "[6/6] Checking PM2..." -ForegroundColor Yellow
$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
    Write-Host "PM2 not found. Installing..." -ForegroundColor Yellow
    npm install -g pm2
    npm install -g pm2-windows-startup
    Write-Host "✅ PM2 installed" -ForegroundColor Green
} else {
    Write-Host "✅ PM2 found" -ForegroundColor Green
}
Write-Host ""

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
npm run pm2:start

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4173" -ForegroundColor Green
Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
pm2 status
Write-Host ""
Write-Host "View logs: pm2 logs" -ForegroundColor Cyan
Write-Host "Stop services: npm run pm2:stop" -ForegroundColor Cyan
Write-Host ""

