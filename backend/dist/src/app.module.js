"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const health_module_1 = require("./health/health.module");
const caching_module_1 = require("./infrastructure/caching/caching.module");
const rate_limiting_module_1 = require("./infrastructure/rate-limiting/rate-limiting.module");
const idempotency_module_1 = require("./infrastructure/idempotency/idempotency.module");
const observability_module_1 = require("./infrastructure/observability/observability.module");
const background_jobs_module_1 = require("./infrastructure/background-jobs/background-jobs.module");
const security_module_1 = require("./infrastructure/security/security.module");
const email_module_1 = require("./infrastructure/email/email.module");
const storage_module_1 = require("./infrastructure/storage/storage.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const addresses_module_1 = require("./modules/addresses/addresses.module");
const brands_module_1 = require("./modules/brands/brands.module");
const categories_module_1 = require("./modules/categories/categories.module");
const products_module_1 = require("./modules/products/products.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const imei_module_1 = require("./modules/imei/imei.module");
const cart_module_1 = require("./modules/cart/cart.module");
const vouchers_module_1 = require("./modules/vouchers/vouchers.module");
const orders_module_1 = require("./modules/orders/orders.module");
const payments_module_1 = require("./modules/payments/payments.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const wishlist_module_1 = require("./modules/wishlist/wishlist.module");
const warranty_module_1 = require("./modules/warranty/warranty.module");
const returns_module_1 = require("./modules/returns/returns.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const audit_log_module_1 = require("./modules/audit-log/audit-log.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const shipping_module_1 = require("./modules/shipping/shipping.module");
const reports_module_1 = require("./modules/reports/reports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                envFilePath: '.env',
            }),
            prisma_module_1.PrismaModule,
            caching_module_1.CachingModule,
            rate_limiting_module_1.RateLimitingModule,
            idempotency_module_1.IdempotencyModule,
            observability_module_1.ObservabilityModule,
            background_jobs_module_1.BackgroundJobsModule,
            security_module_1.SecurityModule,
            email_module_1.EmailModule,
            storage_module_1.StorageModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            addresses_module_1.AddressesModule,
            brands_module_1.BrandsModule,
            categories_module_1.CategoriesModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            imei_module_1.ImeiModule,
            cart_module_1.CartModule,
            vouchers_module_1.VouchersModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.ReviewsModule,
            wishlist_module_1.WishlistModule,
            warranty_module_1.WarrantyModule,
            returns_module_1.ReturnsModule,
            notifications_module_1.NotificationsModule,
            audit_log_module_1.AuditLogModule,
            suppliers_module_1.SuppliersModule,
            shipping_module_1.ShippingModule,
            reports_module_1.ReportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map