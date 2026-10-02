import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreateVnpayUrlDto,
  PaymentCallbackDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── VIETQR ─────────────────────────────────────────────

  @Post('vietqr/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.STAFF, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate VietQR dynamic code for an order' })
  generateVietQr(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.role === Role.ADMIN ? undefined : user?.id;
    return this.paymentsService.generateVietQr(orderId, userId);
  }

  // ── VNPAY GATEWAY ──────────────────────────────────────

  @Post('vnpay/create-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate signed VNPay payment URL' })
  createVnpayUrl(@Body() dto: CreateVnpayUrlDto, @Req() req: Request) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    return this.paymentsService.createVnpayPaymentUrl(dto, ipAddr);
  }

  @Get('vnpay/ipn')
  @ApiOperation({ summary: 'VNPay Server-to-Server IPN Webhook (Public)' })
  handleVnpayIpn(@Query() query: Record<string, any>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Get('vnpay/return')
  @ApiOperation({ summary: 'VNPay Customer Return URL (Public)' })
  handleVnpayReturn(@Query() query: Record<string, any>) {
    return this.paymentsService.handleVnpayReturn(query);
  }

  // ── USER STANDARD PAYMENTS ─────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment for own order (USER)' })
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.id, dto);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for an order' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment status' })
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getStatus(id);
  }

  // ── PAYMENT CALLBACKS (Public - secured by provider signature) ──

  @Post('callback')
  @ApiOperation({ summary: 'Generic payment gateway callback webhook' })
  handleCallback(@Body() dto: PaymentCallbackDto) {
    return this.paymentsService.handleCallback(dto);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all transaction history (MANAGER/ADMIN)' })
  getTransactionHistory() {
    return this.paymentsService.getTransactionHistory();
  }

  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually confirm payment (MANAGER/ADMIN)' })
  confirmPayment(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @Put(':id/fail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark payment as failed (MANAGER/ADMIN)' })
  failPayment(@Param('id') id: string) {
    return this.paymentsService.failPayment(id);
  }
}
