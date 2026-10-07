import 'dotenv/config';
import { PrismaClient, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedTicketsDirectly() {
  console.log('🚀 Seeding 13 Support Tickets & Live Chat conversations...');

  // Get staff user
  const staff = await prisma.user.findFirst({
    where: { email: 'staff@phoneshop.vn' },
  });
  if (!staff) {
    throw new Error('Staff user not found');
  }

  // Get customers
  const customers = await prisma.user.findMany({
    where: {
      email: { notIn: ['admin@phoneshop.vn', 'staff@phoneshop.vn'] },
    },
    take: 20,
  });

  if (customers.length === 0) {
    throw new Error('No customers found');
  }

  // Get sample orders
  const sampleOrders = await prisma.order.findMany({
    select: { id: true, userId: true, orderNumber: true },
    take: 10,
  });

  const ticketBlueprints = [
    {
      code: 'TK-202610-0001',
      title: 'Yêu cầu đổi địa chỉ nhận hàng do đi công tác đột xuất',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      linkOrder: true,
      assigned: false,
      minutesAgo: 45,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Chào shop, mình vừa đặt đơn hàng nhưng mai mình phải đi công tác gấp ra Hà Nội. Nhờ shop đổi địa chỉ nhận hàng giúp mình sang số 18 Hoàng Đạo Thúy, Cầu Giấy được không ạ? Cảm ơn shop nhiều.',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0002',
      title: '[Live Chat] Tư vấn chọn màu iPhone 15 Pro và thời gian giao hỏa tốc',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      linkOrder: false,
      assigned: false,
      minutesAgo: 30,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Dạ shop ơi, em đang phân vân giữa màu Titan Tự nhiên và Titan Xanh. Bản nào nhìn sang hơn ạ? Với nếu em đặt trong tối nay thì sáng mai ở Q.1 nhận kịp không shop?',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0003',
      title: 'Báo lỗi trừ tiền thẻ tín dụng nhưng chưa thấy xác nhận đơn hàng',
      category: TicketCategory.PAYMENT_INSTALLMENT,
      priority: TicketPriority.URGENT,
      status: TicketStatus.OPEN,
      linkOrder: true,
      assigned: false,
      minutesAgo: 15,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Tôi thanh toán đơn hàng qua cổng thẻ tín dụng Techcombank, tài khoản đã bị trừ tiền nhưng hệ thống báo lỗi Timeout và đơn hàng vẫn ở trạng thái Chờ thanh toán. Yêu cầu bộ phận tài chính kiểm tra gấp!',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0004',
      title: 'Màn hình xuất hiện sọc xanh sau 2 tuần mua máy',
      category: TicketCategory.WARRANTY_SUPPORT,
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 240,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Chào PhoneShop, máy mình mua cách đây 2 tuần tự nhiên sáng nay bật lên bị 1 đường sọc xanh mảnh ở mép phải màn hình. Máy không hề rơi rớt hay dính nước, còn nguyên bảo hành. Cần hỗ trợ gấp.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Kỹ thuật đã xem ảnh chụp IMEI từ khách hàng. Xác định máy còn bảo hành chính hãng 11 tháng. Đã tạo phiếu hẹn mang máy qua TTBH 86 Nguyễn Trãi để đổi cụm màn hình mới theo chính sách 1 đổi 1 30 ngày.',
          minsAfter: 20,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh/chị, PhoneShop rất tiếc về sự cố này. Theo chính sách của cửa hàng trong 30 ngày đầu, máy anh/chị được áp dụng bảo hành 1 đổi 1 linh kiện chính hãng. Kỹ thuật viên đã tiếp nhận thông tin và mời anh/chị mang máy qua chi nhánh gần nhất để được kiểm tra thay thế ngay trong ngày ạ.',
          minsAfter: 25,
        },
      ],
    },
    {
      code: 'TK-202610-0005',
      title: '[Live Chat] Hỏi chính sách thu cũ đổi mới lên đời Samsung Galaxy S24 Ultra',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: false,
      assigned: true,
      minutesAgo: 180,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Em đang xài Galaxy S22 Ultra 256GB bản VN fullbox, bên shop có thu lại bù tiền lấy S24 Ultra không ạ? Trợ giá thu cũ bao nhiêu % vậy shop?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ PhoneShop có chương trình Trade-in Thu cũ đổi mới trợ giá lên đến 2.500.000₫ ạ! Với dòng S22 Ultra ngoại hình đẹp máy loại 1, bên em định giá dự kiến từ 11 - 12.5 triệu tùy tình trạng pin và viền máy. Bạn có thể ghé shop để kỹ thuật test máy trong 15 phút nhé.',
          minsAfter: 10,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Dạ tuyệt quá, chiều nay khoảng 17h mình ghé cửa hàng nha shop!',
          minsAfter: 15,
        },
      ],
    },
    {
      code: 'TK-202610-0006',
      title: 'Cần hỗ trợ đóng gói và mã vận chuyển gửi đổi trả sản phẩm',
      category: TicketCategory.RETURN_REFUND,
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 360,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Phiếu yêu cầu đổi trả của mình đã được duyệt, nhưng mình chưa nhận được mã vận đơn gửi hàng của bên Viettel Post. Nhờ CSKH gửi lại mã giúp mình.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Đã liên hệ điều phối bưu cục Viettel Post khu vực Tân Bình, mã vận đơn tạo bổ sung: VTP-99281726.',
          minsAfter: 30,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh/chị, bên em đã gửi mã bưu gửi miễn phí VTP-99281726 qua tin nhắn SMS và email của anh/chị rồi ạ. Shipper bưu tá sẽ liên hệ lấy hàng tận nơi trong chiều nay ạ.',
          minsAfter: 35,
        },
      ],
    },
    {
      code: 'TK-202610-0007',
      title: 'Yêu cầu xuất lại hóa đơn GTGT điện tử công ty (sai mã số thuế)',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 500,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Kế toán bên mình kiểm tra hóa đơn điện tử đơn hàng bị sai 1 số cuối của MST. Kính nhờ PhoneShop xuất biên bản điều chỉnh và gửi lại hóa đơn thay thế qua email ketoan@vietnamcorp.vn.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ bộ phận Kế toán của PhoneShop đã nhận được thông tin và đang lập biên bản điều chỉnh hóa đơn điện tử. Bản sửa đổi sẽ được gửi qua email cho quý công ty trong vòng 24h làm việc ạ.',
          minsAfter: 45,
        },
      ],
    },
    {
      code: 'TK-202610-0008',
      title: '[Live Chat] Hướng dẫn kích hoạt tính năng eSIM trên điện thoại mới nhận',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 1440,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình mới nhận điện thoại hồi sáng mà quét mã QR eSIM Viettel báo lỗi không thêm được gói cước, shop chỉ mình với.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ anh/chị vào Cài đặt -> Mạng di động -> Thêm eSIM -> Quét mã QR, lưu ý điện thoại cần kết nối Wifi ổn định trước khi quét mã kích hoạt nhé ạ.',
          minsAfter: 5,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình kết nối Wifi rồi quét được ngay rồi, cảm ơn bạn nhân viên hỗ trợ nhiệt tình nhé!',
          minsAfter: 12,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ vâng, chúc anh/chị có trải nghiệm tuyệt vời cùng máy mới ạ! Em xin phép đóng phiên hỗ trợ này nhé ạ.',
          minsAfter: 15,
        },
      ],
    },
    {
      code: 'TK-202610-0009',
      title: 'Thắc mắc lịch thanh toán trả góp kỳ đầu tiên qua Home Credit',
      category: TicketCategory.PAYMENT_INSTALLMENT,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.RESOLVED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 2000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Hồ sơ trả góp của tôi duyệt ngày 15/09, tôi muốn hỏi ngày thanh toán hàng tháng là ngày bao nhiêu và đóng qua app nào thì không bị phí trễ hạn?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh, kỳ hạn thanh toán cố định là ngày 15 hàng tháng ạ. Anh có thể tải app Home Credit hoặc đóng trực tiếp qua MoMo/ZaloPay mục Thanh toán khoản vay, nhập số hợp đồng để tra cứu và thanh toán tiện lợi ạ.',
          minsAfter: 30,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình đã tra cứu thành công trên MoMo rồi, cảm ơn shop.',
          minsAfter: 45,
        },
      ],
    },
    {
      code: 'TK-202610-0010',
      title: 'Khôi phục mật khẩu tài khoản và cập nhật số điện thoại nhận thông báo',
      category: TicketCategory.ACCOUNT_GENERAL,
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 2880,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Số điện thoại cũ của mình bị mất sim, nhờ hỗ trợ xác minh đổi số điện thoại trên tài khoản để nhận mã OTP nhận hàng.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Đã kiểm tra lịch sử đơn hàng và đối chiếu giấy tờ tùy thân CCCD khớp thông tin tài khoản.',
          minsAfter: 20,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ bộ phận CSKH đã cập nhật số điện thoại mới thành công. Anh/chị có thể đăng nhập lại và đổi mật khẩu bình thường rồi ạ.',
          minsAfter: 25,
        },
      ],
    },
    {
      code: 'TK-202610-0011',
      title: '[Live Chat] Kiểm tra tồn kho Xiaomi 14 Ultra tại chi nhánh Cầu Giấy',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.CLOSED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 4000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Shop cho mình hỏi bản màu Đen 512GB ở shop Cầu Giấy còn hàng sẵn để qua xem máy không?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chi nhánh 134 Cầu Giấy hiện có sẵn 2 máy nguyên seal ạ. Anh có muốn em giữ máy trước cho anh đến 20h tối nay không ạ?',
          minsAfter: 4,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Ok giữ giúp mình nhé, sđt mình là 0912345678, lát tan làm mình ghé liền.',
          minsAfter: 8,
        },
      ],
    },
    {
      code: 'TK-202610-0012',
      title: 'Tư vấn mua gói bảo hành mở rộng rơi vỡ vào nước PhoneShop Care+',
      category: TicketCategory.WARRANTY_SUPPORT,
      priority: TicketPriority.LOW,
      status: TicketStatus.CLOSED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 5000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Máy mình mua được 5 ngày, giờ mình muốn mua thêm gói bảo hành rơi vỡ 1 năm thì làm thế nào?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ trong vòng 30 ngày kể từ ngày nhận máy, anh chỉ cần mang máy ra shop để nhân viên kỹ thuật kiểm tra ngoại quan nguyên vẹn là có thể kích hoạt gói PhoneShop Care+ 12 tháng với giá ưu đãi giảm 20% ạ!',
          minsAfter: 25,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Cảm ơn bạn, mình vừa ghé shop mua xong rồi, dịch vụ rất chu đáo!',
          minsAfter: 60,
        },
      ],
    },
    {
      code: 'TK-202610-0013',
      title: 'Phản ánh shipper giao hàng trễ hẹn không liên hệ trước',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.CLOSED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 6000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Hôm qua hẹn giao buổi sáng mà đến chiều tối mới giao, lúc tới nơi cũng không gọi trước 15 phút làm mình phải nhờ bảo vệ nhận hộ.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ PhoneShop chân thành xin lỗi anh vì sự bất tiện này. Bên em đã làm việc với đối tác vận chuyển để chấn chỉnh tài xế và gửi tặng anh mã voucher giảm giá cho đơn hàng sau ạ.',
          minsAfter: 40,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Cảm ơn shop đã lắng nghe và xử lý nhanh chóng.',
          minsAfter: 90,
        },
      ],
    },
  ];

  let count = 0;
  for (let idx = 0; idx < ticketBlueprints.length; idx++) {
    const bp = ticketBlueprints[idx];
    const customer = customers[idx % customers.length];
    const order = bp.linkOrder && sampleOrders.length > 0 ? sampleOrders[idx % sampleOrders.length] : null;

    const createdAt = new Date(Date.now() - bp.minutesAgo * 60000);
    const resolvedAt =
      bp.status === TicketStatus.RESOLVED || bp.status === TicketStatus.CLOSED
        ? new Date(createdAt.getTime() + 60 * 60000)
        : null;

    const ticket = await prisma.ticket.upsert({
      where: { code: bp.code },
      update: {
        title: bp.title,
        category: bp.category,
        priority: bp.priority,
        status: bp.status,
        userId: customer.id,
        orderId: order?.id || null,
        assignedToId: bp.assigned ? staff.id : null,
        resolvedAt,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 10 * 60000),
      },
      create: {
        code: bp.code,
        title: bp.title,
        category: bp.category,
        priority: bp.priority,
        status: bp.status,
        userId: customer.id,
        orderId: order?.id || null,
        assignedToId: bp.assigned ? staff.id : null,
        resolvedAt,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 10 * 60000),
      },
    });

    await prisma.ticketMessage.deleteMany({
      where: { ticketId: ticket.id },
    });

    for (const msg of bp.messages) {
      const msgCreatedAt = new Date(createdAt.getTime() + (msg.minsAfter || 0) * 60000);
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: msg.isStaff ? staff.id : customer.id,
          message: msg.text,
          isInternalNote: Boolean(msg.isInternalNote),
          createdAt: msgCreatedAt,
        },
      });
    }

    count++;
  }

  console.log(`✅ Successfully seeded ${count} tickets!`);
  await prisma.$disconnect();
}

seedTicketsDirectly().catch((err) => {
  console.error('Failed to seed tickets:', err);
  process.exit(1);
});
