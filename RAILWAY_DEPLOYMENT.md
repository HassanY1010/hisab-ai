# دليل النشر والتشغيل على منصة Railway (Railway Deployment Guide)
**نظام HISAB AI لإدارة إشعارات التحويلات البنكية**

يشرح هذا الدليل كيفية نشر نظام **HISAB AI** كنموذج تجريبي سحابي منشور ومتاح على الإنترنت 24/7.

---

## 🌐 الرابط المباشر للمشروع المنشور (Live Production URL)
👉 **[https://hisab-ai-production.up.railway.app](https://hisab-ai-production.up.railway.app)**

- **فحص الجاهزية الحي:** `https://hisab-ai-production.up.railway.app/api/health`
- **فحص حالة قاعدة البيانات والتخزين:** `https://hisab-ai-production.up.railway.app/api/ready`

---

## 1. نموذج المعمارية المعتمد للنشر (Production Deployment Architecture)

يدعم النظام خيارين للنشر على Railway:

### الخيار (أ) - النشر كخدمة موحدة متكاملة (Recommended / Unified Full-Stack Service):
- خادم Express.js يتولى خدمة واجهات الـ REST API في `/api/*`، ويخدم أصول الـ Frontend المبنية تلقائياً من المجلد `frontend/dist` على الجذر `/`.
- **المزايا:**
  - أقل استهلاكاً للموارد وتكلفة المنصة.
  - لا توجد أي مشاكل CORS أو تعقيدات في ربط النطاقات المتعددة.
  - ملف `railway.json` و `Procfile` جاهزان ومعدان مسبقاً في المشروع.

### الخيار (ب) - النشر كخدمتين منفصلتين (Two Microservices):
- خدمة أولى للـ Backend (Node.js).
- خدمة ثانية للـ Frontend (Static Site / Vite).
- يتم تزويد Frontend بعنوان الـ Backend المنشور عبر متغير `VITE_API_URL`.

---

## 2. خطوات النشر عبر لوحة تحكم Railway (Dashboard Steps)

1. سجل الدخول إلى [Railway.app](https://railway.app).
2. اضغط على **«New Project» -> «Deploy from GitHub repo»**.
3. اختر مستودع المشروع `bot` أو `hisab-ai`.
4. انتقل إلى تبويب **«Variables»** وأضف المتغيرات التالية:

| اسم المتغير (Variable Name) | القيمة المقترحة | الشرح |
|---|---|---|
| `NODE_ENV` | `production` | تفعيل وضع الإنتاج |
| `PORT` | `4000` | يحدد تلقائياً بواسطة Railway |
| `DATABASE_URL` | `postgresql://...` | رابط Supabase Pooler (Port 6543) |
| `DIRECT_URL` | `postgresql://...` | رابط Supabase Direct (Port 5432) |
| `SUPABASE_URL` | `https://[REF].supabase.co` | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | مفتاح Service Role لتخزين الصور |
| `SUPABASE_STORAGE_BUCKET` | `receipts` | اسم الـ Bucket |
| `ALLOWED_ORIGIN` | `*` | السماح بطلبات المتصفح |

5. انتقل إلى تبويب **«Settings»**:
   - في قسم **Networking**: اضغط على **«Generate Domain»** للحصول على رابط إنتاج عام مؤمن بـ HTTPS (مثال: `hisab-ai-production.up.railway.app`).
   - في قسم **Deploy**: تأكد من أن **Healthcheck Path** مضبوط على:
     ```
     /api/health
     ```
6. سيبدأ البناء تلقائياً وسيعمل النظام خلال دقائق قليلة.

---

## 3. التحقق بعد النشر (Post-Deployment Verification)

1. **فحص الـ Health Check:**
   افتح في المتصفح:
   `https://[YOUR-RAILWAY-DOMAIN]/api/health`
   يجب أن تكون الاستجابة:
   ```json
   { "status": "ok", "system": "HISAB AI Accounting Bot", "version": "2.0.0" }
   ```
2. **فحص الاتصال بقاعدة البيانات (Readiness Check):**
   افتح:
   `https://[YOUR-RAILWAY-DOMAIN]/api/ready`
   يجب أن تكون الاستجابة:
   ```json
   { "status": "ready", "database": "connected", "storage": "supabase" }
   ```
3. **فحص لوحة التحكم:**
   افتح الرابط الرئيسي `https://[YOUR-RAILWAY-DOMAIN]/` لمشاهدة واجهة النظام باللغة العربية.
