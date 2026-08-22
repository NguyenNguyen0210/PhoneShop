import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
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
    return this.reportsService.getRevenueReport(new Date(from), new Date(to));
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products (Admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('limit') limit?: string) {
    return this.reportsService.getTopSellingProducts(limit ? parseInt(limit) : 10);
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
