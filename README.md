# 🏦 نظام HISAB AI v2.0 | البوت المحاسبي الذكي لإدارة إشعارات التحويلات البنكية

**HISAB AI** هو نموذج تجريبي متكامل وقابل للتشغيل الفوري (Production-Ready Functional Prototype) مصمم لإدارة وأتمتة معالجة إشعارات التحويلات البنكية (تطبيق بنكك - بنك الخرطوم)، واستخراج البيانات المالية بواسطة الذكاء الاصطناعي وOCR، وكشف التكرار ومنع الازدواج المالي بنسبة خطأ 0%، وإدارة السير (Batches)، وتصدير التقارير المالية المتوافقة مع اللغة العربية (RTL Excel).

---

## 🌟 الميزات الجوهرية للنظام

1. **محرك OCR متقدم للإشعارات البنكية:**
   - مبني بواسطة `Sharp` و `Tesseract.js` لمعالجة التدرج اللوني والعكس الصوري (Inverted Contrast).
   - دقة استخراج **100.0%** للمبلغ ورقم العملية على العينات الحقيقية الست.
2. **منع التكرار الصارم (Zero-Duplicate Tolerance):**
   - قيد فريد صارم على مستوى قاعدة البيانات (`@unique` في PostgreSQL).
   - حجب المبالغ المكررة فورياً عن الإجماليات، مع تسجيل المحاولة في جدول `DuplicateAttempt` لإجراء المقارنة البصرية للرقابة.
3. **فصل كامل بين الوارد والصادر:**
   - قنوات ومحادثات مخصصة لحوالات العملاء (الوارد) وحوالات الموردين (الصادر).
4. **نظام إدارة السير (Batches):**
   - تجميع العمليات، دمج السير، فصل السير، إغلاق وإعادة فتح السير، وحساب الإجماليات اللحظية.
5. **محاكي واتساب تفاعلي متصل:**
   - محاكاة دقيقة لتجربة واتساب تدعم استقبال الصور، الردود الفورية، قراءة الأوامر النصية المحاسبية (`الإجمالي`, `تقرير اليوم`, `كشف التكرار`, الخ).
6. **تقارير مالية وتصدير Excel (RTL):**
   - جداول عربية رسمية منسقة بملفات `.xlsx` حقيقية.
7. **قاعدة بيانات PostgreSQL 18 متوافقة مع Supabase:**
   - استخدام دقة `Decimal(15, 2)` لمنع أخطاء تقريب الكسور المالية.
8. **دعم التخزين السحابي:**
   - جاهزية الربط مع Supabase Storage مع آلية تراجع آمن (Fallback) للتخزين المحلي.

---

## 🏗️ البنية التقنية (Tech Stack)

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Vite.
- **Backend:** Node.js v22, Express 5, TypeScript.
- **Database:** PostgreSQL 18, Prisma ORM 6.4.1.
- **Image Processing & OCR:** Sharp, Tesseract.js.
- **Reporting:** ExcelJS (RTL Engine).
- **Deployment:** Docker Multi-stage, Railway, Supabase.

---

## 🚀 التشغيل المحلي (Quick Start)

### المتطلبات الأساسية:
- Node.js (v20 أو v22)
- قاعدة بيانات PostgreSQL تعمل على المنفذ `5433` (أو تعديل الرابط في `backend/.env`)

### خطوات التشغيل:
```bash
# 1. تثبيت الاعتماديات
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. توليد Prisma Client وتنفيذ الهجرة
cd backend
npx prisma generate
npx prisma db push

# 3. تشغيل النظام بالكامل (Backend + Frontend)
npm start
```

افتح المتصفح على: `http://localhost:3000`

---

## 🧪 تشغيل الاختبارات الآلية

```bash
# تشغيل جميع اختبارات Vitest
npm run test

# تشغيل سيناريو الاعتماد المحاسبي الإلزامي (Requirement 9)
npm run test:scenario

# تشغيل فحص دقة محرك OCR على العينات الست الحقيقية
npm run test:ocr
```

---

## ☁️ النشر السحابي (Cloud Deployment)

- **دليل تهيئة قاعدة البيانات والتخزين على Supabase:** راجع ملف `SUPABASE_SETUP.md`.
- **دليل النشر التلقائي على Railway:** راجع ملف `RAILWAY_DEPLOYMENT.md`.
- **دليل المتغيرات البيئية:** راجع ملف `ENVIRONMENT_VARIABLES.md`.
- **تقرير التدقيق الأمني:** راجع ملف `SECURITY_AUDIT.md`.
- **دليل سيناريو العرض للعميل:** راجع ملف `DEMO_GUIDE.md`.
