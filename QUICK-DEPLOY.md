# نشر سريع على سيرفر جديد

## للـ Linux:

```bash
# 1. نسخ المشروع
git clone <repository> /var/www/cfo-dashboard
cd /var/www/cfo-dashboard

# 2. تشغيل سكريبت النشر
chmod +x deploy-linux.sh
./deploy-linux.sh

# 3. النظام جاهز!
# Backend: http://your-server:3001
# Frontend: http://your-server:4173
```

## للـ Windows:

```powershell
# 1. نسخ المشروع
cd C:\inetpub\wwwroot\cfo-dashboard

# 2. تشغيل سكريبت النشر
.\deploy-windows.ps1

# 3. النظام جاهز!
# Backend: https://bonyan-cfo-backend.onrender.com
# Frontend: http://localhost:4173
```

## خطوات يدوية:

1. **تثبيت Node.js 18+**
2. **نسخ المشروع** إلى السيرفر
3. **نسخ `.env.example` إلى `.env`** وتعديله
4. **تثبيت الحزم:** `npm install --legacy-peer-deps`
5. **بناء Frontend:** `npm run build`
6. **تشغيل:** `npm run pm2:start` (أو `npm run start:prod`)

## ملفات مهمة:

- **DEPLOYMENT.md** - دليل شامل للنشر
- **deploy-linux.sh** - سكريبت نشر تلقائي لـ Linux
- **deploy-windows.ps1** - سكريبت نشر تلقائي لـ Windows
- **.env.example** - مثال لملف الإعدادات
- **pm2.config.js** - إعدادات PM2

## بيانات الدخول الافتراضية:

- Email: `admin@bonyan.com`
- Password: `admin123`

**⚠️ غيّر كلمة المرور فوراً في الإنتاج!**

