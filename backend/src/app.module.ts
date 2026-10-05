import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Core Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

// Infrastructure (Global Modules - should be loaded first)
import { CachingModule } from './infrastructure/caching/caching.module';
import { RateLimitingModule } from './infrastructure/rate-limiting/rate-limiting.module';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { BackgroundJobsModule } from './infrastructure/background-jobs/background-jobs.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { EmailModule } from './infrastructure/email/email.module';
import { StorageModule } from './infrastructure/storage/storage.module';

// Domain Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ImeiModule } from './modules/imei/imei.module';
import { CartModule } from './modules/cart/cart.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { FlashSalesModule } from './modules/flash-sales/flash-sales.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Load the env file matching NODE_ENV. In production the platform
      // injects real env vars, so skip file loading unless DOTENV_FILE is
      // explicitly set (local prod-like runs).
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
      ignoreEnvFile:
        process.env.NODE_ENV === 'production' && !process.env.DOTENV_FILE,
    }),

    // ----- Infrastructure (Global) -----
    PrismaModule,
    CachingModule,
    RateLimitingModule,
    IdempotencyModule,
    ObservabilityModule,
    BackgroundJobsModule,
    SecurityModule,
    EmailModule,
    StorageModule,

    // ----- Core -----
    HealthModule,

    // ----- Domain -----
    AuthModule,
    UsersModule,
    AddressesModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    ImeiModule,
    CartModule,
    VouchersModule,
    FlashSalesModule,
    OrdersModule,
    InstallmentsModule,
    PaymentsModule,
    ReviewsModule,
    WishlistModule,
    WarrantyModule,
    ReturnsModule,
    NotificationsModule,
    AuditLogModule,
    SuppliersModule,
    ShippingModule,
    ReportsModule,
    TicketsModule,
    SettingsModule,
    ChatbotModule,
  ],
})
export class AppModule {}