import 'dotenv/config';
import { PrismaClient, StockMovementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Bắt đầu quét và khôi phục dữ liệu Sổ kho từ audit_logs & orders ---');

  // 1. Quét audit_logs có action = 'UPDATE_STOCK'
  const auditLogs = await prisma.auditLog.findMany({
    where: { action: 'UPDATE_STOCK', entity: 'inventory' },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Tìm thấy ${auditLogs.length} bản ghi UPDATE_STOCK trong audit_logs.`);

  let auditMigrated = 0;
  for (const log of auditLogs) {
    if (!log.entityId) continue;
    const variantId = log.entityId;

    const oldData = log.oldData as any;
    const newData = log.newData as any;
    if (!oldData || !newData) continue;

    const oldQty = oldData.quantity ?? 0;
    const newQty = newData.quantity ?? oldQty;
    const delta = newQty - oldQty;
    if (delta === 0) continue;

    // Check idempotency: check if movement already exists for this log timestamp and variantId
    const existing = await prisma.stockMovement.findFirst({
      where: {
        variantId,
        createdAt: log.createdAt,
        referenceType: 'MIGRATION_AUDIT',
      },
    });

    if (existing) continue;

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { costPrice: true, price: true },
    });

    const unitPrice = Number(variant?.costPrice ?? variant?.price ?? 0);
    const totalAmount = Math.abs(delta) * unitPrice;

    await prisma.stockMovement.create({
      data: {
        variantId,
        type: delta > 0 ? StockMovementType.IMPORT_MANUAL : StockMovementType.EXPORT_MANUAL,
        quantity: delta,
        balanceBefore: oldQty,
        balanceAfter: newQty,
        unitPrice,
        totalAmount,
        referenceType: 'MIGRATION_AUDIT',
        referenceId: log.id,
        performedBy: log.userId,
        note: newData.note || 'Khôi phục từ Audit Log điều chỉnh kho',
        createdAt: log.createdAt,
      },
    });
    auditMigrated++;
  }

  console.log(`Đã chuyển đổi thành công ${auditMigrated} bản ghi từ audit_logs.`);

  // 2. Quét các đơn hàng đã hoàn tất (DELIVERED hoặc COMPLETED)
  const completedOrders = await prisma.order.findMany({
    where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  let ordersMigrated = 0;
  for (const order of completedOrders) {
    for (const item of order.items) {
      const existing = await prisma.stockMovement.findFirst({
        where: {
          variantId: item.variantId,
          referenceType: 'ORDER',
          referenceId: order.orderNumber,
        },
      });

      if (existing) continue;

      const unitPrice = Number(item.unitPrice);
      const totalAmount = item.quantity * unitPrice;

      await prisma.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: StockMovementType.EXPORT_ORDER,
          quantity: -item.quantity,
          balanceBefore: item.quantity, // Historical baseline estimation
          balanceAfter: 0,
          unitPrice,
          totalAmount,
          referenceType: 'ORDER',
          referenceId: order.orderNumber,
          note: `Khôi phục lịch sử xuất bán đơn hàng #${order.orderNumber}`,
          createdAt: order.deliveredAt || order.completedAt || order.createdAt,
        },
      });
      ordersMigrated++;
    }
  }

  console.log(`Đã chuyển đổi thành công ${ordersMigrated} bản ghi xuất kho từ đơn hàng hoàn tất.`);
  console.log('--- Hoàn tất script khôi phục lịch sử Sổ kho! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
