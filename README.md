# MobileCommerce

Hệ thống thương mại điện tử chuyên bán thiết bị di động, xây dựng theo kiến trúc **Modular Monolith / Clean Architecture**, sử dụng **React + Node.js + TypeScript + NestJS + Supabase PostgreSQL/Storage**, triển khai trên Web Server chạy 24/7.

> Không tích hợp AI.  
> Supabase được sử dụng cho PostgreSQL và Storage.  
> Redis được sử dụng cho caching khi cần.

---

## 1. Cấu trúc thư mục tổng thể

```text
MobileCommerce/
│
├── README.md
├── .gitignore
├── .env.example
├── .env.example.secrets
├── docker-compose.yml
├── docker-compose.prod.yml
│
├── docs/
│   ├── architecture/
│   │   ├── system-architecture.md
│   │   ├── deployment-architecture.md
│   │   ├── security-architecture.md
│   │   ├── database-architecture.md
│   │   ├── caching-strategy.md
│   │   ├── concurrency-imei.md
│   │   ├── idempotency-strategy.md
│   │   ├── rate-limiting-strategy.md
│   │   ├── health-check-strategy.md
│   │   ├── observability-strategy.md
│   │   └── secrets-management.md
│   │
│   ├── database/
│   │   ├── erd.md
│   │   ├── database-schema.md
│   │   ├── indexes.md
│   │   └── concurrency.md
│   │
│   ├── api/
│   │   ├── authentication.md
│   │   ├── products.md
│   │   ├── cart.md
│   │   ├── orders.md
│   │   ├── payments.md
│   │   ├── inventory.md
│   │   ├── imei.md
│   │   ├── warranty.md
│   │   └── returns.md
│   │
│   └── deployment/
│       ├── server-setup.md
│       ├── docker.md
│       ├── nginx.md
│       ├── ssl.md
│       ├── backup.md
│       ├── monitoring.md
│       └── disaster-recovery.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── middleware/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   ├── decorators/
│   │   │   └── pipes/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── brands/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── vouchers/
│   │   │   ├── reviews/
│   │   │   ├── wishlist/
│   │   │   ├── inventory/
│   │   │   ├── imei/
│   │   │   ├── suppliers/
│   │   │   ├── warranty/
│   │   │   ├── returns/
│   │   │   ├── shipping/
│   │   │   ├── notifications/
│   │   │   └── reports/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   └── prisma.service.ts
│   │   │   ├── caching/
│   │   │   ├── concurrency/
│   │   │   ├── idempotency/
│   │   │   ├── rate-limiting/
│   │   │   ├── observability/
│   │   │   ├── storage/
│   │   │   ├── payments/
│   │   │   ├── email/
│   │   │   ├── notifications/
│   │   │   ├── shipping/
│   │   │   ├── security/
│   │   │   └── background-jobs/
│   │   │
│   │   └── health/
│   │       ├── health.controller.ts
│   │       ├── readiness.controller.ts
│   │       └── liveness.controller.ts
│   │
│   └── test/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── product/
│   │   │   ├── cart/
│   │   │   ├── order/
│   │   │   ├── review/
│   │   │   └── admin/
│   │   │
│   │   ├── layouts/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   └── AuthLayout.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Auth/
│   │   │   ├── Products/
│   │   │   ├── Categories/
│   │   │   ├── Compare/
│   │   │   ├── Wishlist/
│   │   │   ├── Cart/
│   │   │   ├── Checkout/
│   │   │   ├── Orders/
│   │   │   ├── Profile/
│   │   │   ├── Warranty/
│   │   │   ├── Returns/
│   │   │   └── Admin/
│   │   │
│   │   ├── services/
│   │   │   ├── apiClient.ts
│   │   │   ├── authService.ts
│   │   │   ├── productService.ts
│   │   │   ├── cartService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── inventoryService.ts
│   │   │   ├── warrantyService.ts
│   │   │   └── returnService.ts
│   │   │
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── stores/
│   │   ├── routes/
│   │   │   ├── AppRoutes.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── AdminRoute.tsx
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── validators/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── tsconfig.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── backend.Dockerfile
│   │   ├── frontend.Dockerfile
│   │   └── nginx.Dockerfile
│   │
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   │       └── mobile-commerce.conf
│   │
│   ├── ssl/
│   ├── redis/
│   │   └── redis.conf
│   │
│   ├── monitoring/
│   │   ├── health-checks/
│   │   ├── logs/
│   │   ├── otel-collector/
│   │   │   └── otel-config.yaml
│   │   └── dashboards/
│   │       └── mobile-commerce-dashboard.json
│   │
│   └── scripts/
│       ├── deploy.sh
│       ├── backup.sh
│       ├── restore.sh
│       ├── health-check.sh
│       └── cleanup.sh
│
└── .github/
    └── workflows/
        ├── backend-ci.yml
        ├── frontend-ci.yml
        └── deploy.yml
```

