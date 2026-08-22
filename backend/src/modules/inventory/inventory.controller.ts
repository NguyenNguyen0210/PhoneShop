import { Controller, Get, Post, Body, Param, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, SetReorderLevelDto, ReserveStockDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'View all inventory (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('low-stock')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Low stock alerts (STAFF/MANAGER/ADMIN)' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  getLowStock(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockAlerts(threshold);
  }

  @Get(':variantId')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get variant inventory (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('variantId') variantId: string) {
    return this.inventoryService.findOne(variantId);
  }

  @Get(':variantId/check')
  @ApiOperation({ summary: 'Check stock availability (All authenticated)' })
  checkStock(@Param('variantId') variantId: string) {
    return this.inventoryService.checkStock(variantId);
  }

  @Put(':variantId/adjust')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Adjust stock +/- (STAFF/MANAGER/ADMIN)' })
  adjustStock(@Param('variantId') variantId: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(variantId, dto);
  }

  @Put(':variantId/reserve')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Reserve stock (STAFF/MANAGER/ADMIN)' })
  reserveStock(@Param('variantId') variantId: string, @Body() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(variantId, dto);
  }

  @Put(':variantId/release')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Release reserved stock (STAFF/MANAGER/ADMIN)' })
  releaseStock(@Param('variantId') variantId: string, @Body() dto: ReserveStockDto) {
    return this.inventoryService.releaseStock(variantId, dto);
  }

  @Put(':variantId/reorder-level')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Set reorder level (MANAGER/ADMIN)' })
  setReorderLevel(@Param('variantId') variantId: string, @Body() dto: SetReorderLevelDto) {
    return this.inventoryService.setReorderLevel(variantId, dto);
  }
}
