import { Controller, Get, Post, Body, Param, UseGuards, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, AdminNoteDto, CreateRefundDto } from './dto/return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnStatus } from '@prisma/client';

@ApiTags('Returns & Refunds')
@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // ── USER ──────────────────────────────────────────────

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Create return request (USER)' })
  createReturn(@CurrentUser() user: any, @Body() dto: CreateReturnDto) {
    return this.returnsService.createReturn(user.id, dto);
  }

  @Get('my')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my return requests (USER)' })
  getMyReturns(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.returnsService.getMyReturns(user.id, page, limit);
  }

  @Get('my/:id')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my return detail (USER)' })
  getMyReturn(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.getMyReturn(user.id, id);
  }

  @Delete('my/:id/cancel')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel return request (USER)' })
  cancelReturn(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.cancelReturn(user.id, id);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all returns (STAFF/MANAGER/ADMIN)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.returnsService.findAll(page, limit, status, search);
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get return detail (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Put(':id/approve')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Approve return (STAFF/MANAGER/ADMIN)' })
  approve(@Param('id') id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.transitionStatus(id, ReturnStatus.APPROVED, dto);
  }

  @Put(':id/reject')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Reject return (STAFF/MANAGER/ADMIN)' })
  reject(@Param('id') id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.transitionStatus(id, ReturnStatus.REJECTED, dto);
  }

  @Put(':id/mark-shipping')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Mark return as shipping (STAFF/MANAGER/ADMIN)' })
  markShipping(@Param('id') id: string) {
    return this.returnsService.transitionStatus(id, ReturnStatus.SHIPPING);
  }

  @Put(':id/receive')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Receive return (STAFF/MANAGER/ADMIN)' })
  receive(@Param('id') id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.transitionStatus(id, ReturnStatus.RECEIVED, dto);
  }

  @Put(':id/inspect')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Inspect return (STAFF/MANAGER/ADMIN)' })
  inspect(@Param('id') id: string) {
    return this.returnsService.transitionStatus(id, ReturnStatus.INSPECTING);
  }

  @Put(':id/complete')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Complete return (MANAGER/ADMIN)' })
  complete(@Param('id') id: string) {
    return this.returnsService.transitionStatus(id, ReturnStatus.COMPLETED);
  }

  // ── REFUNDS ───────────────────────────────────────────

  @Post('refunds')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create refund for a return (MANAGER/ADMIN)' })
  createRefund(@Body() dto: CreateRefundDto) {
    return this.returnsService.createRefund(dto);
  }

  @Put('refunds/:refundId/process')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Process refund (MANAGER/ADMIN)' })
  processRefund(@Param('refundId') refundId: string) {
    return this.returnsService.processRefund(refundId);
  }

  @Put('refunds/:refundId/complete')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Complete refund (MANAGER/ADMIN)' })
  completeRefund(@Param('refundId') refundId: string) {
    return this.returnsService.completeRefund(refundId);
  }

  @Get('refunds/history')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get refund history (MANAGER/ADMIN)' })
  getRefundHistory() {
    return this.returnsService.getRefundHistory();
  }
}
