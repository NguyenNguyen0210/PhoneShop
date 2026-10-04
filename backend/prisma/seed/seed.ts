import "dotenv/config";

import {
  PrismaClient,
  NotificationType,
  NotificationChannel,
  AuditAction,
  UserStatus,
  AddressType,
  ProductStatus,
  ProductCondition,
  ImeiStatus,
  CartStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  TransactionStatus,
  VoucherType,
  ReviewStatus,
  WarrantyStatus,
} from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

// ============================================================
// PRISMA
// Prisma 7 + PostgreSQL adapter
// ============================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================
// TYPES
// ============================================================

type UserSeed = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
};

type ProductSeed = {
  brand: string;
  category: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  specs?: Record<string, any>;
};

type VariantSeed = {
  product: string;
  sku: string;
  name: string;
  color: string;
  storage: string;
  ram: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
};

// ============================================================
// HELPERS
// ============================================================

async function findOrCreateUser(data: UserSeed) {
  let user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });
  }

  if (user) {
    return prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        status: data.status,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
      },
    });
  }

  return prisma.user.create({
    data,
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Starting full MobileCommerce seed...\n");

  // ============================================================
  // 1. ROLES
  // ============================================================

  const roleData = [
    {
      name: "USER",
      description: "Normal customer/user",
    },
    {
      name: "ADMIN",
      description: "System administrator",
    },
    {
      name: "STAFF",
      description: "Store staff",
    },
    {
      name: "MANAGER",
      description: "Store manager",
    },
  ];

  const roles: Record<string, any> = {};

  for (const item of roleData) {
    roles[item.name] = await prisma.role.upsert({
      where: {
        name: item.name,
      },
      update: {
        description: item.description,
      },
      create: item,
    });
  }

  const userRole = roles["USER"];
  const adminRole = roles["ADMIN"];
  const staffRole = roles["STAFF"];
  const managerRole = roles["MANAGER"];

  console.log("✅ Roles");

  // ============================================================
  // 2. USERS
  // ============================================================

  const adminPasswordHash = await bcrypt.hash(
    "Admin@123456",
    12,
  );

  const staffPasswordHash = await bcrypt.hash(
    "Staff@123456",
    12,
  );

  const managerPasswordHash = await bcrypt.hash(
    "Manager@123456",
    12,
  );

  const customerPasswordHash = await bcrypt.hash(
    "User@123456",
    12,
  );

  const admin = await findOrCreateUser({
    email: "admin@mobilecommerce.local",
    passwordHash: adminPasswordHash,
    firstName: "System",
    lastName: "Administrator",
    phone: "0900000001",
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
  });

  const staff = await findOrCreateUser({
    email: "staff@mobilecommerce.local",
    passwordHash: staffPasswordHash,
    firstName: "Store",
    lastName: "Staff",
    phone: "0900000002",
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
  });

  const manager = await findOrCreateUser({
    email: "manager@mobilecommerce.local",
    passwordHash: managerPasswordHash,
    firstName: "Store",
    lastName: "Manager",
    phone: "0900000004",
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
  });

  const customer = await findOrCreateUser({
    email: "customer@mobilecommerce.local",
    passwordHash: customerPasswordHash,
    firstName: "Nguyen",
    lastName: "Customer",
    phone: "0900000003",
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
  });

  console.log("✅ Users");

  // ============================================================
  // 3. USER ROLES
  // ============================================================

  const userRoleAssignments = [
    {
      userId: admin.id,
      roleId: adminRole.id,
    },
    {
      userId: staff.id,
      roleId: staffRole.id,
    },
    {
      userId: manager.id,
      roleId: managerRole.id,
    },
    {
      userId: customer.id,
      roleId: userRole.id,
    },
  ];

  for (const item of userRoleAssignments) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: item.userId,
          roleId: item.roleId,
        },
      },
      update: {},
      create: item,
    });
  }

  console.log("✅ User roles");

  // ============================================================
  // 4. ADDRESS
  // ============================================================

  let address = await prisma.address.findFirst({
    where: {
      userId: customer.id,
      isDefault: true,
    },
  });

  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        type: AddressType.HOME,
        recipientName: "Nguyen Customer",
        phone: "0900000003",
        addressLine1: "123 Nguyen Hue",
        ward: "Ben Nghe",
        district: "District 1",
        city: "Ho Chi Minh City",
        province: "Ho Chi Minh",
        postalCode: "700000",
        country: "Vietnam",
        isDefault: true,
      },
    });
  }

  console.log("✅ Addresses");

  // ============================================================
  // 5. BRANDS
  // ============================================================

  const brandData = [
    {
      name: "Apple",
      slug: "apple",
      description: "Apple smartphones and devices",
    },
    {
      name: "Samsung",
      slug: "samsung",
      description: "Samsung smartphones and devices",
    },
    {
      name: "Xiaomi",
      slug: "xiaomi",
      description: "Xiaomi smartphones and devices",
    },
    {
      name: "OPPO",
      slug: "oppo",
      description: "OPPO smartphones and devices",
    },
    {
      name: "Google",
      slug: "google",
      description: "Google Pixel devices",
    },
  ];

  const brands: Record<string, any> = {};

  for (const item of brandData) {
    brands[item.slug] = await prisma.brand.upsert({
      where: {
        slug: item.slug,
      },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
      },
      create: item,
    });
  }

  console.log("✅ Brands");

  // ============================================================
  // 6. CATEGORIES
  // ============================================================

  const categoryData = [
    {
      name: "Điện thoại",
      slug: "dien-thoai",
      description: "Smartphones and mobile phones",
    },
    {
      name: "Máy tính bảng",
      slug: "may-tinh-bang",
      description: "Tablets and iPads",
    },
    {
      name: "Phụ kiện",
      slug: "phu-kien",
      description: "Mobile accessories",
    },
  ];

  const categories: Record<string, any> = {};

  for (const item of categoryData) {
    categories[item.slug] = await prisma.category.upsert({
      where: {
        slug: item.slug,
      },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
      },
      create: item,
    });
  }

  console.log("✅ Categories");

  // ============================================================
  // 7. PRODUCTS
  // ============================================================

  const productsData: ProductSeed[] = [
    {
      brand: "apple",
      category: "dien-thoai",
      name: "iPhone 15 Pro",
      slug: "iphone-15-pro",
      description: "Apple iPhone 15 Pro",
      shortDescription: "Premium Apple smartphone",
      specs: {
        screenSize: 6.1,
        screenResolution: "FHD+",
        screenTechnology: "Super Retina XDR OLED",
        screenRefreshRate: 120,
        chipset: "Apple A17 Pro",
        os: "iOS",
        has5G: true,
        batteryCapacity: 3274,
        mainCameraMp: 48,
        rearCamera: "Chính 48 MP & Phụ 12 MP, 12 MP",
        frontCamera: "12 MP",
      },
    },
    {
      brand: "apple",
      category: "dien-thoai",
      name: "iPhone 15",
      slug: "iphone-15",
      description: "Apple iPhone 15",
      shortDescription: "Powerful everyday smartphone",
      specs: {
        screenSize: 6.1,
        screenResolution: "FHD+",
        screenTechnology: "Super Retina XDR OLED",
        screenRefreshRate: 60,
        chipset: "Apple A16 Bionic",
        os: "iOS",
        has5G: true,
        batteryCapacity: 3349,
        mainCameraMp: 48,
        rearCamera: "Chính 48 MP & Phụ 12 MP",
        frontCamera: "12 MP",
      },
    },
    {
      brand: "samsung",
      category: "dien-thoai",
      name: "Galaxy S24 Ultra",
      slug: "galaxy-s24-ultra",
      description: "Samsung Galaxy S24 Ultra",
      shortDescription: "Samsung flagship smartphone",
      specs: {
        screenSize: 6.8,
        screenResolution: "2K+",
        screenTechnology: "Dynamic AMOLED 2X",
        screenRefreshRate: 120,
        chipset: "Snapdragon 8 Gen 3 for Galaxy",
        os: "Android",
        has5G: true,
        batteryCapacity: 5000,
        mainCameraMp: 200,
        rearCamera: "Chính 200 MP & Phụ 50 MP, 12 MP, 10 MP",
        frontCamera: "12 MP",
      },
    },
    {
      brand: "samsung",
      category: "dien-thoai",
      name: "Galaxy A55",
      slug: "galaxy-a55",
      description: "Samsung Galaxy A55",
      shortDescription: "Mid-range Samsung smartphone",
      specs: {
        screenSize: 6.6,
        screenResolution: "FHD+",
        screenTechnology: "Super AMOLED",
        screenRefreshRate: 120,
        chipset: "Exynos 1480",
        os: "Android",
        has5G: true,
        batteryCapacity: 5000,
        mainCameraMp: 50,
        rearCamera: "Chính 50 MP & Phụ 12 MP, 5 MP",
        frontCamera: "32 MP",
      },
    },
    {
      brand: "xiaomi",
      category: "dien-thoai",
      name: "Xiaomi 14",
      slug: "xiaomi-14",
      description: "Xiaomi 14 smartphone",
      shortDescription: "High-performance Xiaomi smartphone",
      specs: {
        screenSize: 6.36,
        screenResolution: "1.5K",
        screenTechnology: "LTPO OLED",
        screenRefreshRate: 120,
        chipset: "Snapdragon 8 Gen 3",
        os: "Android",
        has5G: true,
        batteryCapacity: 4610,
        mainCameraMp: 50,
        rearCamera: "Leica 50 MP & 50 MP, 50 MP",
        frontCamera: "32 MP",
      },
    },
    {
      brand: "oppo",
      category: "dien-thoai",
      name: "OPPO Reno 11",
      slug: "oppo-reno-11",
      description: "OPPO Reno 11 smartphone",
      shortDescription: "Stylish OPPO smartphone",
      specs: {
        screenSize: 6.7,
        screenResolution: "FHD+",
        screenTechnology: "AMOLED",
        screenRefreshRate: 120,
        chipset: "MediaTek Dimensity 7050",
        os: "Android",
        has5G: true,
        batteryCapacity: 5000,
        mainCameraMp: 50,
        rearCamera: "Chính 50 MP & Phụ 32 MP, 8 MP",
        frontCamera: "32 MP",
      },
    },
    {
      brand: "google",
      category: "dien-thoai",
      name: "Google Pixel 8",
      slug: "google-pixel-8",
      description: "Google Pixel 8",
      shortDescription: "Google AI smartphone",
      specs: {
        screenSize: 6.2,
        screenResolution: "FHD+",
        screenTechnology: "Actua OLED",
        screenRefreshRate: 120,
        chipset: "Google Tensor G3",
        os: "Android",
        has5G: true,
        batteryCapacity: 4575,
        mainCameraMp: 50,
        rearCamera: "Chính 50 MP & Phụ 12 MP",
        frontCamera: "10.5 MP",
      },
    },
  ];

  const products: Record<string, any> = {};

  for (const item of productsData) {
    products[item.slug] = await prisma.product.upsert({
      where: {
        slug: item.slug,
      },
      update: {
        brandId: brands[item.brand].id,
        categoryId: categories[item.category].id,
        name: item.name,
        description: item.description,
        shortDescription: item.shortDescription,
        specs: item.specs ?? undefined,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        warrantyMonths: 12,
      },
      create: {
        brandId: brands[item.brand].id,
        categoryId: categories[item.category].id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        specs: item.specs ?? undefined,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        warrantyMonths: 12,
      },
    });
  }

  console.log("✅ Products");

  // ============================================================
  // 8. PRODUCT VARIANTS
  // ============================================================

  const variantData: VariantSeed[] = [
    {
      product: "iphone-15-pro",
      sku: "IP15P-256-BLK",
      name: "iPhone 15 Pro 256GB Black",
      color: "Black",
      storage: "256GB",
      ram: "8GB",
      price: 27990000,
      compareAtPrice: 29990000,
      costPrice: 24000000,
    },
    {
      product: "iphone-15",
      sku: "IP15-128-BLU",
      name: "iPhone 15 128GB Blue",
      color: "Blue",
      storage: "128GB",
      ram: "6GB",
      price: 21990000,
      costPrice: 18500000,
    },
    {
      product: "galaxy-s24-ultra",
      sku: "S24U-256-BLK",
      name: "Galaxy S24 Ultra 256GB Black",
      color: "Black",
      storage: "256GB",
      ram: "12GB",
      price: 29990000,
      compareAtPrice: 33990000,
      costPrice: 25500000,
    },
    {
      product: "galaxy-a55",
      sku: "A55-256-BLU",
      name: "Samsung Galaxy A55 256GB Blue",
      color: "Blue",
      storage: "256GB",
      ram: "8GB",
      price: 9990000,
      costPrice: 8200000,
    },
    {
      product: "xiaomi-14",
      sku: "MI14-256-BLK",
      name: "Xiaomi 14 256GB Black",
      color: "Black",
      storage: "256GB",
      ram: "12GB",
      price: 19990000,
      compareAtPrice: 22990000,
      costPrice: 16500000,
    },
    {
      product: "oppo-reno-11",
      sku: "R11-256-GRN",
      name: "OPPO Reno 11 256GB Green",
      color: "Green",
      storage: "256GB",
      ram: "8GB",
      price: 10990000,
      costPrice: 9000000,
    },
    {
      product: "google-pixel-8",
      sku: "PX8-128-BLK",
      name: "Google Pixel 8 128GB Black",
      color: "Black",
      storage: "128GB",
      ram: "8GB",
      price: 16990000,
      costPrice: 14000000,
    },
  ];

  const variants: Record<string, any> = {};

  for (const item of variantData) {
    variants[item.sku] =
      await prisma.productVariant.upsert({
        where: {
          sku: item.sku,
        },
        update: {
          productId: products[item.product].id,
          name: item.name,
          color: item.color,
          storage: item.storage,
          ram: item.ram,
          price: item.price,
          compareAtPrice: item.compareAtPrice ?? null,
          costPrice: item.costPrice,
          isActive: true,
        },
        create: {
          productId: products[item.product].id,
          sku: item.sku,
          name: item.name,
          color: item.color,
          storage: item.storage,
          ram: item.ram,
          price: item.price,
          compareAtPrice: item.compareAtPrice ?? null,
          costPrice: item.costPrice,
          isActive: true,
        },
      });
  }

  console.log("✅ Product variants");

  // ============================================================
  // 9. INVENTORY
  // ============================================================

  for (const variant of Object.values(variants)) {
    await prisma.inventory.upsert({
      where: {
        variantId: variant.id,
      },
      update: {
        quantity: 20,
        reservedQty: 0,
        availableQty: 20,
        reorderLevel: 5,
      },
      create: {
        variantId: variant.id,
        quantity: 20,
        reservedQty: 0,
        availableQty: 20,
        reorderLevel: 5,
      },
    });
  }

  console.log("✅ Inventory");

  // ============================================================
  // 10. IMEI DEVICES
  // ============================================================

  const imeiVariant = variants["IP15P-256-BLK"];

  for (let i = 1; i <= 10; i++) {
    const imei =
      `350000000000${String(i).padStart(2, "0")}`;

    const serialNumber =
      `SN-IP15P-${String(i).padStart(4, "0")}`;

    let device = await prisma.imeiDevice.findUnique({
      where: {
        imei,
      },
    });

    if (!device) {
      device = await prisma.imeiDevice.findUnique({
        where: {
          serialNumber,
        },
      });
    }

    if (device) {
      await prisma.imeiDevice.update({
        where: {
          id: device.id,
        },
        data: {
          variantId: imeiVariant.id,
          imei,
          serialNumber,
          status:
            device.status === ImeiStatus.SOLD
              ? ImeiStatus.SOLD
              : ImeiStatus.AVAILABLE,
          purchasePrice: 24000000,
        },
      });
    } else {
      await prisma.imeiDevice.create({
        data: {
          variantId: imeiVariant.id,
          imei,
          serialNumber,
          status: ImeiStatus.AVAILABLE,
          purchasePrice: 24000000,
        },
      });
    }
  }

  console.log("✅ IMEI devices");

  // ============================================================
  // 11. CART
  // ============================================================

  const cart = await prisma.cart.upsert({
    where: {
      userId: customer.id,
    },
    update: {
      status: CartStatus.ACTIVE,
    },
    create: {
      userId: customer.id,
      status: CartStatus.ACTIVE,
    },
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId: imeiVariant.id,
      },
    },
    update: {
      quantity: 1,
      unitPrice: 27990000,
    },
    create: {
      cartId: cart.id,
      variantId: imeiVariant.id,
      quantity: 1,
      unitPrice: 27990000,
    },
  });

  console.log("✅ Cart");

  // ============================================================
  // 12. ORDER
  // ============================================================

  let order = await prisma.order.findUnique({
    where: {
      orderNumber: "MC-20260821-0001",
    },
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        orderNumber: "MC-20260821-0001",
        userId: customer.id,
        addressId: address.id,
        status: OrderStatus.COMPLETED,
        subtotal: 27990000,
        discountAmount: 0,
        shippingFee: 0,
        taxAmount: 0,
        totalAmount: 27990000,
        customerNote: "Seed order",
        confirmedAt: new Date(),
        shippedAt: new Date(),
        deliveredAt: new Date(),
        completedAt: new Date(),
      },
    });
  } else {
    order = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        userId: customer.id,
        addressId: address.id,
        status: OrderStatus.COMPLETED,
        subtotal: 27990000,
        discountAmount: 0,
        shippingFee: 0,
        taxAmount: 0,
        totalAmount: 27990000,
      },
    });
  }

  console.log("✅ Order");

  // ============================================================
  // 13. ORDER ITEM
  // ============================================================

  let orderItem = await prisma.orderItem.findFirst({
    where: {
      orderId: order.id,
    },
  });

  let imeiDevice = await prisma.imeiDevice.findFirst({
    where: {
      variantId: imeiVariant.id,
      status: ImeiStatus.AVAILABLE,
    },
  });

  if (!orderItem) {
    if (!imeiDevice) {
      imeiDevice = await prisma.imeiDevice.findFirst({
        where: {
          variantId: imeiVariant.id,
        },
      });
    }

    orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        variantId: imeiVariant.id,
        imeiDeviceId: imeiDevice?.id ?? null,
        productName: "iPhone 15 Pro 256GB Black",
        sku: "IP15P-256-BLK",
        quantity: 1,
        unitPrice: 27990000,
        discountAmount: 0,
        totalPrice: 27990000,
      },
    });
  }

  if (imeiDevice) {
    await prisma.imeiDevice.update({
      where: {
        id: imeiDevice.id,
      },
      data: {
        status: ImeiStatus.SOLD,
        soldAt: new Date(),
      },
    });
  }

  console.log("✅ Order items");

  // ============================================================
  // 14. PAYMENT
  // ============================================================

  let payment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
    },
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: PaymentMethod.COD,
        status: PaymentStatus.PAID,
        amount: 27990000,
        provider: "COD",
        paidAt: new Date(),
      },
    });
  } else {
    payment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        method: PaymentMethod.COD,
        status: PaymentStatus.PAID,
        amount: 27990000,
        provider: "COD",
        paidAt: new Date(),
      },
    });
  }

  console.log("✅ Payment");

  // ============================================================
  // 15. PAYMENT TRANSACTION
  // ============================================================

  await prisma.paymentTransaction.upsert({
    where: {
      transactionCode: "TX-SEED-0001",
    },
    update: {
      paymentId: payment.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.SUCCESS,
      amount: 27990000,
      providerReference: "COD-SEED-0001",
      responseData: {
        source: "seed",
      },
    },
    create: {
      paymentId: payment.id,
      transactionCode: "TX-SEED-0001",
      type: TransactionType.PAYMENT,
      status: TransactionStatus.SUCCESS,
      amount: 27990000,
      providerReference: "COD-SEED-0001",
      responseData: {
        source: "seed",
      },
    },
  });

  console.log("✅ Payment transaction");

  // ============================================================
  // 16. VOUCHER
  // ============================================================

  const voucher = await prisma.voucher.upsert({
    where: {
      code: "WELCOME10",
    },
    update: {
      name: "Welcome 10%",
      description: "Welcome discount voucher",
      type: VoucherType.PERCENTAGE,
      value: 10,
      minOrderValue: 1000000,
      maxDiscountAmount: 1000000,
      usageLimit: 1000,
      perUserLimit: 1,
      startAt: new Date("2026-01-01"),
      endAt: new Date("2027-01-01"),
      isActive: true,
    },
    create: {
      code: "WELCOME10",
      name: "Welcome 10%",
      description: "Welcome discount voucher",
      type: VoucherType.PERCENTAGE,
      value: 10,
      minOrderValue: 1000000,
      maxDiscountAmount: 1000000,
      usageLimit: 1000,
      perUserLimit: 1,
      startAt: new Date("2026-01-01"),
      endAt: new Date("2027-01-01"),
      isActive: true,
    },
  });

  console.log("✅ Vouchers");

  // ============================================================
  // 17. VOUCHER USAGE
  // ============================================================

  const existingVoucherUsage =
    await prisma.voucherUsage.findFirst({
      where: {
        voucherId: voucher.id,
        userId: customer.id,
        orderId: order.id,
      },
    });

  if (!existingVoucherUsage) {
    await prisma.voucherUsage.create({
      data: {
        voucherId: voucher.id,
        userId: customer.id,
        orderId: order.id,
        discountAmount: 0,
      },
    });
  }

  console.log("✅ Voucher usage");

  // ============================================================
  // 18. REVIEW
  // ============================================================

  await prisma.review.upsert({
    where: {
      userId_productId: {
        userId: customer.id,
        productId: products["iphone-15-pro"].id,
      },
    },
    update: {
      rating: 5,
      title: "Sản phẩm rất tốt",
      content: "Điện thoại đẹp, hiệu năng tốt.",
      status: ReviewStatus.APPROVED,
      isVerified: true,
    },
    create: {
      userId: customer.id,
      productId: products["iphone-15-pro"].id,
      rating: 5,
      title: "Sản phẩm rất tốt",
      content: "Điện thoại đẹp, hiệu năng tốt.",
      status: ReviewStatus.APPROVED,
      isVerified: true,
    },
  });

  console.log("✅ Reviews");

  // ============================================================
  // 19. WISHLIST
  // ============================================================

  const wishlist = await prisma.wishlist.upsert({
    where: {
      userId: customer.id,
    },
    update: {},
    create: {
      userId: customer.id,
    },
  });

  await prisma.wishlistItem.upsert({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId: products["galaxy-s24-ultra"].id,
      },
    },
    update: {},
    create: {
      wishlistId: wishlist.id,
      productId: products["galaxy-s24-ultra"].id,
    },
  });

  console.log("✅ Wishlist");

  // ============================================================
  // 20. WARRANTY
  // ============================================================

  /*
   * Quan trọng:
   *
   * Warranty có:
   *   - orderItemId UNIQUE
   *   - warrantyCode UNIQUE
   *   - imeiDeviceId UNIQUE
   *
   * Vì vậy không nên chỉ kiểm tra orderItemId rồi create().
   * Có thể database đã có warrantyCode WAR-SEED-0001
   * nhưng thuộc orderItem khác -> P2002.
   *
   * Dùng mã warranty ổn định theo orderItem:
   * WAR-SEED-<ORDER_ITEM_ID>
   *
   * Điều này giúp seed chạy nhiều lần an toàn.
   */

  const warrantyCode =
    `WAR-SEED-${orderItem.id.toUpperCase()}`;

  const warrantyStartDate = new Date();

  const warrantyEndDate = new Date(warrantyStartDate);

  warrantyEndDate.setFullYear(
    warrantyEndDate.getFullYear() + 1,
  );

  let warranty =
    await prisma.warranty.findUnique({
      where: {
        orderItemId: orderItem.id,
      },
    });

  /*
   * Nếu warranty theo orderItem chưa tồn tại,
   * kiểm tra xem mã warranty có tồn tại không.
   */
  if (!warranty) {
    warranty =
      await prisma.warranty.findUnique({
        where: {
          warrantyCode,
        },
      });
  }

  if (warranty) {
    await prisma.warranty.update({
      where: {
        id: warranty.id,
      },
      data: {
        userId: customer.id,
        productVariantId: imeiVariant.id,
        orderItemId: orderItem.id,
        imeiDeviceId: orderItem.imeiDeviceId,
        warrantyCode,
        startDate: warrantyStartDate,
        endDate: warrantyEndDate,
        status: WarrantyStatus.ACTIVE,
        notes: "Seed warranty",
      },
    });
  } else {
    /*
     * create mới chỉ xảy ra khi cả orderItemId
     * và warrantyCode đều chưa tồn tại.
     */
    await prisma.warranty.create({
      data: {
        userId: customer.id,
        productVariantId: imeiVariant.id,
        orderItemId: orderItem.id,
        imeiDeviceId: orderItem.imeiDeviceId,
        warrantyCode,
        startDate: warrantyStartDate,
        endDate: warrantyEndDate,
        status: WarrantyStatus.ACTIVE,
        notes: "Seed warranty",
      },
    });
  }

  console.log("✅ Warranty");

  // ============================================================
  // 21. NOTIFICATIONS
  // ============================================================

  const notificationData: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    data: Record<string, string>;
  }> = [
      {
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
        title: "Đơn hàng đã hoàn thành",
        message:
          `Đơn hàng ${order.orderNumber} đã được giao thành công.`,
        data: {
          orderId: order.id,
        },
      },
      {
        type: NotificationType.PROMOTION,
        channel: NotificationChannel.IN_APP,
        title: "Voucher mới",
        message:
          "Bạn có thể sử dụng voucher WELCOME10.",
        data: {
          voucherCode: "WELCOME10",
        },
      },
    ];

  for (const item of notificationData) {
    const existingNotification =
      await prisma.notification.findFirst({
        where: {
          userId: customer.id,
          type: item.type,
          title: item.title,
        },
      });

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId: customer.id,
          type: item.type,
          channel: item.channel,
          title: item.title,
          message: item.message,
          data: item.data,
          isRead: false,
        },
      });
    }
  }

  console.log("✅ Notifications");

  // ============================================================
  // 22. AUDIT LOGS
  // ============================================================

  const existingSeedAudit =
    await prisma.auditLog.findFirst({
      where: {
        entity: "seed",
        entityId: "initial-data",
      },
    });

  if (!existingSeedAudit) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.CREATE,
        entity: "seed",
        entityId: "initial-data",
        newData: {
          source: "prisma-seed",
          description:
            "Initial MobileCommerce seed",
        },
        ipAddress: "127.0.0.1",
        userAgent: "Prisma Seed",
      },
    });
  }

  const existingCustomerAudit =
    await prisma.auditLog.findFirst({
      where: {
        entity: "users",
        entityId: customer.id,
      },
    });

  if (!existingCustomerAudit) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: AuditAction.CREATE,
        entity: "users",
        entityId: customer.id,
        newData: {
          email: customer.email,
          role: "USER",
        },
        ipAddress: "127.0.0.1",
        userAgent: "Prisma Seed",
      },
    });
  }

  console.log("✅ Audit logs");

  // ============================================================
  // 23. IDEMPOTENCY
  // ============================================================

  await prisma.idempotencyRecord.upsert({
    where: {
      key: "seed-idempotency-key",
    },
    update: {
      userId: customer.id,
      endpoint: "/api/orders",
      requestHash: "seed-request-hash",
      responseStatus: 200,
      responseBody: {
        orderNumber: order.orderNumber,
      },
      expiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ),
    },
    create: {
      key: "seed-idempotency-key",
      userId: customer.id,
      endpoint: "/api/orders",
      requestHash: "seed-request-hash",
      responseStatus: 200,
      responseBody: {
        orderNumber: order.orderNumber,
      },
      expiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ),
    },
  });

  console.log("✅ Idempotency record");

  // ============================================================
  // 24. SUMMARY
  // ============================================================

  console.log("\n============================================");
  console.log("🎉 FULL DATABASE SEED COMPLETED!");
  console.log("============================================");

  console.log("\n🔐 LOGIN ACCOUNTS");
  console.log("--------------------------------------------");
  console.log(
    "ADMIN   : admin@mobilecommerce.local / Admin@123456",
  );
  console.log(
    "MANAGER : manager@mobilecommerce.local / Manager@123456",
  );
  console.log(
    "STAFF   : staff@mobilecommerce.local / Staff@123456",
  );
  console.log(
    "USER    : customer@mobilecommerce.local / User@123456",
  );
  console.log("--------------------------------------------");

  console.log("\n📦 Seeded:");
  console.log("  ✓ 4 roles");
  console.log("  ✓ 4 users");
  console.log("  ✓ user roles");
  console.log("  ✓ addresses");
  console.log("  ✓ brands");
  console.log("  ✓ categories");
  console.log("  ✓ products");
  console.log("  ✓ product variants");
  console.log("  ✓ inventories");
  console.log("  ✓ IMEI devices");
  console.log("  ✓ cart");
  console.log("  ✓ order");
  console.log("  ✓ order items");
  console.log("  ✓ payments");
  console.log("  ✓ payment transactions");
  console.log("  ✓ vouchers");
  console.log("  ✓ voucher usages");
  console.log("  ✓ reviews");
  console.log("  ✓ wishlist");
  console.log("  ✓ warranty");
  console.log("  ✓ notifications");
  console.log("  ✓ audit logs");
  console.log("  ✓ idempotency record");
  console.log("============================================\n");
}

// ============================================================
// EXECUTE
// ============================================================

main()
  .catch((error) => {
    console.error("\n❌ SEED FAILED");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });