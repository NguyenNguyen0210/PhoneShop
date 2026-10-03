# Customer Support & Customer 360 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Customer Support system with Ticket/Inquiry management (customer storefront & staff/admin portal), Customer 360 profile views, and strict role-based data security.

**Architecture:** Extend PostgreSQL schema via Prisma with Ticket and TicketMessage entities; implement NestJS modules for customer 360 aggregation and ticket lifecycle management with In-App notification integration; build Ant Design + Tailwind CSS frontend screens for Staff/Admin portal (`/admin/customers`, `/admin/tickets`) and customer storefront (`/profile?tab=tickets`, `/orders/:id`).

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, bcrypt, React, Vite, Ant Design, Tailwind CSS, TypeScript, Vitest, Jest.

---

## File Structure Map

```
backend/
├── prisma/
│   └── schema.prisma                                     # Add Ticket, TicketMessage, NotificationType.SUPPORT, relations
├── src/
│   ├── app.module.ts                                     # Register TicketsModule
│   ├── modules/
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   │   ├── query-user.dto.ts                    # Search, pagination, status & role filter DTO
│   │   │   │   └── customer-360.dto.ts                  # Customer 360 aggregated response types
│   │   │   ├── users.controller.ts                       # Add STAFF role to findAll/findOne, add getCustomer360
│   │   │   └── users.service.ts                          # Staff-restricted query, Customer 360 aggregation logic
│   │   └── tickets/
│   │       ├── dto/
│   │       │   ├── create-ticket.dto.ts                 # Customer create ticket DTO
│   │       │   ├── create-ticket-message.dto.ts         # Message & attachment DTO (with isInternalNote)
│   │       │   ├── query-ticket.dto.ts                  # Filter & pagination query DTO
│   │       │   └── update-ticket.dto.ts                 # Status change & assignment DTOs
│   │       ├── tickets.service.ts                       # Ticket CRUD, message threads, R2 URLs, notifications
│   │       ├── tickets.controller.ts                    # Customer-facing ticket endpoints (/tickets)
│   │       ├── admin-tickets.controller.ts              # Staff/Admin-facing ticket endpoints (/admin/tickets)
│   │       └── tickets.module.ts                        # Tickets module configuration
└── test/
    └── unit/
        ├── users-rbac-customer360.spec.ts               # Unit test for User controller/service RBAC & Customer 360
        └── tickets-service.spec.ts                      # Unit test for Tickets service, permissions & notes masking

frontend/
├── src/
│   ├── types/
│   │   ├── customer.ts                                  # Customer list & Customer 360 interfaces
│   │   └── ticket.ts                                    # Ticket, Message, Category, Status interfaces
│   ├── services/
│   │   ├── customerService.ts                           # API calls for /users and /customer-360
│   │   └── ticketService.ts                             # API calls for /tickets and /admin/tickets
│   ├── components/
│   │   └── admin/
│   │       └── AdminSidebar.tsx                         # Add 'Khách hàng' and 'Hỗ trợ khách hàng' menu items
│   ├── pages/
│   │   ├── Admin/
│   │   │   ├── Customers/
│   │   │   │   ├── AdminCustomersPage.tsx               # Customers list with RBAC action buttons
│   │   │   │   └── AdminCustomer360Page.tsx             # 360 view with KPI cards and 5 tabs
│   │   │   └── Tickets/
│   │   │       ├── AdminTicketsPage.tsx                 # Tickets table, stats, status & priority filters
│   │   │       └── AdminTicketDetailPage.tsx            # Split timeline view (replies vs internal notes)
│   │   └── storefront/
│   │       ├── Profile/
│   │       │   ├── ProfilePage.tsx                      # Add Tickets tab
│   │       │   └── components/
│   │       │       ├── CustomerTicketsTab.tsx           # Customer ticket history & create modal
│   │       │       └── TicketConversationModal.tsx      # Customer thread dialogue modal
│   │       └── Orders/
│   │           └── OrderDetailPage.tsx                  # Add "Yêu cầu hỗ trợ về đơn này" button
│   └── routes/
│       └── AppRoutes.tsx                                # Register new admin routes
```

---

## Tasks

### Task 1: Prisma Schema & Database Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add Enums and Models to schema.prisma**

Edit `backend/prisma/schema.prisma` to add `TicketCategory`, `TicketStatus`, `TicketPriority`, add `SUPPORT` to `NotificationType`, and define `Ticket` and `TicketMessage` models with relations to `User` and `Order`:

