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
   * Masks a bank account to show only the last 4 digits for privacy:
   * e.g. "0001 2932 0506 1363" -> "**** 0001" or last 4 digits
   */
  public static maskAccount(account: string | null | undefined): string | null {
    if (!account) return null;
    const digitsOnly = account.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      // In Bankak Sudanese receipts, the account ending is often written at the start or end of the group
      // E.g. "0001 2932 0506 1363" -> ending is 0001
      const parts = account.trim().split(/\s+/);
      const lastPart = parts[0].length === 4 ? parts[0] : parts[parts.length - 1];
      return `\`**** ${lastPart}\``;
    }
    return `\`${account}\``;
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
    const dirLabel = isOutward ? '*صادر (مدفوع)*' : '*وارد (مستلم)*';
    const maskedAccount = this.maskAccount(params.receiverAccount || params.senderAccount);
    const accountLabel = isOutward ? 'الحساب المحوّل إليه' : 'الحساب المستلم';

    const lines: string[] = [
      '✅ *تم تسجيل الإشعار البنكي بنجاح*',
      '',
      '📋 *تفاصيل العملية*',
      '',
      `▫️ رقم العملية: \`${params.transactionNumber}\``,
      `▫️ المبلغ: ${this.formatAmount(params.amount)}`,
      `▫️ نوع العملية: ${dirLabel}`
    ];

    if (params.dateStr) {
      lines.push(`▫️ تاريخ الإشعار: ${params.dateStr}`);
    }
    if (params.timeStr) {
      lines.push(`▫️ وقت الإشعار: ${params.timeStr}`);
    }
    if (params.beneficiaryName && params.beneficiaryName.trim().length > 1) {
      lines.push(`▫️ اسم المستفيد: ${params.beneficiaryName.trim()}`);
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

    if (params.dateStr) {
      lines.push(`▫️ تاريخ الإشعار: ${params.dateStr}`);
    }

    if (params.amountMismatch && params.originalAmount !== undefined) {
      lines.push(`⚠️ تحذير: المبلغ المحاول يختلف عن المبلغ الأصلي (${params.originalAmount.toLocaleString('en-US')} SDG)!`);
    }

    lines.push('');
    lines.push('📌 لم تتم إضافة العملية مرة أخرى.');
    lines.push('📊 لم تتغير الإجماليات المالية.');
    lines.push('');
    lines.push('يرجى مراجعة سجل العمليات للتأكد من الإشعار الأصلي.');

    return lines.join('\n');
  }

  /**
   * Standard Needs Review Template
   */
  public static formatReviewNeeded(params: WhatsAppReviewParams): string {
    const lines: string[] = [
      '⚠️ *الإشعار يحتاج إلى مراجعة*',
      '',
      'تم استقبال صورة الإشعار، لكن تعذر استخراج بعض البيانات بصورة موثوقة.',
      '',
      `▫️ المبلغ: ${params.amount ? this.formatAmount(params.amount) : 'غير واضح'}`,
      `▫️ رقم العملية: ${params.transactionNumber ? `\`${params.transactionNumber}\`` : 'غير واضح'}`,
      `▫️ التاريخ: ${params.dateStr || 'غير واضح'}`,
      `▫️ الوقت: ${params.timeStr || 'غير واضح'}`
    ];

    if (params.reason) {
      lines.push(`▫️ سبب المراجعة: ${params.reason}`);
    }

    lines.push('');
    lines.push('يرجى إرسال صورة أوضح أو مراجعة البيانات يدوياً.');

    return lines.join('\n');
  }

  /**
   * Standard System / Processing Failure Template
   */
  public static formatFailure(customMsg?: string): string {
    return [
      '❌ *تعذر تسجيل الإشعار*',
      '',
      'حدثت مشكلة أثناء معالجة الإشعار البنكي.',
      '',
      'لم يتم تأكيد تسجيل العملية.',
      '',
      customMsg ? `▫️ التفاصيل: ${customMsg}\n` : '',
      'يرجى المحاولة مرة أخرى لاحقاً أو مراجعة المسؤول.'
    ].filter(Boolean).join('\n');
  }
}
