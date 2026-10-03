import { Controller, Get, Query, ParseIntPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary (Admin)' })
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report in a date range (Admin)' })
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-12-31' })
  getRevenue(@Query('from') from: string, @Query('to') to: string) {
    // M11: YYYY-MM-DD validated + interpreted as VN-local days in service.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
      throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
    }
    return this.reportsService.getRevenueReport(from, to);
  }

  @Get('brand-sales')
  @ApiOperation({ summary: 'Get brand sales distribution report (Admin)' })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  getBrandSales(@Query('from') from?: string, @Query('to') to?: string) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('Both "from" and "to" must be provided');
    }
    if (from && to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new BadRequestException('Invalid date format (expected YYYY-MM-DD)');
      }
    }
    return this.reportsService.getBrandSalesReport(from, to);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products (Admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('limit') limit?: string) {
    // M11: clamp — unbounded groupBy pulled the whole sales history.
    const parsed = parseInt(limit || '10', 10);
    const safe = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 10;
    return this.reportsService.getTopSellingProducts(safe);
  }

  @Get('order-status')
  @ApiOperation({ summary: 'Get order status breakdown (Admin)' })
  getOrderStatus() {
    return this.reportsService.getOrderStatusReport();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock report (Admin)' })
  getLowStock() {
    return this.reportsService.getLowStockReport();
  }
}
