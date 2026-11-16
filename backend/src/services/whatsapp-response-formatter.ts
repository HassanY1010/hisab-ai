export interface WhatsAppSuccessParams {
  transactionNumber: string;
  amount: number;
  direction: 'INWARD' | 'OUTWARD';
  dateStr?: string | null;
  timeStr?: string | null;
  beneficiaryName?: string | null;
  receiverAccount?: string | null;
  senderAccount?: string | null;
  stats: {
    totalInward: number;
    totalOutward: number;
    netBalance: number;
    totalCount: number;
  };
}

export interface WhatsAppDuplicateParams {
  transactionNumber: string;
  amount: number;
  dateStr?: string | null;
  originalAmount?: number;
  amountMismatch?: boolean;
}

export interface WhatsAppReviewParams {
  transactionNumber?: string | null;
  amount?: number | null;
  dateStr?: string | null;
  timeStr?: string | null;
  reason?: string;
}

export class WhatsAppResponseFormatter {
  /**
   * Masks a bank account to show only the last 4 digits for privacy and compliance:
   * e.g. "0001 2932 0506 1363" -> "**** 0001"
   */
  public static maskAccount(account: string | null | undefined): string | null {
    if (!account) return null;
    const trimmed = account.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    // In Sudanese Bankak receipts, check 4-digit components or trailing digits
    if (parts.length > 1 && parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
      return `\`**** ${parts[0]}\``;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      const last4 = digitsOnly.slice(-4);
      return `\`**** ${last4}\``;
    }
    return `\`${trimmed}\``;
  }

  /**
   * Formats a financial amount in SDG with standard thousands separators:
   * e.g. 1500000 -> "*1,500,000 SDG*"
   */
  public static formatAmount(amount: number): string {
    return `*${amount.toLocaleString('en-US')} SDG*`;
  }

  /**
   * Standard Success Template for Inward and Outward transfers
   */
  public static formatSuccess(params: WhatsAppSuccessParams): string {
    const isOutward = params.direction === 'OUTWARD';
    const dirLabel = isOutward ? '*صادر (مرسل)*' : '*وارد (مستلم)*';
    const rawAccount = isOutward ? (params.receiverAccount || params.senderAccount) : (params.receiverAccount || params.senderAccount);
    const maskedAccount = this.maskAccount(rawAccount);
    const accountLabel = isOutward ? 'الحساب المحوّل إليه' : 'الحساب المستلم';
    const personLabel = isOutward ? 'اسم المرسل إليه' : 'اسم المستفيد';

    const lines: string[] = [
      '✅ *تم تسجيل الإشعار البنكي بنجاح*',
      '',
      '📋 *تفاصيل العملية*',
      '',
      `▫️ رقم العملية: \`${params.transactionNumber}\``,
      `▫️ المبلغ: ${this.formatAmount(params.amount)}`,
      `▫️ نوع العملية: ${dirLabel}`
    ];

    // Only display fields if reliably extracted
    if (params.dateStr && params.dateStr.trim().length > 0) {
      lines.push(`▫️ تاريخ الإشعار: ${params.dateStr.trim()}`);
    }
    if (params.timeStr && params.timeStr.trim().length > 0) {
      lines.push(`▫️ وقت الإشعار: ${params.timeStr.trim()}`);
    }
    if (params.beneficiaryName && params.beneficiaryName.trim().length > 1) {
      lines.push(`▫️ ${personLabel}: ${params.beneficiaryName.trim()}`);
    }
    if (maskedAccount) {
      lines.push(`▫️ ${accountLabel}: ${maskedAccount}`);
    }

    lines.push('');
    lines.push('📊 *الموقف المالي الحالي*');
    lines.push('');
    lines.push(`▫️ إجمالي الوارد: *${params.stats.totalInward.toLocaleString('en-US')} SDG*`);
    lines.push(`▫️ إجمالي الصادر: *${params.stats.totalOutward.toLocaleString('en-US')} SDG*`);
    lines.push(`▫️ صافي الفرق: *${params.stats.netBalance.toLocaleString('en-US')} SDG*`);
    lines.push(`▫️ عدد العمليات: *${params.stats.totalCount}*`);
    lines.push('');
    lines.push('📌 تم حفظ بيانات الإشعار بنجاح.');

    return lines.join('\n');
  }