---

## 2. Kiến trúc runtime

```text
                         INTERNET
                            │
                            ▼
                       CLOUDFLARE
                            │
                            ▼
                          NGINX
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
              FRONTEND              BACKEND
               React              NestJS
                                       │
                       ┌───────────────┼───────────────┐
                       │               │               │
                       ▼               ▼               ▼
                 Rate Limiting    Idempotency    Observability
                       │               │               │
                       └───────────────┼───────────────┘
                                       │
                       ┌───────────────┼───────────────┐
                       │               │               │
                       ▼               ▼               ▼
                     Redis        IMEI Concurrency   Security
                    Caching
                       │               │
                       └───────┬───────┘
                               │
                               ▼
                        SUPABASE CLOUD
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
                PostgreSQL             Storage
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
        Order     Payment     IMEI
          │                    │
          ▼                    ▼
      Inventory             Warranty
```

---

## 3. Sáu cơ chế bảo vệ và vận hành chính

### 3.1 Idempotency

Dùng cho các request có khả năng bị gửi lại:

```text
POST /orders
POST /payments
POST /payments/callback
POST /returns
```

Luồng:

```text
Request
   │
   ▼
IdempotencyMiddleware
   │
   ├── Key đã tồn tại
   │       └── Trả response cũ
   │
   └── Key mới
           │
           ▼
       Xử lý request
           │
           ▼
      Lưu kết quả
```

### 3.2 IMEI Concurrency

```text
AVAILABLE
    │
    ▼
 RESERVED
    │
    ├── Thanh toán thành công
    │       ▼
    │     SOLD
    │
    └── Hết thời gian giữ
            ▼
         AVAILABLE
```

Mục tiêu:

> Không cho phép hai khách hàng cùng mua một thiết bị/IMEI.

### 3.3 Rate Limiting

Các policy có thể được chia theo endpoint:

```text
LOGIN           → giới hạn nghiêm ngặt
REGISTER        → giới hạn nghiêm ngặt
PASSWORD RESET  → giới hạn nghiêm ngặt
PRODUCT SEARCH  → giới hạn trung bình
ORDER           → giới hạn theo user
PAYMENT         → giới hạn theo user
PUBLIC API      → giới hạn theo IP
```

### 3.4 Health Check

```text
/health/live
    │
    └── Process còn hoạt động?

/health/ready
    │
    ├── API
    ├── Supabase PostgreSQL
    ├── Redis
    └── Storage

/health
    └── Full health information
```

### 3.5 Caching

Ưu tiên cache:

```text
Product
Category
Brand
Product Specification
Public Configuration
```

Không cache trực tiếp các dữ liệu nhạy cảm/thay đổi liên tục:

```text
IMEI
Payment
Order
Cart
User Permission
```

### 3.6 Observability

Theo dõi:

```text
Logs
Metrics
Traces
Health
HTTP latency
HTTP error rate
Database latency
Redis hit/miss
Payment failure
Order failure
IMEI reservation failure
Rate-limit rejection
CPU
Memory
Container health
```

