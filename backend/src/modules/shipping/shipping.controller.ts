import {
  Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingDto, UpdateShippingStatusDto } from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// P1: this controller was completely public — anonymous users could create
// shipping records, flip statuses, and read any order's tracking number.
@ApiTags('Shipping')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create shipping record for an order (STAFF+)' })
  create(@Body() dto: CreateShippingDto) {
    return this.shippingService.create(dto);
  }

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all shipping records (STAFF+)' })
  findAll() {
    return this.shippingService.findAll();
  }

  @Get(':id')
  @Roles(Role.USER, Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get shipping by ID (owner or STAFF+)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.shippingService.findOneScoped(id, user);
  }

  @Get('order/:orderId')
  @Roles(Role.USER, Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get shipping info by Order ID (owner or STAFF+)' })
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string, @CurrentUser() user: any) {
    return this.shippingService.findByOrderScoped(orderId, user);
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update shipping status (STAFF+)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShippingStatusDto,
  ) {
    return this.shippingService.updateStatus(id, dto);
  }
}
