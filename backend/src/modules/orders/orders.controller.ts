import { Controller, Get, Post, Body, Param, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CancelOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── USER ──────────────────────────────────────────────

  @Post('checkout')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Checkout and create order from cart' })
  checkout(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get('my')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my orders' })
  findMyOrders(@CurrentUser() user: any) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get('my/:id')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my order detail' })
  findMyOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findMyOrder(user.id, id);
  }

  @Put('my/:id/cancel')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel my order (USER)' })
  cancelMyOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelMyOrder(user.id, id, dto);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all orders (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get order detail (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Put(':id/confirm')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Confirm order (STAFF/MANAGER/ADMIN)' })
  confirm(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, OrderStatus.CONFIRMED);
  }

  @Put(':id/process')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Process order (STAFF/MANAGER/ADMIN)' })
  process(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, OrderStatus.PROCESSING);
  }

  @Put(':id/ship')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Ship order (STAFF/MANAGER/ADMIN)' })
  ship(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, OrderStatus.SHIPPING);
  }

  @Put(':id/deliver')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Mark delivered (STAFF/MANAGER/ADMIN)' })
  deliver(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, OrderStatus.DELIVERED);
  }

  @Put(':id/complete')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Complete order (STAFF/MANAGER/ADMIN)' })
  complete(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, OrderStatus.COMPLETED);
  }

  @Put(':id/cancel')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel order (STAFF/MANAGER/ADMIN)' })
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.transitionStatus(id, OrderStatus.CANCELLED);
  }
}
