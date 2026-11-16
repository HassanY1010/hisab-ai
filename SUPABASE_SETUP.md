# دليل إعداد وتهيئة Supabase (Supabase Setup Guide)
**نظام HISAB AI لإدارة إشعارات التحويلات البنكية**

يشرح هذا الدليل الخطوات الدقيقة لربط النظام السحابي المنشور بخدمات **Supabase (PostgreSQL & Supabase Storage)**.

---

## 1. إنشاء المشروع على Supabase

1. ادخل إلى لوحة تحكم [Supabase Dashboard](https://app.supabase.com) وسجل الدخول.
2. اضغط على **«New Project»** واختر اسماً للمشروع: `hisab-ai-production`.
3. حدد كلمة مرور قوية لقاعدة البيانات (`Database Password`) واحتفظ بها.
4. اختر المنطقة الجغرافية الأقرب (مثل `Frankfurt / eu-central-1`).

---

## 2. تنفيذ مخطط قاعدة البيانات (Database Schema Execution)

1. من القائمة الجانبية اليسرى في لوحة Supabase، انتقل إلى **«SQL Editor»**.
2. اضغط على **«New Query»**.
3. انسخ محتويات الملف التالي بالكامل:
   [`backend/prisma/migrations/01_init_supabase_postgresql.sql`](file:///d:/bot/backend/prisma/migrations/01_init_supabase_postgresql.sql)
4. الصق المحتويات في المحرر واضغط **«Run»**.
5. ستظهر رسالة النجاح `Success. No rows returned`، وسيتم إنشاء الجداول الثمانية مع الفهارس والقيود الفريدة لمنع التكرار.

---

## 3. إعداد مخزن الصور (Supabase Storage Bucket)

1. من القائمة الجانبية، انتقل إلى **«Storage»**.
2. اضغط على **«New Bucket»**.
3. اكتب اسم الـ Bucket:
   ```
   receipts
   ```
4. فعّل خيار **«Public Bucket»** للسماح بعرض صور الإشعارات داخل لوحة التحكم ومحاكي واتساب.
5. اضغط **«Save»**.

---

## 4. استخراج روابط الاتصال والمفاتيح السرية (Credentials)

### أ. روابط قاعدة البيانات (Database URLs):
انتقل إلى: **Project Settings -> Database**:
1. **Connection Pooling (لـ Railway والإنتاج):**
   - اختر وضع **Transaction** (المنفذ `6543`).
   - الرابط يكون بصيغة:
     ```
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - هذا الرابط يوضع في متغير: `DATABASE_URL`.
2. **Direct Connection (لعمليات الترحيل المباشرة):**
   - المنفذ `5432`.
   - يوضع في متغير: `DIRECT_URL`.

### ب. مفاتيح الـ API للتخزين السحابي (API Keys):
انتقل إلى: **Project Settings -> API**:
1. **Project URL:**
   - يوضع في: `SUPABASE_URL` (مثال: `https://xyzproject.supabase.co`).
2. **Service Role Key (Secret):**
   - اضغط Reveal لنسخ المفتاح السري `service_role`.
   - يوضع في: `SUPABASE_SERVICE_ROLE_KEY` (في بيئة Railway فقط، ولا يشارك مع المتصفح).
