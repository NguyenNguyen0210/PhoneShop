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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, SetReorderLevelDto, ReserveStockDto } from './dto/inventory.dto';
import { GetStockLedgerDto } from './dto/stock-movement.dto';
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
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.inventoryService.findAll(page, limit);
  }

  @Get('ledger')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get stock ledger movements and financial summary' })
  getLedger(@Query() query: GetStockLedgerDto) {
    return this.inventoryService.getLedger(query);
  }

  @Get('ledger/daily-summary')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get daily in/out cash flow and quantity summary' })
  getDailySummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.inventoryService.getDailySummary({ startDate, endDate });
  }

  @Get('ledger/export')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Export stock ledger to CSV' })
  async exportLedger(@Query() query: GetStockLedgerDto, @Res() res: Response) {
    const csv = await this.inventoryService.exportLedgerCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="so-kho-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('variants/:variantId/ledger')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get individual variant stock ledger' })
  getVariantLedger(
    @Param('variantId') variantId: string,
    @Query() query: GetStockLedgerDto
  ) {
    return this.inventoryService.getLedger({ ...query, variantId });
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
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Check stock availability (STAFF+)' })
  checkStock(@Param('variantId') variantId: string) {
    return this.inventoryService.checkStock(variantId);
  }

  @Put(':variantId/adjust')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Adjust stock +/- (STAFF/MANAGER/ADMIN)' })
  adjustStock(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustStockDto,
    @Req() req: any
  ) {
    return this.inventoryService.adjustStock(variantId, dto, req.user?.id);
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
