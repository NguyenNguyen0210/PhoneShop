import { Controller, Get, Post, Body, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Flash Sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get('active')
  @ApiOperation({ summary: 'Lấy chiến dịch Flash Sale đang diễn ra (Public)' })
  getActiveCampaign() {
    return this.flashSalesService.getActiveCampaign();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách chiến dịch Flash Sale (MANAGER/ADMIN)' })
  findAllAdmin(@Query('status') status?: 'ALL' | 'ACTIVE' | 'UPCOMING' | 'ENDED') {
    return this.flashSalesService.findAllAdmin(status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem chi tiết chiến dịch Flash Sale (MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.flashSalesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo chiến dịch Flash Sale mới (MANAGER/ADMIN)' })
  create(@Body() dto: CreateFlashSaleDto) {
    return this.flashSalesService.create(dto);
  }

  @Put(':id/end-early')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kết thúc sớm chiến dịch Flash Sale (MANAGER/ADMIN)' })
  endEarly(@Param('id') id: string) {
    return this.flashSalesService.endEarly(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa chiến dịch Flash Sale (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.flashSalesService.remove(id);
  }
}
