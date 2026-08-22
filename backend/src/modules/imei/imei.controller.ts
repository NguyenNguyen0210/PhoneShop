import { Controller, Get, Post, Body, Param, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ImeiService } from './imei.service';
import { CreateImeiDto, UpdateImeiStatusDto, ImportImeiDto } from './dto/imei.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ImeiStatus } from '@prisma/client';

@ApiTags('IMEI')
@Controller('imei')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImeiController {
  constructor(private readonly imeiService: ImeiService) {}

  @Get()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'View all IMEI devices (MANAGER/ADMIN)' })
  @ApiQuery({ name: 'variantId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ImeiStatus })
  findAll(
    @Query('variantId') variantId?: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.imeiService.findAll(variantId, status);
  }

  @Get('search')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Search by IMEI number (STAFF/MANAGER/ADMIN)' })
  @ApiQuery({ name: 'imei', required: true })
  searchByImei(@Query('imei') imei: string) {
    return this.imeiService.searchByImei(imei);
  }

  @Get('check/:imei')
  @ApiOperation({ summary: 'Check IMEI availability' })
  checkAvailability(@Param('imei') imei: string) {
    return this.imeiService.checkAvailability(imei);
  }

  @Get('validate/:imei')
  @ApiOperation({ summary: 'Validate IMEI format (Luhn)' })
  validate(@Param('imei') imei: string) {
    return this.imeiService.validate(imei).then(valid => ({ imei, valid }));
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get IMEI detail (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.imeiService.findOne(id);
  }

  @Post()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Add IMEI device (STAFF/MANAGER/ADMIN)' })
  add(@Body() dto: CreateImeiDto) {
    return this.imeiService.add(dto);
  }

  @Post('import')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk import IMEI devices (STAFF/MANAGER/ADMIN)' })
  import(@Body() dto: ImportImeiDto) {
    return this.imeiService.import(dto);
  }

  @Put(':id/reserve')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Reserve IMEI device (STAFF/MANAGER/ADMIN)' })
  reserve(@Param('id') id: string) {
    return this.imeiService.reserve(id);
  }

  @Put(':id/sell')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Mark IMEI as sold (STAFF/MANAGER/ADMIN)' })
  markSold(@Param('id') id: string) {
    return this.imeiService.markSold(id);
  }

  @Put(':id/return')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Return IMEI device (STAFF/MANAGER/ADMIN)' })
  returnDevice(@Param('id') id: string) {
    return this.imeiService.returnDevice(id);
  }

  @Put(':id/block')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Block IMEI device (MANAGER/ADMIN)' })
  block(@Param('id') id: string) {
    return this.imeiService.block(id);
  }

  @Put(':id/warranty')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Set IMEI to warranty status (STAFF/MANAGER/ADMIN)' })
  warranty(@Param('id') id: string) {
    return this.imeiService.warranty(id);
  }

  @Put(':id/status')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Manually update IMEI status (MANAGER/ADMIN)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateImeiStatusDto) {
    return this.imeiService.updateStatus(id, dto);
  }
}
