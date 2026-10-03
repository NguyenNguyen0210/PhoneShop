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
  addReply(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.ticketsService.addCustomerReply(id, user.id, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Customer close ticket' })
  closeTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.closeTicketByCustomer(id, user.id);
  }
}
