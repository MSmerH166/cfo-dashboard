#!/bin/bash

# CFO Dashboard Linux Deployment Script
# Usage: ./deploy-linux.sh

set -e

echo "============================================"
echo "CFO Dashboard - Linux Deployment"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Check Node.js
echo -e "${YELLOW}[1/6] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed!${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
npm install --legacy-peer-deps --production
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Setup environment
echo -e "${YELLOW}[3/6] Setting up environment...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file with your settings${NC}"
    else
        echo -e "${YELLOW}⚠ .env.example not found, creating basic .env${NC}"
        cat > .env << EOF
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
VITE_API_URL=http://localhost:3001/api
EOF
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Build frontend
echo -e "${YELLOW}[4/6] Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Create logs directory
echo -e "${YELLOW}[5/6] Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Check PM2
echo -e "${YELLOW}[6/6] Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 found${NC}"
fi
echo ""

# Start services
echo -e "${YELLOW}Starting services...${NC}"
npm run pm2:start

echo ""
echo "============================================"
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo "============================================"
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:4173"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "View logs: pm2 logs"
echo "Stop services: npm run pm2:stop"
echo ""

