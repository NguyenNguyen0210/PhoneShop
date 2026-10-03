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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
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
  ],
})
export class AppModule {}