import ExcelJS from 'exceljs';
import { prisma } from './db';

export interface ReportFilterOptions {
  direction?: 'INWARD' | 'OUTWARD';
  startDate?: Date;
  endDate?: Date;
  batchId?: string;
}

export class ExcelService {
  /**
   * Generates a professionally styled RTL Arabic Excel Workbook buffer
   */
  public static async generateReport(options: ReportFilterOptions = {}): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HISAB AI Financial System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('سجل العمليات المالية', {
      views: [{ rightToLeft: true }] // Native Arabic RTL view
    });

    // 1. Fetch transactions based on filter
    const where: any = {};
    if (options.direction) {
      where.direction = options.direction;
    }
    if (options.startDate || options.endDate) {
      where.receivedAt = {};
      if (options.startDate) where.receivedAt.gte = options.startDate;
      if (options.endDate) where.receivedAt.lte = options.endDate;
    }
    if (options.batchId) {
      where.batchTransactions = {
        some: { batchId: options.batchId }
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        batchTransactions: {
          include: { batch: true }
        }
      },
      orderBy: { receivedAt: 'desc' }
    });

    // Aggregates
    const totalInward = transactions.filter(t => t.direction === 'INWARD').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalOutward = transactions.filter(t => t.direction === 'OUTWARD').reduce((acc, t) => acc + Number(t.amount), 0);
    const netBalance = totalInward - totalOutward;
    const duplicateCount = await prisma.duplicateAttempt.count();

    // 2. Title Header Styling
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'HISAB AI | نظام إدارة التحويلات الذكي - كشف الحساب والعمليات المالية';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D3E' } }; // Dark petroleum green
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // 3. Subheader date info
    worksheet.mergeCells('A2:K2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `تاريخ إصدار التقرير: ${new Date().toLocaleString('ar-EG')} | نطاق التقرير: ${options.direction ? (options.direction === 'INWARD' ? 'الوارد فقط' : 'الصادر فقط') : 'شامل الوارد والصادر'}`;
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 24;

    // 4. Summary KPI Cards Block (Rows 4-5)
    worksheet.mergeCells('B4:C4');
    worksheet.getCell('B4').value = 'إجمالي الوارد';
    worksheet.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    worksheet.getCell('B4').font = { bold: true, color: { argb: 'FF166534' } };
    worksheet.getCell('B4').alignment = { horizontal: 'center' };

    worksheet.mergeCells('B5:C5');
    worksheet.getCell('B5').value = `${totalInward.toLocaleString()} SDG`;
    worksheet.getCell('B5').font = { bold: true, size: 13, color: { argb: 'FF166534' } };
    worksheet.getCell('B5').alignment = { horizontal: 'center' };

    worksheet.mergeCells('E4:F4');
    worksheet.getCell('E4').value = 'إجمالي الصادر';
    worksheet.getCell('E4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    worksheet.getCell('E4').font = { bold: true, color: { argb: 'FF991B1B' } };
    worksheet.getCell('E4').alignment = { horizontal: 'center' };

    worksheet.mergeCells('E5:F5');
    worksheet.getCell('E5').value = `${totalOutward.toLocaleString()} SDG`;
    worksheet.getCell('E5').font = { bold: true, size: 13, color: { argb: 'FF991B1B' } };
    worksheet.getCell('E5').alignment = { horizontal: 'center' };

    worksheet.mergeCells('H4:I4');
    worksheet.getCell('H4').value = 'صافي الرصيد';
    worksheet.getCell('H4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    worksheet.getCell('H4').font = { bold: true, color: { argb: 'FF075985' } };
    worksheet.getCell('H4').alignment = { horizontal: 'center' };

    worksheet.mergeCells('H5:I5');
    worksheet.getCell('H5').value = `${netBalance.toLocaleString()} SDG`;
    worksheet.getCell('H5').font = { bold: true, size: 13, color: { argb: 'FF075985' } };
    worksheet.getCell('H5').alignment = { horizontal: 'center' };

    worksheet.mergeCells('J4:K4');
    worksheet.getCell('J4').value = 'محاولات تكرار محجوبة';
    worksheet.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    worksheet.getCell('J4').font = { bold: true, color: { argb: 'FF92400E' } };
    worksheet.getCell('J4').alignment = { horizontal: 'center' };

    worksheet.mergeCells('J5:K5');
    worksheet.getCell('J5').value = `${duplicateCount} محاولة مستبعدة`;
    worksheet.getCell('J5').font = { bold: true, size: 12, color: { argb: 'FF92400E' } };
    worksheet.getCell('J5').alignment = { horizontal: 'center' };

    worksheet.getRow(4).height = 22;
    worksheet.getRow(5).height = 26;

    // 5. Table Headers (Row 7)
    const headerRow = worksheet.getRow(7);
    headerRow.values = [
      'م',
      'رقم العملية',
      'المبلغ (SDG)',
      'النوع',
      'تاريخ العملية',
      'تاريخ الاستلام',
      'من حساب',
      'إلى حساب',
      'المستفيد',
      'حالة المطابقة',
      'السير المرتبط'
    ];
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134E4A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    });

    // 6. Data Rows
    let currentRowIndex = 8;
    transactions.forEach((tx, idx) => {
      const row = worksheet.getRow(currentRowIndex);
      const batchNames = tx.batchTransactions.map(bt => bt.batch.name).join(', ') || '-';
      const directionLabel = tx.direction === 'INWARD' ? 'وارد' : 'صادر';
      const statusLabel = tx.verificationStatus === 'VERIFIED' ? 'معتمد' : (tx.verificationStatus === 'PENDING_REVIEW' ? 'قيد المراجعة' : 'مرفوض');
      const numAmount = Number(tx.amount);

      row.values = [
        idx + 1,
        tx.transactionNumber,
        numAmount,
        directionLabel,
        tx.transactionDate ? new Date(tx.transactionDate).toLocaleString('ar-EG') : '-',
        new Date(tx.receivedAt).toLocaleString('ar-EG'),
        tx.senderAccount || '-',
        tx.receiverAccount || '-',
        tx.beneficiaryName || '-',
        statusLabel,
        batchNames
      ];

      const isEven = idx % 2 === 0;
      row.height = 24;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNum === 3) {
          cell.numFmt = '#,##0.00';
          cell.font = { bold: true, color: { argb: tx.direction === 'INWARD' ? 'FF166534' : 'FF991B1B' } };
        }
      });

      currentRowIndex++;
    });

    // 7. Auto-fit column widths
    worksheet.columns.forEach((col, index) => {
      const widths = [6, 18, 16, 12, 22, 22, 24, 24, 24, 16, 20];
      col.width = widths[index] || 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
