import { Controller, Get, Post, Body, Param, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentCallbackDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── USER ──────────────────────────────────────────────

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Create payment for own order (USER)' })
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.id, dto);
  }

  @Get('order/:orderId')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get payments for an order' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check payment status' })
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getStatus(id);
  }

  // ── PAYMENT CALLBACKS (Public - secured by provider signature) ──

  @Post('callback')
  @ApiOperation({ summary: 'Payment gateway callback webhook' })
  handleCallback(@Body() dto: PaymentCallbackDto) {
    return this.paymentsService.handleCallback(dto);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all payments (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('transactions')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all transaction history (MANAGER/ADMIN)' })
  getTransactionHistory() {
    return this.paymentsService.getTransactionHistory();
  }

  @Put(':id/confirm')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Manually confirm payment (MANAGER/ADMIN)' })
  confirmPayment(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @Put(':id/fail')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Mark payment as failed (MANAGER/ADMIN)' })
  failPayment(@Param('id') id: string) {
    return this.paymentsService.failPayment(id);
  }
}
