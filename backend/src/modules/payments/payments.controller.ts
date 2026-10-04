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
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreateVnpayUrlDto,
  ConfirmPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../../infrastructure/idempotency/idempotency.interceptor';

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
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate signed VNPay payment URL (idempotent via Idempotency-Key header)' })
  createVnpayUrl(
    @Body() dto: CreateVnpayUrlDto,
    @Req() req: Request,
    @CurrentUser() user: any,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    // ADMIN may generate a URL for any order (e.g. sending a payment link);
    // normal users are scoped to their own orders inside the service.
    const roles: string[] = user?.roles ?? [];
    const isAdmin = user?.role === Role.ADMIN || roles.includes(Role.ADMIN);
    return this.paymentsService.createVnpayPaymentUrl(dto, ipAddr, isAdmin ? undefined : user?.id);
  }

  @Get('vnpay/ipn')
  @ApiOperation({ summary: 'VNPay Server-to-Server IPN Webhook (Public)' })
  async handleVnpayIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentsService.handleVnpayIpn(query);
    return res.status(200).json(result);
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
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment for own order (USER, idempotent via Idempotency-Key header)' })
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.id, dto);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for an order (owner or ADMIN)' })
  findByOrder(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.paymentsService.findByOrder(orderId, user);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment status (owner or staff)' })
  getStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.getStatus(id, user);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (STAFF/MANAGER/ADMIN)' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.paymentsService.findAll(page, limit);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all transaction history (STAFF/MANAGER/ADMIN)' })
  getTransactionHistory(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.paymentsService.getTransactionHistory(page, limit);
  }

  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually confirm payment with bank evidence (MANAGER/ADMIN)' })
  confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.confirmPayment(id, dto, user?.id);
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