```prisma
enum TicketCategory {
  ORDER_INQUIRY
  PRODUCT_INQUIRY
  WARRANTY_SUPPORT
  RETURN_REFUND
  PAYMENT_INSTALLMENT
  ACCOUNT_GENERAL
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// In enum NotificationType, append SUPPORT:
enum NotificationType {
  ORDER
  PAYMENT
  SHIPPING
  PROMOTION
  SYSTEM
  WARRANTY
  RETURN
  SUPPORT
}

model Ticket {
  id            String          @id @default(uuid()) @db.Uuid
  code          String          @unique @db.VarChar(30)
  title         String          @db.VarChar(255)
  category      TicketCategory  @default(ACCOUNT_GENERAL)
  priority      TicketPriority  @default(MEDIUM)
  status        TicketStatus    @default(OPEN)
  
  userId        String          @map("user_id") @db.Uuid
  user          User            @relation("UserTickets", fields: [userId], references: [id], onDelete: Cascade)
  
  orderId       String?         @map("order_id") @db.Uuid
  order         Order?          @relation(fields: [orderId], references: [id], onDelete: SetNull)
  
  assignedToId  String?         @map("assigned_to_id") @db.Uuid
  assignedTo    User?           @relation("StaffAssignedTickets", fields: [assignedToId], references: [id], onDelete: SetNull)
  
  lastRepliedAt DateTime?       @map("last_replied_at")
  resolvedAt    DateTime?       @map("resolved_at")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  messages      TicketMessage[]

  @@index([userId])
  @@index([status])
  @@index([assignedToId])
  @@index([createdAt])
  @@map("tickets")
}

model TicketMessage {
  id              String        @id @default(uuid()) @db.Uuid
  ticketId        String        @map("ticket_id") @db.Uuid
  ticket          Ticket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  senderId        String        @map("sender_id") @db.Uuid
  sender          User          @relation(fields: [senderId], references: [id], onDelete: Cascade)
  
  message         String        @db.Text
  attachments     String[]      @default([])
  isInternalNote  Boolean       @default(false) @map("is_internal_note")
  
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([ticketId])
  @@map("ticket_messages")
}
```

- [ ] **Step 2: Update User Model relations**

In `backend/prisma/schema.prisma`, add relations inside `model User`:
```prisma
  tickets                 Ticket[]                 @relation("UserTickets")
  assignedTickets         Ticket[]                 @relation("StaffAssignedTickets")
  ticketMessages          TicketMessage[]
```

- [ ] **Step 3: Run Prisma validation and generate client**

Run:
```bash
cd backend && npx prisma db push && npx prisma generate
```
Expected: `The database is already in sync with the Prisma schema` or tables created, and Prisma Client generated successfully.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(prisma): add Ticket and TicketMessage models with relations"
```

---

### Task 2: Backend Users Module - Pagination, Search & Staff RBAC

**Files:**
- Create: `backend/src/modules/users/dto/query-user.dto.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.controller.ts`

- [ ] **Step 1: Create QueryUserDto**

Create `backend/src/modules/users/dto/query-user.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { UserStatus } from '@prisma/client';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name, email or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role (e.g. USER, STAFF, ADMIN)' })
  @IsOptional()
  @IsString()
  role?: string;
}
```

- [ ] **Step 2: Update UsersService.findAll and findOne with Staff RBAC enforcement**

Edit `backend/src/modules/users/users.service.ts`:
```typescript
  async findAll(query: QueryUserDto, currentUser: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const isOnlyStaff = currentUser.roles.includes('STAFF') && !currentUser.roles.includes('ADMIN');

    const where: any = {};

    // Staff is strictly scoped to role 'USER'
    if (isOnlyStaff) {
      where.roles = { some: { role: { name: 'USER' } } };
    } else if (query.role) {
      where.roles = { some: { role: { name: query.role } } };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } },
      }),
    ]);

    const sanitizedUsers = users.map((u) => {
      delete (u as any).passwordHash;
      return u;
    });

    return {
      data: sanitizedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        addresses: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    if (currentUser) {
      const isOnlyStaff = currentUser.roles.includes('STAFF') && !currentUser.roles.includes('ADMIN');
      const targetIsUser = user.roles.some((r) => r.role.name === 'USER');
      if (isOnlyStaff && !targetIsUser) {
        throw new ForbiddenException('Staff chỉ có quyền xem thông tin khách hàng');
      }
    }

    delete (user as any).passwordHash;
    return user;
  }
```

- [ ] **Step 3: Update UsersController to allow Role.STAFF and inject Query**

Edit `backend/src/modules/users/users.controller.ts`:
```typescript
  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get all users (ADMIN or STAFF for customers)' })
  findAll(@Query() query: QueryUserDto, @CurrentUser() user: any) {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get user detail (ADMIN or STAFF for customers)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user);
  }
```

- [ ] **Step 4: Commit changes**

```bash
git add backend/src/modules/users/dto/query-user.dto.ts backend/src/modules/users/users.service.ts backend/src/modules/users/users.controller.ts
git commit -m "feat(users): add pagination, search, and staff RBAC to users endpoint"
```
### Task 3: Backend Users Module - Customer 360 Aggregation Endpoint

**Files:**
- Create: `backend/src/modules/users/dto/customer-360.dto.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.controller.ts`

- [ ] **Step 1: Define Customer 360 Response Types**

Create `backend/src/modules/users/dto/customer-360.dto.ts`:
```typescript
export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalTickets: number;
  openTickets: number;
  activeWarranties: number;
  totalInstallments: number;
  approvedInstallments: number;
}

