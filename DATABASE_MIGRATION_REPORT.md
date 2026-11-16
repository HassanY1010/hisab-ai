# تقرير ترحيل وترقية قاعدة البيانات إلى PostgreSQL (Database Migration Report)
**نظام HISAB AI لإدارة إشعارات التحويلات البنكية**

تاريخ الترحيل: 16 نوفمبر 2026  
قاعدة البيانات الهدف: **PostgreSQL (المعتمدة لـ Supabase)**  
محرك الترحيل والمخطط: **Prisma ORM 6.4 + Raw PostgreSQL DDL Migration**

---

## 1. الدوافع الفنية للترقية من SQLite إلى PostgreSQL

1. **دقة الحسابات المالية:**
   - تم استبدال أنواع الفاصلة العائمة `Float` في SQLite بنوع `Decimal(15, 2)` / `NUMERIC(15, 2)` في PostgreSQL. هذا يضمن حماية تامة ضد أخطاء التقريب الحسابي (Floating Point Rounding Inaccuracies) عند معالجة مبالغ بملايين الجنيهات السودانية (مثل 5,000,000 SDG).
2. **التزامن والأداء السحابي (Concurrency):**
   - SQLite تفرض قفلاً على مستوى الملف بأكمله أثناء عمليات الكتابة المتزامنة (`database is locked`).
   - PostgreSQL توفر تحكماً فائقاً في المعاملات المتزامنة عبر `Row-Level Locking` و `MVCC`، مما يحمي النظام من حالات السباق (Race Conditions) عند وصول عدة إشعارات بنكية في نفس اللحظة.
3. **الجاهزية للنشر السحابي (Cloud Production):**
   - التوافق التام مع خدمات Supabase و Railway مع دعم مجمعات الاتصال (Connection Pooling عبر PgBouncer على المنفذ 6543).

---

## 2. مطابقة المخطط والعلاقات (Schema Mapping)

| الجدول في PostgreSQL | الغرض المحاسبي | الفهارس والقيود (Constraints & Indexes) |
|---|---|---|
| **Transaction** | السجل الرئيسي للعمليات الواردة والصادرة | `UNIQUE (normalizedTxNumber)`<br>`UNIQUE (transactionNumber)`<br>`amount NUMERIC(15, 2)` |
| **Batch** | السير وجلسات العمل المجمعة | `INDEX (direction)`<br>`INDEX (status)` |
| **BatchTransaction** | ربط العمليات بالسير | `UNIQUE (batchId, transactionId)`<br>`FK ON DELETE CASCADE` |
| **DuplicateAttempt** | سجل رقابة محاولات التكرار المحجوبة | `INDEX (transactionNumber)`<br>`INDEX (attemptedAt)`<br>`extractedAmount NUMERIC(15, 2)` |
| **AuditLog** | التدقيق والتتبع الأمني والمحاسبي | `INDEX (action)`<br>`INDEX (createdAt)` |
| **Conversation** | قنوات محاكي واتساب (وارد/صادر) | `PRIMARY KEY (id)` |
| **ChatMessage** | رسائل المحادثة والصور والردود | `INDEX (conversationId)`<br>`FK ON DELETE CASCADE` |
| **ImageProcessingJob**| طابور معالجة الصور بالـ OCR | `PRIMARY KEY (id)` |

---

## 3. نتائج اختبار الترحيل وسلامة البيانات (Verification & Integrity)

1. تم إنشاء قاعدة بيانات PostgreSQL وتشغيل سكريبت الترحيل الكامل `backend/prisma/migrations/01_init_supabase_postgresql.sql`.
2. تم التحقق من إنشاء الجداول الثمانية بكامل فهارسها وقيودها.
3. تم تشغيل سيناريو الحسابات الإلزامي:
   - عملية 1 (وارد): `5,000,000 SDG`
   - عملية 2 (وارد): `3,000,000 SDG`
   - عملية 3 (صادر): `500,000 SDG`
   - إجمالي الوارد: `8,000,000 SDG`
   - إجمالي الصادر: `500,000 SDG`
   - صافي الرصيد: `7,500,000 SDG`
   - محاولة تكرار العملية 1: تم حجبها فوراً وتأكيد عدم زيادتها للمبلغ.
4. اجتياز جميع اختبارات Vitest بنسبة نجاح 100%.
