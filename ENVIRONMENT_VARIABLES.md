# 🌐 دليل المتغيرات البيئية (Environment Variables Guide) - HISAB AI

يوضح هذا الدليل الشامل جميع المتغيرات البيئية المدعومة في نظام **HISAB AI** سواء للتطوير المحلي، أو النشر السحابي على منصات مثل **Railway** و **Supabase**.

---

## 📋 جدول المتغيرات البيئية الشامل

| اسم المتغير | النوع | الحالة | القيمة الافتراضية / مثال | الوصف والملاحظات |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | اختياري | `production` / `development` | يحدد نمط التشغيل (`production` لتفعيل خدمة ملفات الفرونت إند المجمعة وتفعيل طبقات الأمان). |
| `PORT` | `number` | اختياري | `3000` | المنفذ البرمجي الذي يستمع إليه خادم Express (يتم توفيره تلقائياً بواسطة Railway). |
| `DATABASE_URL` | `string` | **إلزامي** | `postgresql://postgres:pwd@db.host.supabase.co:5432/postgres?schema=public` | رابط الاتصال بقاعدة بيانات PostgreSQL (سواء Supabase السحابية أو خادم محلي). |
| `DIRECT_URL` | `string` | اختياري | `postgresql://postgres:pwd@db.host.supabase.co:5432/postgres` | رابط الاتصال المباشر بقاعدة البيانات (لإجراء الـ Migrations في حال استخدام Connection Pooler). |
| `SUPABASE_URL` | `string` | اختياري | `https://xyzproject.supabase.co` | رابط مشروع Supabase الخاص بخدمة التخزين السحابي للصور (Supabase Storage). |
| `SUPABASE_SERVICE_ROLE_KEY` | `string` | اختياري | `eyJhbGciOi...` | المفتاح الإداري السري للوصول إلى التخزين السحابي لرفع إشعارات البنك إلى Bucket `receipts`. |
| `SUPABASE_STORAGE_BUCKET` | `string` | اختياري | `receipts` | اسم الحاوية السحابية المخصصة لحفظ صور الإشعارات. |
| `SESSION_SECRET` | `string` | اختياري | `hisab_super_secret_session_key_2026` | مفتاح تشفير جلسات العرض التوضيحي والمصادقة. |
| `CORS_ORIGIN` | `string` | اختياري | `*` | النطاقات المصرح لها بالاتصال بالـ API عبر CORS. |
| `VITE_API_URL` | `string` | اختياري | `""` (مسار نسبي) | رابط الـ Backend لواجهة الفرونت إند (يترك فارغاً عند دمج الفرونت إند مع الباك إند في نفس الحاوية). |

---

## 🔒 آلية التراجع التلقائي (Graceful Fallback)

1. **التخزين السحابي مقابل التخزين المحلي:**
   - في حال عدم إدخال `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY`، يقوم النظام تلقائياً وبشكل آمن بالتحويل إلى نظام التخزين المحلي في المجلد `backend/uploads/receipts/` دون تعطل أي وظيفة أو رفع أي خطأ للعميل.

2. **قاعدة البيانات:**
   - النظام يتطلب رابط اتصال صالح لـ PostgreSQL عبر `DATABASE_URL`.
   - يتم التحقق من جاهزية الاتصال بقاعدة البيانات عبر فحص الجاهزية `/api/ready`.

---

## 🚀 نماذج الإعداد السريع

### 1. بيئة التطوير المحلية (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres@127.0.0.1:5433/hisab_ai?schema=public"
SESSION_SECRET="local_dev_secret_key"
CORS_ORIGIN="*"
```

### 2. بيئة الإنتاج السحابي على Railway (`Railway Variables`)
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres.xxxx:your_supabase_password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxxx:your_supabase_password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=receipts
SESSION_SECRET=production_random_jwt_session_secret_9988
```