export interface Customer360Response {
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  metrics: Customer360Metrics;
  addresses: any[];
  recentOrders: any[];
  warranties: any[];
  installments: any[];
  tickets: any[];
}
```

- [ ] **Step 2: Implement getCustomer360 in UsersService**

Add method in `backend/src/modules/users/users.service.ts`:
```typescript
  async getCustomer360(id: string, currentUser: any): Promise<Customer360Response> {
    const user = await this.findOne(id, currentUser);

    const [orders, warranties, installments, tickets] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          items: {
            take: 3,
            select: {
              id: true,
              productName: true,
              quantity: true,
              price: true,
            },
          },
        },
      }),
      this.prisma.warranty.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: {
            select: {
              productName: true,
              variant: { select: { sku: true, color: true, storage: true } },
            },
          },
        },
      }),
      this.prisma.installmentApplication.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          termMonths: true,
          monthlyPayment: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true, totalAmount: true } },
        },
      }),
      this.prisma.ticket.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
          lastRepliedAt: true,
        },
      }),
    ]);

    // Aggregate metrics across all user orders
    const allUserOrders = await this.prisma.order.findMany({
      where: { userId: id },
      select: { status: true, paymentStatus: true, totalAmount: true },
    });

    const totalSpent = allUserOrders
      .filter((o) => o.paymentStatus === 'PAID' || o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const metrics: Customer360Metrics = {
      totalSpent,
      totalOrders: allUserOrders.length,
      completedOrders: allUserOrders.filter((o) => o.status === 'COMPLETED').length,
      processingOrders: allUserOrders.filter((o) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPING'].includes(o.status)).length,
      cancelledOrders: allUserOrders.filter((o) => o.status === 'CANCELLED').length,
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length,
      activeWarranties: warranties.filter((w) => w.status === 'ACTIVE').length,
      totalInstallments: installments.length,
      approvedInstallments: installments.filter((i) => i.status === 'APPROVED').length,
    };

    return {
      customer: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      metrics,
      addresses: user.addresses || [],
      recentOrders: orders,
      warranties,
      installments,
      tickets,
    };
  }
```

- [ ] **Step 3: Add getCustomer360 endpoint in UsersController**

Edit `backend/src/modules/users/users.controller.ts`:
```typescript
  @Get(':id/customer-360')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get Customer 360 overview (ADMIN and STAFF)' })
  getCustomer360(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getCustomer360(id, user);
  }
```

- [ ] **Step 4: Commit changes**

```bash
git add backend/src/modules/users/dto/customer-360.dto.ts backend/src/modules/users/users.service.ts backend/src/modules/users/users.controller.ts
git commit -m "feat(users): add Customer 360 aggregation endpoint"
```

---

### Task 4: Backend Tickets Module - Data Transfer Objects (DTOs)

**Files:**
- Create: `backend/src/modules/tickets/dto/create-ticket.dto.ts`
- Create: `backend/src/modules/tickets/dto/create-ticket-message.dto.ts`
- Create: `backend/src/modules/tickets/dto/query-ticket.dto.ts`
- Create: `backend/src/modules/tickets/dto/update-ticket.dto.ts`

- [ ] **Step 1: Create CreateTicketDto**

Create `backend/src/modules/tickets/dto/create-ticket.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: TicketCategory })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Related order UUID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ description: 'Initial message content' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [String], description: 'Cloudflare R2 attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
```

- [ ] **Step 2: Create CreateTicketMessageDto**

Create `backend/src/modules/tickets/dto/create-ticket-message.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketMessageDto {
  @ApiProperty({ description: 'Message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [String], description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ default: false, description: 'Internal staff note, hidden from customer' })
  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;
}
```

- [ ] **Step 3: Create QueryTicketDto**

Create `backend/src/modules/tickets/dto/query-ticket.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class QueryTicketDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Staff user UUID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Search ticket code, title or customer name' })
  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 4: Create UpdateTicketStatusDto & AssignTicketDto**

Create `backend/src/modules/tickets/dto/update-ticket.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  status: TicketStatus;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'Staff user UUID to assign' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId: string;
}
```

- [ ] **Step 5: Commit DTOs**

```bash
git add backend/src/modules/tickets/dto/
git commit -m "feat(tickets): add DTOs for ticket creation, messaging, querying, and updating"
```
### Task 5: Backend Tickets Module - Service Implementation

**Files:**
- Create: `backend/src/modules/tickets/tickets.service.ts`

- [ ] **Step 1: Write TicketsService skeleton with method signatures**

Create `backend/src/modules/tickets/tickets.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { TicketStatus, NotificationType } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateTicketCode(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `TK-${yearMonth}-`;
    const count = await this.prisma.ticket.count({
      where: { code: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // Implementation methods in subsequent steps
}
```

- [ ] **Step 2: Implement Customer Ticket methods**

Edit `backend/src/modules/tickets/tickets.service.ts` to add customer methods:
```typescript
  async createTicket(userId: string, dto: CreateTicketDto) {
    const code = await this.generateTicketCode();

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          code,
          title: dto.title,
          category: dto.category,
          priority: dto.priority || 'MEDIUM',
          status: 'OPEN',
          userId,
          orderId: dto.orderId || null,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: userId,
          message: dto.message,
          attachments: dto.attachments || [],
          isInternalNote: false,
        },
      });

      return tx.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          messages: true,
          order: { select: { id: true, orderNumber: true, totalAmount: true } },
        },
      });
    });
  }

  async getMyTickets(userId: string, query: QueryTicketDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTicketDetailForCustomer(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true, status: true } },
        messages: {
          where: { isInternalNote: false }, // MASK internal notes
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');

    return ticket;
  }

  async addCustomerReply(ticketId: string, userId: string, dto: CreateTicketMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Vé hỗ trợ này đã đóng');

    const nextStatus = ticket.status === 'RESOLVED' ? 'IN_PROGRESS' : ticket.status;

    const [message] = await Promise.all([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: dto.message,
          attachments: dto.attachments || [],
          isInternalNote: false,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: nextStatus, lastRepliedAt: new Date() },
      }),
    ]);

    return message;
  }

  async closeTicketByCustomer(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', resolvedAt: new Date() },
    });
  }
```

- [ ] **Step 3: Implement Staff & Admin Ticket methods with Notifications**

Add methods in `backend/src/modules/tickets/tickets.service.ts`:
```typescript
  async findAllAdmin(query: QueryTicketDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, orderNumber: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneAdmin(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    return ticket;
  }

  async addAdminReply(ticketId: string, staffUser: any, dto: CreateTicketMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isInternal = Boolean(dto.isInternalNote);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: staffUser.id,
        message: dto.message,
        attachments: dto.attachments || [],
        isInternalNote: isInternal,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
        },
      },
    });

    if (!isInternal) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
          lastRepliedAt: new Date(),
          assignedToId: ticket.assignedToId || staffUser.id,
        },
      });

      // Send In-App notification to customer
      try {
        await this.notificationsService.create({
          userId: ticket.userId,
          type: NotificationType.SUPPORT,
          title: `Phản hồi vé hỗ trợ ${ticket.code}`,
          message: `Nhân viên CSKH vừa gửi phản hồi cho yêu cầu: "${ticket.title}".`,
          data: { ticketId: ticket.id, code: ticket.code },
        });
      } catch (err) {
        // Log & proceed without breaking response
      }
    }

    return message;
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const updateData: any = { status };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    if (status === 'RESOLVED') {
      try {
        await this.notificationsService.create({
          userId: ticket.userId,
          type: NotificationType.SUPPORT,
          title: `Vé hỗ trợ ${ticket.code} đã được xử lý`,
          message: `Yêu cầu hỗ trợ "${ticket.title}" đã được nhân viên giải quyết. Vui lòng kiểm tra và xác nhận.`,
          data: { ticketId: ticket.id, code: ticket.code },
        });
      } catch (err) {}
    }

    return updated;
  }

  async assignTicket(ticketId: string, assignedToId: string) {
    const [ticket, staff] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId } }),
      this.prisma.user.findUnique({ where: { id: assignedToId } }),
    ]);

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
```

- [ ] **Step 4: Commit TicketsService**

```bash
git add backend/src/modules/tickets/tickets.service.ts
git commit -m "feat(tickets): implement tickets service with CRUD, notes masking and notification integration"
```

---

### Task 6: Backend Tickets Module - Controllers & App Wiring

**Files:**
- Create: `backend/src/modules/tickets/tickets.controller.ts`
- Create: `backend/src/modules/tickets/admin-tickets.controller.ts`
- Create: `backend/src/modules/tickets/tickets.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create customer-facing TicketsController**

Create `backend/src/modules/tickets/tickets.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tickets (Storefront)')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Customer create a support ticket' })
  createTicket(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.ticketsService.createTicket(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current customer tickets' })
  getMyTickets(@CurrentUser() user: any, @Query() query: QueryTicketDto) {
    return this.ticketsService.getMyTickets(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer ticket detail with replies' })
  getTicketDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.getTicketDetailForCustomer(id, user.id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Customer send reply to ticket' })
  addReply(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: CreateTicketMessageDto) {
    return this.ticketsService.addCustomerReply(id, user.id, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Customer close ticket' })
  closeTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.closeTicketByCustomer(id, user.id);
  }
}
```

- [ ] **Step 2: Create AdminTicketsController**

Create `backend/src/modules/tickets/admin-tickets.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { UpdateTicketStatusDto, AssignTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin Tickets (Staff/Admin)')
@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List all support tickets with filters' })
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full ticket details including internal notes' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOneAdmin(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Staff/Admin reply to ticket or add internal note' })
  addMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.ticketsService.addAdminReply(id, user, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change ticket status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.ticketsService.updateTicketStatus(id, dto.status);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to staff member' })
  assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketsService.assignTicket(id, dto.assignedToId);
  }
}
```

- [ ] **Step 3: Create TicketsModule and register in AppModule**

Create `backend/src/modules/tickets/tickets.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { AdminTicketsController } from './admin-tickets.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
```

In `backend/src/app.module.ts`, import and add `TicketsModule` into `imports` array.

- [ ] **Step 4: Commit Controllers and Module**

```bash
git add backend/src/modules/tickets/ backend/src/app.module.ts
git commit -m "feat(tickets): add customer and admin ticket controllers and wire to AppModule"
```
### Task 7: Backend Unit Tests - Users RBAC, Customer 360 & Tickets Service

**Files:**
- Create: `backend/test/unit/users-rbac-customer360.spec.ts`
- Create: `backend/test/unit/tickets-service.spec.ts`

- [ ] **Step 1: Write Users RBAC & Customer 360 unit test**

Create `backend/test/unit/users-rbac-customer360.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersService RBAC & Customer 360', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
      warranty: {
        findMany: jest.fn(),
      },
      installmentApplication: {
        findMany: jest.fn(),
      },
      ticket: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should restrict Staff user to only querying users with role USER', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'cust@mail.com', passwordHash: 'secret_hash', roles: [{ role: { name: 'USER' } }] },
    ]);

    const staffUser = { id: 's1', roles: ['STAFF'] };
    const result = await service.findAll({ page: 1, limit: 10 }, staffUser);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roles: { some: { role: { name: 'USER' } } },
        }),
      }),
    );
    expect((result.data[0] as any).passwordHash).toBeUndefined();
  });

  it('should forbid Staff from viewing Admin user detail', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'a1',
      email: 'admin@mail.com',
      roles: [{ role: { name: 'ADMIN' } }],
    });

    const staffUser = { id: 's1', roles: ['STAFF'] };
    await expect(service.findOne('a1', staffUser)).rejects.toThrow(ForbiddenException);
  });

  it('should aggregate Customer 360 metrics correctly', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'c1',
      email: 'c@mail.com',
      roles: [{ role: { name: 'USER' } }],
      addresses: [],
    });
    prisma.order.findMany.mockResolvedValue([
      { id: 'o1', totalAmount: 15000000, status: 'COMPLETED', paymentStatus: 'PAID' },
      { id: 'o2', totalAmount: 5000000, status: 'CANCELLED', paymentStatus: 'FAILED' },
    ]);
    prisma.warranty.findMany.mockResolvedValue([{ id: 'w1', status: 'ACTIVE' }]);
    prisma.installmentApplication.findMany.mockResolvedValue([]);
    prisma.ticket.findMany.mockResolvedValue([{ id: 't1', status: 'OPEN' }]);

    const staffUser = { id: 's1', roles: ['STAFF'] };
    const res = await service.getCustomer360('c1', staffUser);

    expect(res.metrics.totalSpent).toBe(15000000);
    expect(res.metrics.totalOrders).toBe(2);
    expect(res.metrics.completedOrders).toBe(1);
    expect(res.metrics.activeWarranties).toBe(1);
    expect(res.metrics.openTickets).toBe(1);
  });
});
```

- [ ] **Step 2: Write TicketsService unit test (Internal Note Masking & Notifications)**

Create `backend/test/unit/tickets-service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../../src/modules/tickets/tickets.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { ForbiddenException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      ticket: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    notifications = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should mask internal notes when customer views ticket detail', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      id: 'tk-1',
      userId: 'customer-1',
      messages: [
        { id: 'm1', message: 'Hello, need help', isInternalNote: false },
      ],
    });

    await service.getTicketDetailForCustomer('tk-1', 'customer-1');

    expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tk-1' },
        include: expect.objectContaining({
          messages: expect.objectContaining({
            where: { isInternalNote: false },
          }),
        }),
      }),
    );
  });

  it('should forbid customer from viewing another customer ticket', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      id: 'tk-2',
      userId: 'customer-2',
    });

    await expect(service.getTicketDetailForCustomer('tk-2', 'customer-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should trigger In-App Notification when staff sends public reply', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      id: 'tk-1',
      code: 'TK-202610-0001',
      title: 'Màn hình lỗi',
      userId: 'customer-1',
      status: 'OPEN',
    });
    prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-1' });
    prisma.ticket.update.mockResolvedValue({ id: 'tk-1', status: 'IN_PROGRESS' });

    const staffUser = { id: 'staff-1', roles: ['STAFF'] };
    await service.addAdminReply('tk-1', staffUser, {
      message: 'Chúng tôi đang kiểm tra',
      isInternalNote: false,
    });

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        title: expect.stringContaining('TK-202610-0001'),
      }),
    );
  });
});
```

- [ ] **Step 3: Run backend unit tests**

Run:
```bash
cd backend && npm test -- test/unit/users-rbac-customer360.spec.ts test/unit/tickets-service.spec.ts
```
Expected: All tests pass.

- [ ] **Step 4: Commit tests**

```bash
git add backend/test/unit/users-rbac-customer360.spec.ts backend/test/unit/tickets-service.spec.ts
git commit -m "test(backend): add unit tests for users RBAC, customer 360 and tickets service"
```

---

### Task 8: Frontend Types & API Services

**Files:**
- Create: `frontend/src/types/customer.ts`
- Create: `frontend/src/types/ticket.ts`
- Create: `frontend/src/services/customerService.ts`
- Create: `frontend/src/services/ticketService.ts`

- [ ] **Step 1: Create customer.ts types**

Create `frontend/src/types/customer.ts`:
```typescript
export interface CustomerSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  createdAt: string;
  lastLoginAt: string | null;
  roles?: Array<{ role: { name: string } }>;
}