  /**
   * Standard Duplicate Detected Template
   */
  public static formatDuplicate(params: WhatsAppDuplicateParams): string {
    const lines: string[] = [
      '⚠️ *تنبيه: هذه العملية مسجلة مسبقاً*',
      '',
      '📋 *تفاصيل الإشعار المكرر*',
      '',
      `▫️ رقم العملية: \`${params.transactionNumber}\``,
      `▫️ المبلغ: ${this.formatAmount(params.amount)}`
    ];

    if (params.dateStr && params.dateStr.trim().length > 0) {
      lines.push(`▫️ تاريخ الإشعار: ${params.dateStr.trim()}`);
    }

    if (params.amountMismatch && params.originalAmount !== undefined) {
      lines.push(`⚠️ تحذير: المبلغ في هذا الإشعار (${this.formatAmount(params.amount)}) يختلف عن المبلغ المسجل أصلاً (${this.formatAmount(params.originalAmount)})!`);
    }

    lines.push('');
    lines.push('📌 لم تتم إضافة العملية مرة أخرى.');
    lines.push('📊 لم تتغير الإجماليات المالية.');
    lines.push('');
    lines.push('يرجى مراجعة سجل العمليات للتأكد من الإشعار الأصلي.');

    return lines.join('\n');
  }

  /**
   * Template for when essential data (Tx number or amount) is missing or cannot be verified
   */
  public static formatIncompleteData(params: WhatsAppReviewParams): string {
    const lines: string[] = [
      '⚠️ *الإشعار يحتاج إلى مراجعة*',
      '',
      'تم فحص الإشعار، لكن تعذر التأكد بصورة قطعية من البيانات الأساسية التالية:',
      '',
      `▫️ رقم العملية: ${params.transactionNumber ? `\`${params.transactionNumber}\`` : 'غير مؤكد'}`,
      `▫️ المبلغ: ${params.amount ? this.formatAmount(params.amount) : 'غير مؤكد'}`
    ];

    if (params.dateStr && params.dateStr.trim().length > 0) {
      lines.push(`▫️ تاريخ الإشعار: ${params.dateStr.trim()}`);
    }
    if (params.timeStr && params.timeStr.trim().length > 0) {
      lines.push(`▫️ وقت الإشعار: ${params.timeStr.trim()}`);
    }
    if (params.reason) {
      lines.push(`▫️ سبب المراجعة: ${params.reason}`);
    }

    lines.push('');
    lines.push('📌 لم يتم اعتماد العملية تلقائياً حفاظاً على دقة الحسابات.');
    lines.push('▫️ يرجى إرسال صورة أوضح أو تأكيد بيانات الإشعار يدوياً من لوحة التحكم.');

    return lines.join('\n');
  }

  /**
   * Template for when OCR could not recognize receipt text (unclear image, bad angle, non-receipt)
   */
  public static formatExtractionFailed(): string {
    return [
      '⚠️ *تعذر استخراج بيانات الإشعار*',
      '',
      'تم استقبال صورة الإشعار، لكن تعذر قراءة نصوص وبيانات الإشعار البنكي بصورة كافية.',
      '',
      '📌 لم يتم تسجيل أي عملية في الحسابات.',
      '▫️ يرجى إرسال صورة أوضح بزاوية مستقيمة وإضاءة جيدة، أو إدخال الإشعار يدوياً من لوحة التحكم.'
    ].join('\n');
  }

  /**
   * Backward compatibility alias
   */
  public static formatReviewNeeded(params: WhatsAppReviewParams): string {
    return this.formatIncompleteData(params);
  }

  /**
   * Standard System / Processing Failure Template (No internal errors leaked)
   */
  public static formatFailure(): string {
    return [
      '❌ *تعذر إكمال معالجة الإشعار*',
      '',
      'حدث خطأ غير متوقع أثناء معالجة الطلب، ولم يتم حفظ العملية.',
      '',
      '📌 لم تتأثر أي بيانات أو إجماليات مالية.',
      '▫️ يرجى إعادة المحاولة لاحقاً أو التواصل مع الدعم الفني.'
    ].join('\n');
  }
}
