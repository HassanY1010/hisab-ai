# المعمارية وهندسة النظام (System Architecture)
**HISAB AI | WhatsApp Accounting Bot**

---

## 1. الهيكل العام للنظام (High-Level Architecture)

تم بناء النظام وفق معمارية متعددة الطبقات (Multi-Tier Clean Architecture) تفصل بوضوح بين طبقة العرض والواجهات، وطبقة المعالجة الذكية والمحاكاة، وطبقة العمليات المحاسبية، وطبقة البيانات المؤمنة.

```
+--------------------------------------------------------------------------+
|                       HISAB AI Web Interface (RTL)                      |
|   [Dashboard]  [Inward View]  [Outward View]  [Batches]  [Duplicates]     |
|   [Reports & Excel Export]  [WhatsApp Simulator]  [OCR Live Scanner]     |
+--------------------------------------------------------------------------+
                                    | (REST APIs / JSON & FormData)
                                    v
+--------------------------------------------------------------------------+
|                         Express.js REST API Server                       |
|   - Multer Storage & Mime Validator   - Zod Input Schemas                |
|   - Static Assets & Uploads Handler   - Audit Logger & Middleware        |
+--------------------------------------------------------------------------+
         |                                |                        |
         v                                v                        v
+------------------+           +----------------------+  +-----------------+
|  OCR Processing  |           | Transaction Engine   |  | Batch / Session |
|  - Sharp Filters |           | - Normalized TxIDs   |  | - Create/Merge  |
|  - Tesseract.js  |           | - Unique Enforcement |  | - Split/Close   |
|  - Bankak Parser |           | - Duplicate Blocker  |  | - Financial Tot |
+------------------+           +----------------------+  +-----------------+
                                          |
                                          v
+--------------------------------------------------------------------------+
|                    Database Layer (Prisma ORM & SQLite)                  |
|   - Unique Index: normalizedTxNumber                                     |
|   - Tables: Transaction, DuplicateAttempt, Batch, BatchTx, AuditLog     |
+--------------------------------------------------------------------------+
```

---

## 2. بنية المجلدات والمشاريع (Project Directory Structure)

```
d:/bot/
├── sample-data/bank-notifications/   # صور إشعارات البنك الست الحقيقية
├── backend/
│   ├── prisma/schema.prisma          # مخطط قاعدة البيانات والعلاقات
│   ├── uploads/                      # مسار حفظ صور الإشعارات المرفوعة بأمان
│   ├── src/
│   │   ├── app.ts                    # تطبيق Express والتوجيه وخدمة الواجهة
│   │   ├── index.ts                  # مدخل تشغيل الخادم
│   │   ├── middlewares/upload.ts     # حماية ورفع الملفات بالتحقق من الحجم والنوع
│   │   ├── routes/                   # مسارات الـ API (لوحة القيادة، العمليات، السير، التكرار، التقارير، واتساب، OCR)
│   │   ├── services/
│   │   │   ├── db.ts                 # Prisma Client Singleton
│   │   │   ├── transaction-service.ts# منطق العمليات ومنع التكرار والحسابات
│   │   │   ├── batch-service.ts      # إدارة السير والدمج والفصل
│   │   │   ├── excel-service.ts      # توليد ملفات Excel RTL عبر ExcelJS
│   │   │   ├── whatsapp-bot-service.ts# معالج رسائل وأوامر محاكي واتساب
│   │   │   └── ocr/
│   │   │       ├── ocr-types.ts      # واجهات محركات OCR
│   │   │       ├── ocr-preprocessor.ts # معالجة الصور بـ Sharp (Negate + Normalize)
│   │   │       ├── bankak-receipt-parser.ts # مستخرج حقول إشعار بنك الخرطوم
│   │   │       └── tesseract-adapter.ts # محول Tesseract.js القابل للاستبدال
│   │   ├── scripts/                  # سكربتات الاختبار المستقلة للصور والسيناريوهات
│   │   └── tests/                    # اختبارات Vitest و Supertest
├── frontend/
│   ├── src/
│   │   ├── api/index.ts              # عميل الاتصال الموحد بالخادم
│   │   ├── components/               # مكونات واجهة المستخدم (Dashboard, Batches, Duplicates...)
│   │   ├── App.tsx                   # التطبيق الرئيسي
│   │   └── main.tsx
├── OCR_REAL_SAMPLES_REPORT.md        # تقرير فحص واختبار الصور الست الحقيقية
├── PROJECT_STATUS.md                 # تقرير حالة المشروع
├── TEST_REPORT.md                    # تقرير نتائج جميع الاختبارات
├── KNOWN_LIMITATIONS.md              # توثيق القيود الفنية
├── DEMO_GUIDE.md                     # دليل العرض التقديمي للعميل
├── README.md                         # تعليمات التثبيت والتشغيل
└── package.json
```

---

## 3. محرك قراءة الإشعارات البنكية (Bank Receipt OCR Engine)

صُمم المحرك بنمط محول قابل للاستبدال (`IOcrEngine Adapter Pattern`) بحيث يمكن في بيئة الإنتاج التبديل مستقبلاً إلى أي محرك خارجي (مثل Google Cloud Vision أو AWS Textract) دون تغيير سطر واحد في منطق العمليات أو الحسابات.

### خطوات خط معالجة الصورة (Pipeline):
1. **التحقق الأمني:** فحص نوع الملف (MIME Type) والحجم لمنع الملفات الضارة.
2. **التحسين المسبق عبر Sharp:**
   - تحويل الصورة لتدرج رمادي (`Grayscale`).
   - عكس الألوان (`Negate`): حيث أن إشعارات بنكك تستخدم نصوصاً بيضاء على خلفية خضراء متدرجة، فتحويلها إلى نصوص داكنة على خلفية بيضاء نقية يقضي على التشتت اللوني.
   - تحسين التباين وتوضيح الحدود (`Normalize & Sharpen`).
3. **التعرف البصري (Tesseract.js Engine):** تشغيل النموذج للغتين العربية والإنجليزية والأرقام.
4. **مستخرج الحقول الذكي (Contextual Bankak Parser):**
   - التعرف على رقم العملية المكون من 11 رقماً ويبدأ بـ `20` عبر الربط بسياق حقل "رقم العملية".
   - استخراج المبلغ المالي والكسور العشرية والآلاف دون إسقاط الأصفار.
   - استخراج التواريخ وأرقام الحسابات (من حساب / إلى حساب) والمستفيد.
   - حساب مؤشر الثقة (Confidence Score).

---

## 4. نظام منع التكرار (Duplicate Prevention & Audit)

- **القيد الفريد في قاعدة البيانات:** حقل `normalizedTxNumber` عليه قيد `UNIQUE INDEX` صريح على مستوى SQLite.
- **التطبيع (Normalization):** إزالة المحارف المخفية (مثل LTR و RTL markers) والمسافات الزائدة، وتحويل الحروف إلى أحرف كبيرة موحدة.
- **الحماية من التزامن (Concurrency Protection):** تنفيذ التحقق والتسجيل داخل معاملة ذرية `prisma.$transaction`.
- **التعامل مع التكرار:**
  - حجب المبلغ وعدم إضافته مطلقاً لأي إجمالي أو رصيد.
  - تسجيل المحاولة فوراً في جدول `DuplicateAttempt` مع صورة المحاولة وتاريخها والمبلغ المقروء.
  - فحص ما إذا كان المبلغ في المحاولة المكررة يختلف عن المبلغ الأصلي لرفع تحذير `amount_mismatch`.
  - تسجيل الحدث في جدول التدقيق المحاسبي `AuditLog`.
