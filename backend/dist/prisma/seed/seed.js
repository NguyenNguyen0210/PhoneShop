"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}
const adapter = new adapter_pg_1.PrismaPg({
    connectionString,
});
const prisma = new client_1.PrismaClient({
    adapter,
});
async function findOrCreateUser(data) {
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
async function main() {
    console.log("🌱 Starting full MobileCommerce seed...\n");
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
    const roles = {};
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
    const adminPasswordHash = await bcrypt_1.default.hash("Admin@123456", 12);
    const staffPasswordHash = await bcrypt_1.default.hash("Staff@123456", 12);
    const managerPasswordHash = await bcrypt_1.default.hash("Manager@123456", 12);
    const customerPasswordHash = await bcrypt_1.default.hash("User@123456", 12);
    const admin = await findOrCreateUser({
        email: "admin@mobilecommerce.local",
        passwordHash: adminPasswordHash,
        firstName: "System",
        lastName: "Administrator",
        phone: "0900000001",
        status: client_1.UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
    });
    const staff = await findOrCreateUser({
        email: "staff@mobilecommerce.local",
        passwordHash: staffPasswordHash,
        firstName: "Store",
        lastName: "Staff",
        phone: "0900000002",
        status: client_1.UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
    });
    const manager = await findOrCreateUser({
        email: "manager@mobilecommerce.local",
        passwordHash: managerPasswordHash,
        firstName: "Store",
        lastName: "Manager",
        phone: "0900000004",
        status: client_1.UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
    });
    const customer = await findOrCreateUser({
        email: "customer@mobilecommerce.local",
        passwordHash: customerPasswordHash,
        firstName: "Nguyen",
        lastName: "Customer",
        phone: "0900000003",
        status: client_1.UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
    });
    console.log("✅ Users");
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
                type: client_1.AddressType.HOME,
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
    const brands = {};
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
    const categories = {};
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
    const productsData = [
        {
            brand: "apple",
            category: "dien-thoai",
            name: "iPhone 15 Pro",
            slug: "iphone-15-pro",
            description: "Apple iPhone 15 Pro",
            shortDescription: "Premium Apple smartphone",
        },
        {
            brand: "apple",
            category: "dien-thoai",
            name: "iPhone 15",
            slug: "iphone-15",
            description: "Apple iPhone 15",
            shortDescription: "Powerful everyday smartphone",
        },
        {
            brand: "samsung",
            category: "dien-thoai",
            name: "Galaxy S24 Ultra",
            slug: "galaxy-s24-ultra",
            description: "Samsung Galaxy S24 Ultra",
            shortDescription: "Samsung flagship smartphone",
        },
        {
            brand: "samsung",
            category: "dien-thoai",
            name: "Galaxy A55",
            slug: "galaxy-a55",
            description: "Samsung Galaxy A55",
            shortDescription: "Mid-range Samsung smartphone",
        },
        {
            brand: "xiaomi",
            category: "dien-thoai",
            name: "Xiaomi 14",
            slug: "xiaomi-14",
            description: "Xiaomi 14 smartphone",
            shortDescription: "High-performance Xiaomi smartphone",
        },
        {
            brand: "oppo",
            category: "dien-thoai",
            name: "OPPO Reno 11",
            slug: "oppo-reno-11",
            description: "OPPO Reno 11 smartphone",
            shortDescription: "Stylish OPPO smartphone",
        },
        {
            brand: "google",
            category: "dien-thoai",
            name: "Google Pixel 8",
            slug: "google-pixel-8",
            description: "Google Pixel 8",
            shortDescription: "Google AI smartphone",
        },
    ];
    const products = {};
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
                condition: client_1.ProductCondition.NEW,
                status: client_1.ProductStatus.ACTIVE,
                warrantyMonths: 12,
            },
            create: {
                brandId: brands[item.brand].id,
                categoryId: categories[item.category].id,
                name: item.name,
                slug: item.slug,
                description: item.description,
                shortDescription: item.shortDescription,
                condition: client_1.ProductCondition.NEW,
                status: client_1.ProductStatus.ACTIVE,
                warrantyMonths: 12,
            },
        });
    }
    console.log("✅ Products");
    const variantData = [
        {
            product: "iphone-15-pro",
            sku: "IP15P-256-BLK",
            name: "iPhone 15 Pro 256GB Black",
            color: "Black",
            storage: "256GB",
            ram: "8GB",
            price: 27990000,
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
    const variants = {};
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
                    costPrice: item.costPrice,
                    isActive: true,
                },
            });
    }
    console.log("✅ Product variants");
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
    const imeiVariant = variants["IP15P-256-BLK"];
    for (let i = 1; i <= 10; i++) {
        const imei = `350000000000${String(i).padStart(2, "0")}`;
        const serialNumber = `SN-IP15P-${String(i).padStart(4, "0")}`;
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
                    status: device.status === client_1.ImeiStatus.SOLD
                        ? client_1.ImeiStatus.SOLD
                        : client_1.ImeiStatus.AVAILABLE,
                    purchasePrice: 24000000,
                },
            });
        }
        else {
            await prisma.imeiDevice.create({
                data: {
                    variantId: imeiVariant.id,
                    imei,
                    serialNumber,
                    status: client_1.ImeiStatus.AVAILABLE,
                    purchasePrice: 24000000,
                },
            });
        }
    }
    console.log("✅ IMEI devices");
    const cart = await prisma.cart.upsert({
        where: {
            userId: customer.id,
        },
        update: {
            status: client_1.CartStatus.ACTIVE,
        },
        create: {
            userId: customer.id,
            status: client_1.CartStatus.ACTIVE,
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
                status: client_1.OrderStatus.COMPLETED,
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
    }
    else {
        order = await prisma.order.update({
            where: {
                id: order.id,
            },
            data: {
                userId: customer.id,
                addressId: address.id,
                status: client_1.OrderStatus.COMPLETED,
                subtotal: 27990000,
                discountAmount: 0,
                shippingFee: 0,
                taxAmount: 0,
                totalAmount: 27990000,
            },
        });
    }
    console.log("✅ Order");
    let orderItem = await prisma.orderItem.findFirst({
        where: {
            orderId: order.id,
        },
    });
    let imeiDevice = await prisma.imeiDevice.findFirst({
        where: {
            variantId: imeiVariant.id,
            status: client_1.ImeiStatus.AVAILABLE,
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
                status: client_1.ImeiStatus.SOLD,
                soldAt: new Date(),
            },
        });
    }
    console.log("✅ Order items");
    let payment = await prisma.payment.findFirst({
        where: {
            orderId: order.id,
        },
    });
    if (!payment) {
        payment = await prisma.payment.create({
            data: {
                orderId: order.id,
                method: client_1.PaymentMethod.COD,
                status: client_1.PaymentStatus.PAID,
                amount: 27990000,
                provider: "COD",
                paidAt: new Date(),
            },
        });
    }
    else {
        payment = await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                method: client_1.PaymentMethod.COD,
                status: client_1.PaymentStatus.PAID,
                amount: 27990000,
                provider: "COD",
                paidAt: new Date(),
            },
        });
    }
    console.log("✅ Payment");
    await prisma.paymentTransaction.upsert({
        where: {
            transactionCode: "TX-SEED-0001",
        },
        update: {
            paymentId: payment.id,
            type: client_1.TransactionType.PAYMENT,
            status: client_1.TransactionStatus.SUCCESS,
            amount: 27990000,
            providerReference: "COD-SEED-0001",
            responseData: {
                source: "seed",
            },
        },
        create: {
            paymentId: payment.id,
            transactionCode: "TX-SEED-0001",
            type: client_1.TransactionType.PAYMENT,
            status: client_1.TransactionStatus.SUCCESS,
            amount: 27990000,
            providerReference: "COD-SEED-0001",
            responseData: {
                source: "seed",
            },
        },
    });
    console.log("✅ Payment transaction");
    const voucher = await prisma.voucher.upsert({
        where: {
            code: "WELCOME10",
        },
        update: {
            name: "Welcome 10%",
            description: "Welcome discount voucher",
            type: client_1.VoucherType.PERCENTAGE,
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
            type: client_1.VoucherType.PERCENTAGE,
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
    const existingVoucherUsage = await prisma.voucherUsage.findFirst({
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
            status: client_1.ReviewStatus.APPROVED,
            isVerified: true,
        },
        create: {
            userId: customer.id,
            productId: products["iphone-15-pro"].id,
            rating: 5,
            title: "Sản phẩm rất tốt",
            content: "Điện thoại đẹp, hiệu năng tốt.",
            status: client_1.ReviewStatus.APPROVED,
            isVerified: true,
        },
    });
    console.log("✅ Reviews");
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
    const warrantyCode = `WAR-SEED-${orderItem.id.toUpperCase()}`;
    const warrantyStartDate = new Date();
    const warrantyEndDate = new Date(warrantyStartDate);
    warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);
    let warranty = await prisma.warranty.findUnique({
        where: {
            orderItemId: orderItem.id,
        },
    });
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
                status: client_1.WarrantyStatus.ACTIVE,
                notes: "Seed warranty",
            },
        });
    }
    else {
        await prisma.warranty.create({
            data: {
                userId: customer.id,
                productVariantId: imeiVariant.id,
                orderItemId: orderItem.id,
                imeiDeviceId: orderItem.imeiDeviceId,
                warrantyCode,
                startDate: warrantyStartDate,
                endDate: warrantyEndDate,
                status: client_1.WarrantyStatus.ACTIVE,
                notes: "Seed warranty",
            },
        });
    }
    console.log("✅ Warranty");
    const notificationData = [
        {
            type: client_1.NotificationType.ORDER,
            channel: client_1.NotificationChannel.IN_APP,
            title: "Đơn hàng đã hoàn thành",
            message: `Đơn hàng ${order.orderNumber} đã được giao thành công.`,
            data: {
                orderId: order.id,
            },
        },
        {
            type: client_1.NotificationType.PROMOTION,
            channel: client_1.NotificationChannel.IN_APP,
            title: "Voucher mới",
            message: "Bạn có thể sử dụng voucher WELCOME10.",
            data: {
                voucherCode: "WELCOME10",
            },
        },
    ];
    for (const item of notificationData) {
        const existingNotification = await prisma.notification.findFirst({
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
    const existingSeedAudit = await prisma.auditLog.findFirst({
        where: {
            entity: "seed",
            entityId: "initial-data",
        },
    });
    if (!existingSeedAudit) {
        await prisma.auditLog.create({
            data: {
                userId: admin.id,
                action: client_1.AuditAction.CREATE,
                entity: "seed",
                entityId: "initial-data",
                newData: {
                    source: "prisma-seed",
                    description: "Initial MobileCommerce seed",
                },
                ipAddress: "127.0.0.1",
                userAgent: "Prisma Seed",
            },
        });
    }
    const existingCustomerAudit = await prisma.auditLog.findFirst({
        where: {
            entity: "users",
            entityId: customer.id,
        },
    });
    if (!existingCustomerAudit) {
        await prisma.auditLog.create({
            data: {
                userId: admin.id,
                action: client_1.AuditAction.CREATE,
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
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
    console.log("✅ Idempotency record");
    console.log("\n============================================");
    console.log("🎉 FULL DATABASE SEED COMPLETED!");
    console.log("============================================");
    console.log("\n🔐 LOGIN ACCOUNTS");
    console.log("--------------------------------------------");
    console.log("ADMIN   : admin@mobilecommerce.local / Admin@123456");
    console.log("MANAGER : manager@mobilecommerce.local / Manager@123456");
    console.log("STAFF   : staff@mobilecommerce.local / Staff@123456");
    console.log("USER    : customer@mobilecommerce.local / User@123456");
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
main()
    .catch((error) => {
    console.error("\n❌ SEED FAILED");
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map