export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalTickets: number;
  openTickets: number;
  activeWarranties: number;
  totalInstallments: number;
  approvedInstallments: number;
}

export interface Customer360Data {
  customer: CustomerSummary;
  metrics: Customer360Metrics;
  addresses: any[];
  recentOrders: any[];
  warranties: any[];
  installments: any[];
  tickets: any[];
}
```

- [ ] **Step 2: Create ticket.ts types**

Create `frontend/src/types/ticket.ts`:
```typescript
export type TicketCategory =
  | 'ORDER_INQUIRY'
  | 'PRODUCT_INQUIRY'
  | 'WARRANTY_SUPPORT'
  | 'RETURN_REFUND'
  | 'PAYMENT_INSTALLMENT'
  | 'ACCOUNT_GENERAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  sender?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    roles?: Array<{ role: { name: string } }>;
  };
  message: string;
  attachments: string[];
  isInternalNote: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userId: string;
  user?: CustomerSummary;
  orderId?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount?: number;
    status?: string;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
  lastRepliedAt?: string | null;
  resolvedAt?: string | null;
}
```

- [ ] **Step 3: Implement customerService.ts**

Create `frontend/src/services/customerService.ts`:
```typescript
import api from './api';
import { CustomerSummary, Customer360Data } from '../types/customer';

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export const customerService = {
  getCustomers: async (params?: CustomerFilterParams) => {
    const res = await api.get<{ data: CustomerSummary[]; total: number; page: number; limit: number; totalPages: number }>('/users', { params });
    return res.data;
  },

  getCustomerById: async (id: string) => {
    const res = await api.get<CustomerSummary>(`/users/${id}`);
    return res.data;
  },

  getCustomer360: async (id: string) => {
    const res = await api.get<Customer360Data>(`/users/${id}/customer-360`);
    return res.data;
  },

  // Admin-only operations
  activateUser: async (id: string) => {
    const res = await api.put(`/users/${id}/activate`);
    return res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await api.put(`/users/${id}/deactivate`);
    return res.data;
  },

  banUser: async (id: string) => {
    const res = await api.put(`/users/${id}/ban`);
    return res.data;
  },
};
```

- [ ] **Step 4: Implement ticketService.ts**

Create `frontend/src/services/ticketService.ts`:
```typescript
import api from './api';
import { Ticket, TicketMessage, TicketCategory, TicketPriority, TicketStatus } from '../types/ticket';

