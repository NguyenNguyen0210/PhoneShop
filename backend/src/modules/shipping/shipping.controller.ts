import {
  Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingDto, UpdateShippingStatusDto } from './dto/shipping.dto';

@ApiTags('Shipping')
@ApiBearerAuth('access-token')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create shipping record for an order (Admin)' })
  create(@Body() dto: CreateShippingDto) {
    return this.shippingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipping records (Admin)' })
  findAll() {
    return this.shippingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipping by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shippingService.findOne(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipping info by Order ID' })
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.shippingService.findByOrder(orderId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipping status (Admin)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShippingStatusDto,
  ) {
    return this.shippingService.updateStatus(id, dto);
  }
}
