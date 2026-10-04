require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const customers = await prisma.user.findMany({
      where: {
        email: {
          notIn: ['admin@phoneshop.vn', 'staff@phoneshop.vn'],
        },
      },
      include: {
        orders: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { shipping: true },
        },
      },
      take: 30,
    });

    console.log(`Found ${customers.length} customers to seed notifications for...`);

    const notificationsToInsert = [];

    for (let c = 0; c < customers.length; c++) {
      const user = customers[c];
      const recentOrder = user.orders[0];

      // 1. System Welcome Notification (read)
      notificationsToInsert.push({
        userId: user.id,
        type: 'SYSTEM',
        channel: 'IN_APP',
        title: 'Chào mừng bạn đến với PhoneShop',
        message: `Xin chào ${user.firstName || 'bạn'}, cảm ơn bạn đã gia nhập PhoneShop! Trải nghiệm mua sắm đồ công nghệ chính hãng hàng đầu.`,
        data: { welcome: true },
        isRead: true,
        readAt: new Date(Date.now() - 7 * 86400000),
        createdAt: new Date(Date.now() - 7 * 86400000),
      });

      // 2. Promotion Notification (unread)
      notificationsToInsert.push({
        userId: user.id,
        type: 'PROMOTION',
        channel: 'IN_APP',
        title: '🎁 Ưu đãi đặc quyền: Giảm 200.000đ cho đơn hàng tiếp theo',
        message: 'Áp dụng mã PHONENEW khi thanh toán đơn hàng từ 5.000.000đ. Số lượng có hạn!',
        data: { couponCode: 'PHONENEW', discountAmount: 200000 },
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 3600000),
      });

      // 3. Promotion Notification 2 (read)
      notificationsToInsert.push({
        userId: user.id,
        type: 'PROMOTION',
        channel: 'IN_APP',
        title: '🔥 Siêu hội Flash Sale phụ kiện công nghệ - Giảm đến 50%',
        message: 'Hàng loạt cáp sạc nhanh Anker, ốp lưng Magsafe và tai nghe Bluetooth chính hãng giảm sốc.',
        data: { category: 'accessories' },
        isRead: true,
        readAt: new Date(Date.now() - 24 * 3600000),
        createdAt: new Date(Date.now() - 2 * 86400000),
      });

      // 4. Order & Shipping notifications if user has orders
      if (recentOrder) {
        const orderCode = recentOrder.orderNumber || recentOrder.id.slice(0, 8).toUpperCase();

        notificationsToInsert.push({
          userId: user.id,
          type: 'ORDER',
          channel: 'IN_APP',
          title: `Đơn hàng #${orderCode} đã được tiếp nhận thành công`,
          message: `Chúng tôi đã nhận được đơn hàng #${orderCode} của bạn và đang tiến hành xử lý đóng gói.`,
          data: { orderId: recentOrder.id, orderNumber: orderCode },
          isRead: true,
          readAt: new Date(recentOrder.createdAt.getTime() + 1800000),
          createdAt: recentOrder.createdAt,
        });

        if (recentOrder.status === 'SHIPPING' || recentOrder.status === 'DELIVERED' || recentOrder.status === 'COMPLETED') {
          notificationsToInsert.push({
            userId: user.id,
            type: 'SHIPPING',
            channel: 'IN_APP',
            title: `Đơn hàng #${orderCode} đang trên đường giao đến bạn`,
            message: `Kiện hàng #${orderCode} đã được bàn giao cho đối tác vận chuyển. Vui lòng chú ý điện thoại từ nhân viên giao hàng.`,
            data: {
              orderId: recentOrder.id,
              orderNumber: orderCode,
              trackingNumber: recentOrder.shipping?.trackingNumber || 'GHN-' + recentOrder.id.slice(0, 6).toUpperCase(),
            },
            isRead: false,
            createdAt: new Date(Date.now() - 2 * 3600000),
          });
        }

        if (recentOrder.status === 'DELIVERED' || recentOrder.status === 'COMPLETED') {
          notificationsToInsert.push({
            userId: user.id,
            type: 'WARRANTY',
            channel: 'IN_APP',
            title: `Kích hoạt bảo hành điện tử cho đơn hàng #${orderCode}`,
            message: `Thiết bị trong đơn hàng #${orderCode} đã được kích hoạt bảo hành chính hãng 12 tháng. Tra cứu bảo hành tại mục Tra cứu IMEI.`,
            data: { orderId: recentOrder.id, orderNumber: orderCode },
            isRead: false,
            createdAt: new Date(Date.now() - 1 * 3600000),
          });
        }
      }
    }

    console.log(`Inserting ${notificationsToInsert.length} realistic notifications...`);

    const result = await prisma.notification.createMany({
      data: notificationsToInsert,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully seeded ${result.count} notifications!`);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