export const ticketService = {
  // Storefront endpoints
  createTicket: async (data: {
    title: string;
    category: TicketCategory;
    priority?: TicketPriority;
    orderId?: string;
    message: string;
    attachments?: string[];
  }) => {
    const res = await api.post<Ticket>('/tickets', data);
    return res.data;
  },

  getMyTickets: async (params?: { page?: number; limit?: number; status?: TicketStatus; category?: TicketCategory }) => {
    const res = await api.get<{ data: Ticket[]; total: number; page: number; limit: number; totalPages: number }>('/tickets/my', { params });
    return res.data;
  },

  getTicketDetail: async (id: string) => {
    const res = await api.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },

  replyTicket: async (ticketId: string, data: { message: string; attachments?: string[] }) => {
    const res = await api.post<TicketMessage>(`/tickets/${ticketId}/messages`, data);
    return res.data;
  },

  closeTicket: async (ticketId: string) => {
    const res = await api.patch<Ticket>(`/tickets/${ticketId}/close`);
    return res.data;
  },

  // Staff/Admin endpoints
  getAdminTickets: async (params?: {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    assignedToId?: string;
    search?: string;
  }) => {
    const res = await api.get<{ data: Ticket[]; total: number; page: number; limit: number; totalPages: number }>('/admin/tickets', { params });
    return res.data;
  },

  getAdminTicketDetail: async (id: string) => {
    const res = await api.get<Ticket>(`/admin/tickets/${id}`);
    return res.data;
  },

  addAdminReply: async (ticketId: string, data: { message: string; attachments?: string[]; isInternalNote?: boolean }) => {
    const res = await api.post<TicketMessage>(`/admin/tickets/${ticketId}/messages`, data);
    return res.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
    const res = await api.patch<Ticket>(`/admin/tickets/${ticketId}/status`, { status });
    return res.data;
  },

  assignTicket: async (ticketId: string, assignedToId: string) => {
    const res = await api.patch<Ticket>(`/admin/tickets/${ticketId}/assign`, { assignedToId });
    return res.data;
  },
};
```

- [ ] **Step 5: Commit types & services**

```bash
git add frontend/src/types/customer.ts frontend/src/types/ticket.ts frontend/src/services/customerService.ts frontend/src/services/ticketService.ts
git commit -m "feat(frontend): add customer and ticket types and API service layers"
```
### Task 9: Frontend Admin Portal - Sidebar Navigation & Customers Page

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Create: `frontend/src/pages/Admin/Customers/AdminCustomersPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Update AdminSidebar.tsx with Khách hàng and Hỗ trợ khách hàng**

