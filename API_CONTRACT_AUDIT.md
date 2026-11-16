# مراجعة وتدقيق واجهات البرمجة (API Contract Audit)
**نظام HISAB AI لإدارة إشعارات التحويلات البنكية**

يوثق هذا التقرير كافة واجهات البرمجة (Endpoints) في النظام، ونوع الطلب، وشكل المدخلات والمخرجات، ونتيجة الاختبار الفعلي على بيئة PostgreSQL.

---

## 1. جدول تدقيق المسارات (Endpoints Matrix)

| المسار (Endpoint) | الطريقة (Method) | الوظيفة | التحقق من المدخلات | كود الاستجابة المتوقع | نتيجة الاختبار |
|---|:---:|---|:---:|:---:|:---:|
| `/api/health` | `GET` | فحص حيوية الخادم (Liveness) | لا يوجد | `200 OK` | **PASS** |
| `/api/ready` | `GET` | فحص جاهزية قاعدة البيانات والمخزن | لا يوجد | `200 OK` / `503` | **PASS** |
| `/api/dashboard/stats` | `GET` | إحصائيات لوحة القيادة ومخطط الأيام | لا يوجد | `200 OK` | **PASS** |
| `/api/transactions` | `GET` | جلب العمليات مع التصفية والبحث | Query Params | `200 OK` | **PASS** |
| `/api/transactions/:id` | `GET` | جلب تفاصيل عملية محددة | `id` في المسار | `200 OK` / `404` | **PASS** |
| `/api/transactions` | `POST` | تسجيل عملية مالية جديدة | Zod Schema | `201 Created` / `409` | **PASS** |
| `/api/transactions/:id` | `PUT` | تعديل عملية أو اعتماد المراجعة | JSON Body | `200 OK` | **PASS** |
| `/api/batches` | `GET` | عرض قائمة السير مع المجاميع | Query Params | `200 OK` | **PASS** |
| `/api/batches/:id` | `GET` | عرض تفاصيل السير وعملياته | `id` في المسار | `200 OK` / `404` | **PASS** |
| `/api/batches` | `POST` | إنشاء سير مالي جديد | Zod Schema | `201 Created` | **PASS** |
| `/api/batches/:id/transactions` | `POST` | إضافة عمليات إلى سير محدد | `transactionIds` | `200 OK` | **PASS** |
| `/api/batches/:id/transactions/:txId` | `DELETE` | إزالة عملية من سير | Path Params | `200 OK` | **PASS** |
| `/api/batches/merge` | `POST` | دمج سيرين أو أكثر | Source & Target | `200 OK` | **PASS** |
| `/api/batches/split` | `POST` | فصل عمليات في سير جديد | Source & TxIDs | `200 OK` | **PASS** |
| `/api/batches/:id/status` | `PATCH` | إغلاق أو إعادة فتح سير | `OPEN` / `CLOSED` | `200 OK` | **PASS** |
| `/api/duplicates` | `GET` | عرض سجل محاولات التكرار المحجوبة | لا يوجد | `200 OK` | **PASS** |
| `/api/ocr/upload` | `POST` | رفع إشعار مفرد ومسحه بالـ OCR | Multipart / Image | `200 OK` | **PASS** |
| `/api/ocr/batch-upload` | `POST` | رفع حتى 10 إشعارات ومسحها مجمعة | Multipart / Array | `200 OK` | **PASS** |
| `/api/reports/summary` | `GET` | ملخص الحسابات حسب الفترة والسير | Query Params | `200 OK` | **PASS** |
| `/api/reports/excel` | `GET` | تصدير وتنزيل ملف Excel (.xlsx) | Query Params | `200 OK (Stream)` | **PASS** |
| `/api/whatsapp/conversations` | `GET` | جلب قنوات المحادثة (وارد/صادر) | لا يوجد | `200 OK` | **PASS** |
| `/api/whatsapp/conversations/:id/messages` | `GET` | جلب رسائل المحادثة | `id` في المسار | `200 OK` | **PASS** |
| `/api/whatsapp/conversations/:id/messages` | `POST` | إرسال أمر نصي أو صورة إشعار | FormData | `200 OK` | **PASS** |
| `/api/demo/reset` | `POST` | إعادة تهيئة بيانات العرض التجريبي | لا يوجد | `200 OK` | **PASS** |
| `/api/samples` | `GET` | قائمة عينات الإشعارات الست | لا يوجد | `200 OK` | **PASS** |

---

## 2. تفاصيل المعالجة ونموذج الاستجابة الموحد

- **الاستجابة الناجحة:**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **استجابة كشف التكرار (Duplicate 409 Conflict):**
  ```json
  {
    "success": false,
    "duplicate": true,
    "data": {
      "status": "DUPLICATE",
      "message": "تنبيه: العملية رقم 20188179228 مسجلة مسبقاً...",
      "duplicateDetails": {
        "originalTransaction": { ... },
        "attemptedAmount": 1000000,
        "amountMismatch": false
      }
    }
  }
  ```
- **استجابة الأخطاء:**
  ```json
  {
    "success": false,
    "error": "وصف رسالة الخطأ المفهومة للمستخدم"
  }
  ```
