// =============================================================================
// SEED PRODUCT REVIEWS + REPLIES (idempotent — safe to re-run)
// =============================================================================
// Creates realistic Vietnamese customer reviews (APPROVED + verified so they
// show on the storefront immediately) plus shop/customer replies underneath.
//
// Run:  npx tsx prisma/seed_reviews.ts   (from MobileCommerce/backend)
//
// - Uses REAL users/products already in the database (creates a few extra
//   Vietnamese customer accounts only if fewer than 5 USER accounts exist).
// - Respects @@unique([userId, productId]): existing reviews are skipped.
// - Replies are skipped when an identical (reviewId, userId, content) reply
//   already exists, so re-running never duplicates data.
// - Ensures the `review_replies` table exists (CREATE TABLE IF NOT EXISTS)
//   because the baseline migration history was created outside `prisma migrate`
//   — see prisma/migrations/20261003_add_review_replies/migration.sql.
// =============================================================================
import 'dotenv/config';
import { PrismaClient, UserStatus, ProductStatus, ReviewStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const daysAgo = (n: number): Date => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAfter = (d: Date, h: number): Date => new Date(d.getTime() + h * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Extra Vietnamese customers (created only when the DB has < 5 USER accounts)
// ---------------------------------------------------------------------------
const EXTRA_CUSTOMERS = [
  { email: 'minh.anh@gmail.com', firstName: 'Minh Anh', lastName: 'Trần', phone: '0901000011' },
  { email: 'duc.huy@gmail.com', firstName: 'Đức Huy', lastName: 'Phạm', phone: '0901000012' },
  { email: 'thu.trang@gmail.com', firstName: 'Thu Trang', lastName: 'Nguyễn', phone: '0901000013' },
  { email: 'hoang.nam@gmail.com', firstName: 'Hoàng Nam', lastName: 'Lê', phone: '0901000014' },
  { email: 'lan.phuong@gmail.com', firstName: 'Lan Phương', lastName: 'Võ', phone: '0901000015' },
];

// ---------------------------------------------------------------------------
// Review content pools (rotated deterministically so re-runs are stable)
// ---------------------------------------------------------------------------
const FIVE_STAR = [
  { title: 'Máy nguyên seal, kích hoạt bảo hành trong 5 phút', content: 'Đặt hàng trưa hôm qua, chiều nay đã nhận được máy. Hộp còn nguyên seal, shop hỗ trợ kích hoạt bảo hành điện tử ngay tại chỗ. Pin trâu, màn đẹp đúng như quảng cáo.' },
  { title: 'Pin trâu, dùng cả ngày vẫn còn 30%', content: 'Mình dùng 4G liên tục, lướt TikTok với chơi game nhẹ mà tối về vẫn còn pin. Sạc nhanh nên cắm lúc ăn cơm là đầy. Rất hài lòng trong tầm giá này.' },
  { title: 'Camera chụp đêm quá đỉnh', content: 'Chụp đêm rõ nét, ít noise hơn hẳn con máy cũ của mình. Chế độ chân dung xóa phông tự nhiên. Shop giao hàng nhanh, đóng gói cẩn thận 2 lớp chống sốc.' },
  { title: 'Hiệu năng mượt, không nóng máy', content: 'Chơi game nặng 2-3 tiếng máy chỉ ấm nhẹ, FPS ổn định. Màn hình tần số quét cao lướt rất đã. Sẽ giới thiệu bạn bè qua shop mua.' },
  { title: 'Đúng hàng chính hãng, check IMEI chuẩn', content: 'Mình tra mã IMEI trên trang bảo hành của shop ra đầy đủ thông tin, thời hạn 12 tháng. Yên tâm tuyệt đối, không lo hàng dựng.' },
  { title: 'Giao hoả tốc đúng 2 tiếng', content: 'Đặt lúc 9h sáng, 11h shipper đã gọi giao. Máy mới 100%, phụ kiện đầy đủ. Nhân viên tư vấn nhiệt tình, hỏi gì cũng trả lời kỹ.' },
];

const FOUR_STAR = [
  { title: 'Tổng thể tốt, loa hơi nhỏ', content: 'Máy đẹp, pin khỏe, camera ổn. Trừ 1 sao vì loa ngoài hơi nhỏ khi xem phim ở chỗ ồn. Còn lại mọi thứ đều xứng đáng với giá tiền.' },
  { title: 'Ngon trong tầm giá, sạc hơi chậm', content: 'Hiệu năng và màn hình đều tốt so với giá. Sạc đầy mất hơn 1 tiếng nên hơi sốt ruột chút, nhưng pin dùng lâu nên chấp nhận được.' },
  { title: 'Máy tốt, app rác hơi nhiều', content: 'Phần cứng không có gì chê, nhưng máy cài sẵn khá nhiều app không dùng tới, phải ngồi gỡ mất buổi. Shop nên nhắc khách vụ này lúc bán.' },
  { title: 'Chụp ảnh đẹp nhưng quay video trung bình', content: 'Chụp hình thì xuất sắc, nhưng quay video thiếu sáng hơi rung và bệt. Mình ít quay nên không sao, bạn nào hay quay vlog thì cân nhắc.' },
];

const THREE_STAR = [
  { title: 'Máy ổn nhưng giao hàng trễ 1 ngày', content: 'Chất lượng máy thì tốt, đúng mô tả. Nhưng đơn của mình bị trễ 1 ngày so với hẹn, phải gọi hotline hỏi mới thấy cập nhật. Mong shop cải thiện khâu vận chuyển.' },
  { title: 'Pin tụt nhanh hơn kỳ vọng', content: 'Mới mua 2 tuần mà thấy pin tụt nhanh hơn quảng cáo, chắc do mình bật màn 120Hz liên tục. Đang theo dõi thêm, shop bảo cứ dùng 1 tháng nếu vẫn vậy thì mang qua kiểm tra.' },
];

// Shop (staff) replies
const SHOP_THANKS = [
  'Cảm ơn bạn đã tin tưởng PhoneShop! Chúc bạn có trải nghiệm thật tuyệt vời cùng chiếc máy mới. Cần hỗ trợ gì cứ nhắn shop nhé.',
  'Shop cảm ơn đánh giá của bạn nhiều ạ! Máy có vấn đề gì trong quá trình sử dụng thì ghé ngay trung tâm bảo hành chính hãng để được hỗ trợ miễn phí nhé.',
  'Cảm ơn bạn đã ủng hộ! Đừng quên áp mã FREESHIP cho lần mua phụ kiện tiếp theo nha. PhoneShop luôn đồng hành cùng bạn.',
  'Cảm ơn review chi tiết của bạn! Đánh giá này giúp các khách hàng khác yên tâm hơn khi chọn máy. Chúc bạn dùng máy vui vẻ!',
];
const SHOP_SUPPORT = [
  'Chào bạn, shop rất tiếc về trải nghiệm chưa trọn vẹn này. Bạn vui lòng inbox fanpage kèm mã đơn hàng để shop kiểm tra và hỗ trợ ngay nhé. PhoneShop cam kết xử lý trong 24h.',
  'Cảm ơn bạn đã phản hồi thẳng thắn. Shop đã ghi nhận và chuyển bộ phận liên quan xử lý. Bạn để lại SĐT để nhân viên gọi lại hỗ trợ trực tiếp nhé.',
  'Shop xin lỗi vì sự bất tiện này. Với trường hợp của bạn, shop đề xuất mang máy qua cửa hàng để kỹ thuật kiểm tra miễn phí, nếu lỗi phần cứng sẽ đổi mới theo chính sách 30 ngày ạ.',
];

// Customer-to-customer Q&A (reply asks, review owner answers)
const PEER_QUESTIONS = [
  'Bạn cho mình hỏi pin on-screen được khoảng mấy tiếng vậy? Mình đang phân vân con này với con khác.',
  'Máy có bị nóng khi sạc vừa dùng không bạn? Mình hay vừa sạc vừa xem phim.',
  'Bạn mua màu gì vậy? Màu thực tế có giống hình trên web không bạn?',
  'Cho mình hỏi loa ngoài nghe có to rõ không? Mình hay gọi video call.',
];
const PEER_ANSWERS = [
  'Mình dùng hỗn hợp wifi + 4G thì on-screen tầm 7-8 tiếng bạn nhé, thoải mái 1 ngày.',
  'Mình thấy chỉ ấm nhẹ thôi bạn, không nóng rát như con cũ của mình. Vừa sạc vừa xem vẫn ổn.',
  'Mình lấy màu xanh, ngoài đời nhìn sang hơn hình nhiều bạn ơi. Nên ra cửa hàng xem trực tiếp cho chắc.',
  'Loa to rõ bạn nhé, gọi video call trong phòng nghe rất tốt. Ra đường ồn thì hơi đuối chút thôi.',
];

async function ensureReplyTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "review_replies" (
      "id" UUID NOT NULL,
      "review_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "review_replies_review_id_idx" ON "review_replies"("review_id");
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_replies_review_id_fkey') THEN
        ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_replies_user_id_fkey') THEN
        ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);
}

async function main(): Promise<void> {
  console.log('🚀 Seeding product reviews + replies (idempotent)...');
  await ensureReplyTable();
  console.log('  ✓ Table review_replies ensured');

  // ---- Roles ----
  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
  const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
  if (!userRole) throw new Error('Role USER not found — run prisma db seed first');

  // ---- Reviewer pool: real USER accounts ----
  const userLinks = await prisma.userRole.findMany({
    where: { roleId: userRole.id },
    include: { user: true },
  });
  let reviewers = userLinks
    .map((l) => l.user)
    .filter((u) => u.status === UserStatus.ACTIVE);

  if (reviewers.length < 5) {
    console.log(`  Only ${reviewers.length} USER accounts — creating extra Vietnamese customers...`);
    const passwordHash = await bcrypt.hash('Customer@123456', 10);
    for (const c of EXTRA_CUSTOMERS) {
      const user = await prisma.user.upsert({
        where: { email: c.email },
        update: { firstName: c.firstName, lastName: c.lastName, status: UserStatus.ACTIVE, emailVerified: true },
        create: {
          email: c.email, passwordHash,
          firstName: c.firstName, lastName: c.lastName, phone: c.phone,
          status: UserStatus.ACTIVE, emailVerified: true,
        },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
        update: {},
        create: { userId: user.id, roleId: userRole.id },
      });
    }
    const refreshed = await prisma.userRole.findMany({
      where: { roleId: userRole.id },
      include: { user: true },
    });
    reviewers = refreshed.map((l) => l.user).filter((u) => u.status === UserStatus.ACTIVE);
  }
  console.log(`  ✓ Reviewer pool: ${reviewers.length} real USER accounts`);

  // ---- Shop replier: real STAFF (fallback ADMIN) ----
  let shopUser: any = null;
  if (staffRole) {
    const staffLink = await prisma.userRole.findFirst({
      where: { roleId: staffRole.id },
      include: { user: true },
      orderBy: { assignedAt: 'asc' },
    });
    shopUser = staffLink?.user ?? null;
  }
  if (!shopUser) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
      const adminLink = await prisma.userRole.findFirst({
        where: { roleId: adminRole.id },
        include: { user: true },
        orderBy: { assignedAt: 'asc' },
      });
      shopUser = adminLink?.user ?? null;
    }
  }
  if (!shopUser) throw new Error('No STAFF/ADMIN account found — run prisma db seed first');
  console.log(`  ✓ Shop replier: ${shopUser.email}`);

  // ---- Products ----
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  console.log(`  ✓ Target products: ${products.length} ACTIVE`);

  const RATING_ROWS: number[][] = [
    [5, 5, 4],
    [5, 4, 5],
    [4, 5, 5],
    [5, 5, 5],
    [5, 4, 3],
    [4, 4, 5],
  ];
  const poolFor = (rating: number, k: number) =>
    rating === 5 ? FIVE_STAR[k % FIVE_STAR.length]
    : rating === 4 ? FOUR_STAR[k % FOUR_STAR.length]
    : THREE_STAR[k % THREE_STAR.length];

  let createdReviews = 0;
  let skippedReviews = 0;
  let createdReplies = 0;
  let skippedReplies = 0;

  const addReply = async (reviewId: string, userId: string, content: string, at: Date) => {
    const exists = await (prisma as any).reviewReply.findFirst({
      where: { reviewId, userId, content },
    });
    if (exists) {
      skippedReplies++;
      return;
    }
    await (prisma as any).reviewReply.create({
      data: { reviewId, userId, content, createdAt: at, updatedAt: at },
    });
    createdReplies++;
  };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const ratings = RATING_ROWS[i % RATING_ROWS.length];
    // 3 distinct reviewers per product, rotated
    const picked = [0, 1, 2].map((j) => reviewers[(i + j * 2) % reviewers.length]);

    for (let j = 0; j < picked.length; j++) {
      const reviewer = picked[j];
      const rating = ratings[j];
      const tpl = poolFor(rating, i + j);
      const reviewDate = daysAgo(2 + ((i * 5 + j * 7) % 26));

      const existing = await prisma.review.findUnique({
        where: { userId_productId: { userId: reviewer.id, productId: product.id } },
      });
      let review: any = existing;
      if (!existing) {
        review = await prisma.review.create({
          data: {
            userId: reviewer.id,
            productId: product.id,
            rating,
            title: tpl.title,
            content: tpl.content,
            status: ReviewStatus.APPROVED,
            isVerified: true,
            createdAt: reviewDate,
            updatedAt: reviewDate,
          },
        });
        createdReviews++;
      } else {
        skippedReviews++;
      }

      // --- Replies ---
      if (j === 0) {
        // Shop thanks the first reviewer
        await addReply(review.id, shopUser.id, SHOP_THANKS[(i + j) % SHOP_THANKS.length], hoursAfter(reviewDate, 30));
      }
      if (rating <= 4) {
        // Shop support reply on critical reviews
        await addReply(review.id, shopUser.id, SHOP_SUPPORT[(i + j) % SHOP_SUPPORT.length], hoursAfter(reviewDate, 20));
      } else if (j === 1) {
        // Peer Q&A thread on a 5-star review: another customer asks, owner answers
        const asker = picked[(j + 1) % picked.length];
        const qDate = hoursAfter(reviewDate, 12);
        const qExists = await (prisma as any).reviewReply.findFirst({
          where: { reviewId: review.id, userId: asker.id },
        });
        if (!qExists) {
          await (prisma as any).reviewReply.create({
            data: {
              reviewId: review.id,
              userId: asker.id,
              content: PEER_QUESTIONS[(i + j) % PEER_QUESTIONS.length],
              createdAt: qDate,
              updatedAt: qDate,
            },
          });
          createdReplies++;
          await addReply(review.id, reviewer.id, PEER_ANSWERS[(i + j) % PEER_ANSWERS.length], hoursAfter(qDate, 5));
        } else {
          skippedReplies += 2;
        }
      }
    }
  }

  console.log('\n✅ Review seed finished:');
  console.log(`  Reviews — created: ${createdReviews}, skipped (already existed): ${skippedReviews}`);
  console.log(`  Replies — created: ${createdReplies}, skipped (already existed): ${skippedReplies}`);
}

main()
  .catch((e) => {
    console.error('❌ Review seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