Edit `frontend/src/components/admin/AdminSidebar.tsx` to add icons and menu items:
```tsx
import {
  DashboardOutlined,
  ShoppingOutlined,
  BarcodeOutlined,
  OrderedListOutlined,
  CreditCardOutlined,
  UserOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

// In adminMenuItems, append:
  {
    key: '/admin/customers',
    icon: <UserOutlined style={{ fontSize: 16 }} />,
    label: 'Khách hàng (360°)',
  },
  {
    key: '/admin/tickets',
    icon: <CustomerServiceOutlined style={{ fontSize: 16 }} />,
    label: 'Hỗ trợ khách hàng',
  },
```

- [ ] **Step 2: Create AdminCustomersPage.tsx**

Create `frontend/src/pages/Admin/Customers/AdminCustomersPage.tsx`:
Implement table with columns (Avatar, Tên, Email, SĐT, Ngày tạo, Trạng thái), search input, status filter dropdown, pagination, and "Xem 360°" action button linking to `/admin/customers/:id`.
Use `useAuthStore` to check `isAdmin`:
- If `isAdmin`: show action menu for "Khóa tài khoản" / "Mở khóa".
- If `isStaff` (not Admin): render only "Xem chi tiết 360°", maintaining strict read-only security on UI.

- [ ] **Step 3: Register route in AppRoutes.tsx**

