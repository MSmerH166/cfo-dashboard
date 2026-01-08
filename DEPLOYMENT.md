# دليل نشر نظام CFO على سيرفر جديد

## المتطلبات الأساسية

### 1. متطلبات السيرفر
- **Node.js** 18+ (LTS موصى به)
- **npm** أو **yarn**
- **PM2** (لإدارة العمليات - اختياري لكن موصى به)
- **Git** (لنسخ المشروع)

### 2. المنافذ المطلوبة
- **3001** - Backend API Server
- **4173** - Frontend (في الإنتاج) أو **5173** (في التطوير)
- تأكد من فتح هذه المنافذ في Firewall

---

## الطريقة 1: النشر على Linux Server (Ubuntu/Debian)

### الخطوة 1: إعداد السيرفر

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من التثبيت
node --version
npm --version

# تثبيت PM2 (لإدارة العمليات)
sudo npm install -g pm2
```

### الخطوة 2: نسخ المشروع

```bash
# إنشاء مجلد للمشروع
sudo mkdir -p /var/www/cfo-dashboard
sudo chown $USER:$USER /var/www/cfo-dashboard

# نسخ المشروع (استبدل بالطريقة المناسبة لك)
cd /var/www/cfo-dashboard
git clone <repository-url> .
# أو استخدم scp/sftp لرفع الملفات
```

### الخطوة 3: إعداد المشروع

```bash
cd /var/www/cfo-dashboard

# نسخ ملف البيئة
cp .env.example .env

# تعديل ملف .env
nano .env
# قم بتحديث:
# - PORT=3001
# - JWT_SECRET=your-strong-secret-key-here
# - VITE_API_URL=http://your-server-ip:3001/api
# - NODE_ENV=production

# تثبيت الحزم
npm install --legacy-peer-deps --production

# بناء Frontend
npm run build
```

### الخطوة 4: تشغيل النظام

#### باستخدام PM2 (موصى به):

```bash
# إنشاء مجلد للـ logs
mkdir -p logs

# تشغيل النظام
npm run pm2:start

# التحقق من الحالة
pm2 status
pm2 logs

# حفظ الإعدادات لبدء تلقائي
pm2 save
pm2 startup
```

#### بدون PM2:

```bash
# تشغيل Backend
npm run start:prod &

# تشغيل Frontend (في نافذة أخرى)
npm run preview &
```

### الخطوة 5: إعداد Nginx (Reverse Proxy) - اختياري

```bash
# تثبيت Nginx
sudo apt install nginx -y

# إنشاء ملف الإعداد
sudo nano /etc/nginx/sites-available/cfo-dashboard
```

أضف التالي:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # استبدل باسم الدومين

    # Frontend
    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

تفعيل الإعداد:

```bash
sudo ln -s /etc/nginx/sites-available/cfo-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## الطريقة 2: النشر على Windows Server

### الخطوة 1: تثبيت Node.js

1. قم بتحميل Node.js من: https://nodejs.org
2. ثبت Node.js LTS
3. افتح PowerShell كمسؤول

### الخطوة 2: نسخ المشروع

```powershell
# انتقل إلى مجلد المشروع
cd C:\inetpub\wwwroot\cfo-dashboard
# أو أي مسار تفضله
```

### الخطوة 3: إعداد المشروع

```powershell
# نسخ ملف البيئة
Copy-Item .env.example .env

# تعديل ملف .env (افتحه بمحرر النصوص)
notepad .env

# تثبيت الحزم
npm install --legacy-peer-deps

# بناء Frontend
npm run build
```

### الخطوة 4: تشغيل النظام

#### باستخدام PM2:

```powershell
# تثبيت PM2
npm install -g pm2
npm install -g pm2-windows-startup

# إنشاء مجلد للـ logs
New-Item -ItemType Directory -Path logs -Force

# تشغيل النظام
npm run pm2:start

# حفظ الإعدادات لبدء تلقائي
pm2 save
pm2-startup install
```

#### بدون PM2 (كخدمة Windows):

أنشئ ملف `start-service.bat`:

```batch
@echo off
cd /d "%~dp0"
start "CFO Backend" cmd /k "npm run start:prod"
start "CFO Frontend" cmd /k "npm run preview"
```

---

## الطريقة 3: النشر على Docker

### إنشاء Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3001 4173

# Start script
CMD ["npm", "run", "pm2:start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./cfo_database.db:/app/cfo_database.db
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "4173:4173"
    command: npm run preview
    depends_on:
      - backend
    restart: unless-stopped
```

### التشغيل

```bash
docker-compose up -d
```

---

## إعدادات مهمة للإنتاج

### 1. تحديث ملف .env

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-very-strong-secret-key-minimum-32-characters
VITE_API_URL=http://your-server-ip:3001/api
```

### 2. تحديث CORS في server.js

تأكد من تحديث إعدادات CORS في `server.js` للسماح فقط بالدومينات المسموحة:

```javascript
app.use(cors({
  origin: ['http://your-domain.com', 'https://your-domain.com'],
  credentials: true
}));
```

### 3. الأمان

- استخدم HTTPS في الإنتاج
- غيّر JWT_SECRET إلى مفتاح قوي
- استخدم Firewall لحماية المنافذ
- راجع أذونات قاعدة البيانات

---

## الصيانة والتحديثات

### تحديث النظام

```bash
# سحب التحديثات
git pull

# تثبيت الحزم الجديدة
npm install --legacy-peer-deps

# إعادة بناء Frontend
npm run build

# إعادة تشغيل PM2
npm run pm2:restart
```

### مراقبة النظام

```bash
# حالة PM2
pm2 status

# السجلات
pm2 logs

# مراقبة الأداء
pm2 monit
```

### النسخ الاحتياطي

```bash
# نسخ احتياطي لقاعدة البيانات
cp cfo_database.db backups/cfo_database_$(date +%Y%m%d).db
```

---

## استكشاف الأخطاء

### المشكلة: النظام لا يعمل

```bash
# تحقق من المنافذ
netstat -tulpn | grep -E '3001|4173'

# تحقق من PM2
pm2 status
pm2 logs

# تحقق من السجلات
tail -f logs/backend-error.log
tail -f logs/frontend-error.log
```

### المشكلة: قاعدة البيانات

```bash
# تحقق من وجود ملف قاعدة البيانات
ls -la cfo_database.db

# تحقق من الأذونات
chmod 644 cfo_database.db
```

---

## بيانات الدخول الافتراضية

بعد النشر، استخدم:
- **Email:** admin@bonyan.com
- **Password:** admin123

**⚠️ مهم:** غيّر كلمة المرور فوراً في الإنتاج!

---

## الدعم

للمساعدة أو الاستفسارات، راجع:
- ملف `README.md`
- ملف `كيفية-التشغيل.md`
- سجلات النظام في مجلد `logs/`

---

© 2026 Bonyan Company. All rights reserved.

