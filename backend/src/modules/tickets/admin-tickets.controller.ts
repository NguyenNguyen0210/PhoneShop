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
@Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
@ApiBearerAuth()
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List all support tickets with filters' })
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAllAdmin(query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get summary KPIs and analytics for support tickets' })
  getAnalytics() {
    return this.ticketsService.getSummaryAnalytics();
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