In `frontend/src/routes/AppRoutes.tsx`, inside `<Route element={<AdminRoute />}> <Route element={<AdminLayout />}>`:
Add:
```tsx
<Route path="/admin/customers" element={<AdminCustomersPage />} />
```

- [ ] **Step 4: Commit AdminCustomersPage**

```bash
git add frontend/src/components/admin/AdminSidebar.tsx frontend/src/pages/Admin/Customers/AdminCustomersPage.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(admin): add customers list page and sidebar navigation"
```

---

### Task 10: Frontend Admin Portal - Customer 360 Detail Page

**Files:**
- Create: `frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create AdminCustomer360Page.tsx**

Create `frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx`:
- Header: Customer avatar, name, email, phone, status badge, created date, and VIP tier badge based on total spend (e.g., Bronze < 10M, Silver 10-30M, Gold > 30M VND).
- Top Metric Cards (Row of 4 cards):
  1. Tổng chi tiêu (VND format)
  2. Tổng đơn hàng (Hoàn thành / Đang xử lý / Đã hủy)
  3. Vé hỗ trợ (Tổng / Đang mở)
  4. Bảo hành thiết bị còn hiệu lực
- Ant Design `Tabs` with 5 detailed tabs:
  1. `Tab 1: Lịch sử Đơn hàng` (Table of orders with orderNumber, items, totalAmount, status, paymentStatus, and link to `/admin/orders`)
  2. `Tab 2: Hồ sơ Trả góp` (Table with termMonths, monthlyPayment, status, order details)
  3. `Tab 3: Thiết bị & Bảo hành` (Table with product, IMEI/variant, warranty expiry date)
  4. `Tab 4: Vé Hỗ trợ (Tickets)` (Table with ticket code, title, category, priority, status, and button to open ticket)
  5. `Tab 5: Sổ địa chỉ` (Cards showing recipient name, phone, full address, isDefault badge)

- [ ] **Step 2: Register route in AppRoutes.tsx**

In `frontend/src/routes/AppRoutes.tsx`:
Add:
```tsx
<Route path="/admin/customers/:id" element={<AdminCustomer360Page />} />
```

- [ ] **Step 3: Commit Customer 360 Page**

```bash
git add frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(admin): implement Customer 360 profile overview with KPI cards and history tabs"
```
### Task 11: Frontend Admin Portal - Tickets Management & Detail Pages

**Files:**
- Create: `frontend/src/pages/Admin/Tickets/AdminTicketsPage.tsx`
- Create: `frontend/src/pages/Admin/Tickets/AdminTicketDetailPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create AdminTicketsPage.tsx**

Create `frontend/src/pages/Admin/Tickets/AdminTicketsPage.tsx`:
- Top Stat Cards: Chờ tiếp nhận (`OPEN`), Đang xử lý (`IN_PROGRESS`), Đã xử lý (`RESOLVED`), Cần gấp (`URGENT`).
- Filter bar: Status tabs (`Tất cả`, `Chờ xử lý`, `Đang xử lý`, `Đã xong`), Category filter, Priority filter, Search by ticket code / customer.
- Table columns: Mã vé (`TK-xxx`), Tiêu đề, Khách hàng, Danh mục (Tag màu), Mức độ ưu tiên, Phân công (Staff name), Ngày cập nhật, Trạng thái, Thao tác ("Xem & Xử lý").

