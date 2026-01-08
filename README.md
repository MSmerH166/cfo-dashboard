# Bonyan Financial Analysis (Frontend Only)

واجهة React + Vite لعرض وتحليل بيانات الميزان والتقارير المالية. هذا المستودع مخصص للواجهة فقط، ويُنشر على **Cloudflare Pages**. أي منطق أو خادم خلفي يتم التعامل معه في مشروع منفصل.

## المزايا
- SPA مبنية بـ React 18 و React Router
- تقارير ميزان المراجعة والقوائم المالية وتحليل رأٍس المال العامل
- دعم ملفات Excel عبر XLSX
- رسوم بيانية عبر Recharts

## المتطلبات
- Node.js 18+
- npm

## التثبيت والتشغيل
```bash
npm install
npm run dev     # تشغيل محلي
npm run build   # بناء للإنتاج
npm run preview # معاينة البناء
```

## النشر على Cloudflare Pages
- Framework preset: Vite (أو None)
- Build command: `npm run build`
- Output directory: `dist`
- اجعل ملف `public/_redirects` موجوداً لتحويل كل المسارات إلى `index.html` (SPA).

## هيكل المشروع (واجهة فقط)
```
src/
  api/
  components/
  context/
  pages/
  utils/
  data/
  App.jsx
  main.jsx
  index.css
public/
  _redirects
index.html        # يستورد ./src/main.jsx
vite.config.js
package.json
.gitignore
```

## ملاحظات
- المستودع لا يتضمن خادماً أو قاعدة بيانات؛ أي خدمات خلفية تتم إدارتها في مشروع منفصل.
- تأكد من ضبط متغيرات البيئة الخاصة بالواجهة فقط (مثل عناوين الـ API) عبر ملفات `.env` عند الحاجة.

© 2026 Bonyan Company. All rights reserved.