---

## 4. Nguyên tắc bảo mật IMEI

IMEI là dữ liệu quan trọng của hệ thống.

Không để:

```text
Frontend
   ↓
Supabase trực tiếp
   ↓
IMEI
```

Thay vào đó:

```text
Frontend
   │
   ▼
NestJS API
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   ├── Audit
   └── IMEI access control
          │
          ▼
      Supabase
```

IMEI không được ghi vào:

```text
❌ URL
❌ Console log
❌ Application log
❌ Error message
❌ Frontend localStorage
❌ Git
```

---

## 5. Nguyên tắc triển khai

```text
Developer
    │
    ▼
GitHub
    │
    ▼
CI/CD
    │
    ├── Build
    ├── Test
    ├── Security Check
    └── Docker Build
          │
          ▼
     Ubuntu Server
          │
          ▼
       Docker
          │
     ┌────┼────┐
     ▼    ▼    ▼
  Nginx  API  Redis
     │    │
     │    └──────────┐
     │               ▼
     │           Supabase
     │           PostgreSQL
     │               │
     │               ▼
     │             Storage
     │
     ▼
  Frontend
```

---

## 6. Backend Technology

Backend sử dụng **Node.js + TypeScript + NestJS** theo hướng modular và Clean Architecture.

```text
Node.js
  │
  ▼
TypeScript
  │
  ▼
NestJS
  │
  ├── Controllers / Guards / Pipes / Interceptors
  ├── Feature Modules
  ├── Services / Use Cases
  └── Infrastructure Services
          │
          ▼
       Prisma ORM
          │
          ▼
Supabase PostgreSQL
```

### Backend libraries chính

```text
NestJS              → Backend framework
TypeScript          → Ngôn ngữ lập trình
Prisma              → ORM / Database access
@nestjs/jwt         → JWT authentication
Passport            → Authentication strategies
class-validator     → DTO validation
class-transformer   → DTO transformation
Redis               → Caching / distributed coordination
BullMQ               → Background jobs
OpenTelemetry       → Logs / Metrics / Traces
Swagger / OpenAPI   → API documentation
```

### Nguyên tắc tổ chức

Mỗi nghiệp vụ chính được tổ chức thành một NestJS module độc lập, ví dụ `products`, `orders`, `payments`, `inventory`, `imei`, `warranty` và `returns`. Điều này giữ nguyên định hướng **Modular Monolith / Clean Architecture** của project.

---

## 7. Database

Database chính:

```text
Supabase PostgreSQL
```

Backend kết nối:

```text
NestJS
      │
      ▼
Prisma ORM
      │
      ▼
Supabase PostgreSQL
```

Không chạy PostgreSQL container trong production nếu sử dụng Supabase Cloud.

Redis có thể chạy riêng trên server:

```text
NestJS
      │
      ▼
    Redis
```

---

## 8. Nguyên tắc kiến trúc

### Domain

Chỉ chứa nghiệp vụ cốt lõi:

```text
Product
Order
IMEI
Inventory
Payment
Warranty
Return
...
```

### Application

Chứa use case:

```text
CreateOrder
CancelOrder
ReserveIMEI
SellIMEI
CreatePayment
CreateWarrantyClaim
...
```

### Infrastructure

Chứa triển khai kỹ thuật:

```text
Supabase
PostgreSQL
Redis
JWT
Encryption
Payment Gateway
Email
OpenTelemetry
Background Jobs
...
```

### API

Chịu trách nhiệm:

```text
HTTP
Authentication
Authorization
Middleware
Validation
Health Check
```

---

## 9. Không sử dụng

Project hiện tại **không sử dụng**:

```text
❌ AI
❌ Machine Learning
❌ Microservices
❌ Kubernetes
❌ Kafka
❌ Database tự host
```

Kiến trúc tập trung vào:

```text
Web Server
+
NestJS
+
React
+
Supabase
+
Redis
+
Docker
+
Nginx
```