- [ ] **Step 2: Create AdminTicketDetailPage.tsx**

Create `frontend/src/pages/Admin/Tickets/AdminTicketDetailPage.tsx`:
- Split View (2 columns):
  - **Left column (Timeline & Conversation)**:
    - Ticket subject, category, created date.
    - Message history: Customer messages on left, Staff replies on right.
    - **Internal Notes**: Displayed with amber/light-yellow background and 🔒 "Ghi chú nội bộ" badge.
    - Reply input box with Ant Design `Radio.Group` or `Tabs` to toggle:
      - Mode A: "Trả lời khách hàng" (public)
      - Mode B: "Ghi chú nội bộ" (internal note, hidden from customer)
    - Image attachment upload button (calling upload endpoint/Cloudflare R2).
    - Send button.
  - **Right column (Ticket Metadata & Quick Navigation)**:
    - Status change dropdown (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
    - Staff assignment dropdown (list of staff members).
    - Customer Info card: Avatar, Name, Email, Phone, and button "Xem hồ sơ 360°".
    - Related Order card (if `orderId` is present): Order number, total amount, status, link to order.

- [ ] **Step 3: Register routes in AppRoutes.tsx**

In `frontend/src/routes/AppRoutes.tsx`:
```tsx
<Route path="/admin/tickets" element={<AdminTicketsPage />} />
<Route path="/admin/tickets/:id" element={<AdminTicketDetailPage />} />
```

- [ ] **Step 4: Commit Admin Tickets Pages**

```bash
git add frontend/src/pages/Admin/Tickets/ frontend/src/routes/AppRoutes.tsx
git commit -m "feat(admin): implement tickets list and detail timeline with internal notes"
```

---

### Task 12: Frontend Storefront - Profile Support Tab & Order Support Integration

**Files:**
- Create: `frontend/src/pages/storefront/Profile/components/CustomerTicketsTab.tsx`
- Create: `frontend/src/pages/storefront/Profile/components/TicketConversationModal.tsx`
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`

- [ ] **Step 1: Create TicketConversationModal.tsx**

Create `frontend/src/pages/storefront/Profile/components/TicketConversationModal.tsx`:
- Modal displaying ticket details, status badge, message history (customer vs staff).
- Input box with Send reply button and attachment support.
- Action button: "Xác nhận hài lòng & Đóng vé" (calls `ticketService.closeTicket`).

- [ ] **Step 2: Create CustomerTicketsTab.tsx**

Create `frontend/src/pages/storefront/Profile/components/CustomerTicketsTab.tsx`:
- "Tạo yêu cầu hỗ trợ mới" button -> opens create ticket modal.
  - Form: Tiêu đề, Phân loại vấn đề (Dropdown), Đơn hàng liên quan (Dropdown list from customer's orders), Nội dung chi tiết, Upload ảnh minh chứng lỗi/hóa đơn.
- Table / List of customer's tickets: Ticket Code, Category tag, Priority, Created At, Status badge.
- Clicking a ticket opens `TicketConversationModal`.

- [ ] **Step 3: Integrate CustomerTicketsTab into ProfilePage.tsx**

Edit `frontend/src/pages/storefront/Profile/ProfilePage.tsx`:
- Add Tab `Hỗ trợ & Khiếu nại` (key: `tickets`, icon: `CustomerServiceOutlined`).
- Render `<CustomerTicketsTab />` when active.

- [ ] **Step 4: Add quick support button in OrderDetailPage.tsx**

Edit `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`:
- Add a button "Cần hỗ trợ về đơn này?" next to order actions.
- Clicking navigates to `/profile?tab=tickets&orderId=${order.id}` or opens the create ticket modal with the current order pre-selected.

- [ ] **Step 5: Commit Storefront Support features**

```bash
git add frontend/src/pages/storefront/Profile/ frontend/src/pages/storefront/Orders/OrderDetailPage.tsx
git commit -m "feat(storefront): add customer tickets tab in profile and quick order support action"
```

---

### Task 13: End-to-End Build & Test Verification

**Files:**
- Test all components across Backend and Frontend

- [ ] **Step 1: Run all Backend tests**

```bash
cd backend && npm test
```
Expected: All unit and integration tests pass, including users RBAC, customer 360, and ticket service.

- [ ] **Step 2: Verify Backend Build**

```bash
cd backend && npm run build
```
Expected: NestJS TypeScript compilation succeeds with zero errors.

- [ ] **Step 3: Run Frontend Tests**

```bash
cd frontend && npm run test:unit
```
Expected: Vitest passes without errors.

- [ ] **Step 4: Verify Frontend Build**

```bash
cd frontend && npm run build
```
Expected: Vite build succeeds and generates production dist bundle.

- [ ] **Step 5: Final Commit**

```bash
git add .
git commit -m "chore: verify build and test suites for customer support & customer 360"
```
