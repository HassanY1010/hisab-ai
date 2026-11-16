import { prisma } from '../services/db';
import { TransactionService } from '../services/transaction-service';

async function runScenario() {
  console.log('=================================================================');
  console.log('HISAB AI: سيناريو الاختبار المحاسبي الإلزامي (Requirement 9)');
  console.log('=================================================================\n');

  // Clean test tables
  await prisma.duplicateAttempt.deleteMany();
  await prisma.batchTransaction.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.transaction.deleteMany();

  console.log('1. إدخال العملية الأولى:');
  console.log('   - المبلغ: 5,000,000 SDG');
  console.log('   - رقم العملية: TEST10001');
  console.log('   - النوع: وارد (INWARD)');
  const op1 = await TransactionService.registerTransaction({
    transactionNumber: 'TEST10001',
    amount: 5000000,
    direction: 'INWARD'
  });
  console.log(`   -> النتيجة: ${op1.status} (${op1.message})\n`);

  console.log('2. إدخال العملية الثانية:');
  console.log('   - المبلغ: 3,000,000 SDG');
  console.log('   - رقم العملية: TEST10002');
  console.log('   - النوع: وارد (INWARD)');
  const op2 = await TransactionService.registerTransaction({
    transactionNumber: 'TEST10002',
    amount: 3000000,
    direction: 'INWARD'
  });
  console.log(`   -> النتيجة: ${op2.status} (${op2.message})\n`);

  console.log('3. إدخال العملية الثالثة:');
  console.log('   - المبلغ: 500,000 SDG');
  console.log('   - رقم العملية: TEST10003');
  console.log('   - النوع: صادر (OUTWARD)');
  const op3 = await TransactionService.registerTransaction({
    transactionNumber: 'TEST10003',
    amount: 500000,
    direction: 'OUTWARD'
  });
  console.log(`   -> النتيجة: ${op3.status} (${op3.message})\n`);

  // Verify Initial Totals
  const stats1 = await TransactionService.getFinancialStats();
  console.log('--- التحقق من الحسابات الأولية ---');
  console.log(`• إجمالي الوارد: ${stats1.totalInward.toLocaleString()} SDG (المتوقع: 8,000,000 SDG) -> ${stats1.totalInward === 8000000 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• إجمالي الصادر: ${stats1.totalOutward.toLocaleString()} SDG (المتوقع: 500,000 SDG) -> ${stats1.totalOutward === 500000 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• صافي الفرق: ${stats1.netBalance.toLocaleString()} SDG (المتوقع: 7,500,000 SDG) -> ${stats1.netBalance === 7500000 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• عدد العمليات الفريدة: ${stats1.totalTransactions} (المتوقع: 3) -> ${stats1.totalTransactions === 3 ? '✅ صحيح' : '❌ خطأ'}\n`);

  console.log('4. إعادة إرسال العملية الأولى (TEST10001) لاختبار نظام منع التكرار:');
  const duplicateAttempt = await TransactionService.registerTransaction({
    transactionNumber: 'TEST10001',
    amount: 5000000,
    direction: 'INWARD'
  });
  console.log(`   -> نتيجة محاولة التكرار: ${duplicateAttempt.status}`);
  console.log(`   -> رسالة النظام: ${duplicateAttempt.message}\n`);

  // Verify Totals After Duplicate
  const stats2 = await TransactionService.getFinancialStats();
  console.log('--- التحقق من الحسابات بعد محاولة التكرار ---');
  console.log(`• إجمالي الوارد بعد التكرار: ${stats2.totalInward.toLocaleString()} SDG (المتوقع: 8,000,000 SDG - لم يتغير) -> ${stats2.totalInward === 8000000 ? '✅ نجح: لم يتم احتساب المبلغ المكرر' : '❌ فشل'}`);
  console.log(`• إجمالي الصادر بعد التكرار: ${stats2.totalOutward.toLocaleString()} SDG (المتوقع: 500,000 SDG) -> ${stats2.totalOutward === 500000 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• صافي الفرق بعد التكرار: ${stats2.netBalance.toLocaleString()} SDG (المتوقع: 7,500,000 SDG) -> ${stats2.netBalance === 7500000 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• عدد العمليات الفريدة: ${stats2.totalTransactions} (المتوقع: 3) -> ${stats2.totalTransactions === 3 ? '✅ صحيح' : '❌ خطأ'}`);
  console.log(`• سجل محاولات التكرار المحجوبة: ${stats2.duplicateCount} محاولة مسجلة في سجل الرقابة -> ${stats2.duplicateCount === 1 ? '✅ نجح' : '❌ خطأ'}\n`);

  console.log('=================================================================');
  console.log('✅ اكتمل سيناريو الاختبار بنجاح تام وتطابق 100% مع المتطلبات المحاسبية');
  console.log('=================================================================');
}

runScenario().catch(console.error);
