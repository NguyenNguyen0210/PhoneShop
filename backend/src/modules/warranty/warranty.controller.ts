import { Controller, Get, Post, Body, Param, UseGuards, Put, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WarrantyService } from './warranty.service';
import { CreateWarrantyDto, ClaimWarrantyDto, RepairWarrantyDto } from './dto/warranty.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warranty')
@Controller('warranty')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  // ── PUBLIC LOOKUP ─────────────────────────────────────

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup warranty by IMEI, serial, or code (Public)' })
  @ApiQuery({ name: 'imei', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'query', required: false, type: String })
  lookup(
    @Query('imei') imei?: string,
    @Query('code') code?: string,
    @Query('query') query?: string,
  ) {
    const term = imei || code || query;
    if (!term || !term.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã IMEI, serial hoặc mã bảo hành');
    }
    return this.warrantyService.searchByCode(term);
  }

  @Get('check/:code')
  @ApiOperation({ summary: 'Check warranty by code or IMEI (Public)' })
  checkStatus(@Param('code') code: string) {
    return this.warrantyService.checkStatus(code);
  }

  @Get('search/:code')
  @ApiOperation({ summary: 'Search warranty by code, IMEI, or serial (Public)' })
  searchByCode(@Param('code') code: string) {
    return this.warrantyService.searchByCode(code);
  }

  // ── USER ──────────────────────────────────────────────

  @Get('my/lookup-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  lookupMyPhone(@CurrentUser() user: any, @Query('phone') phone: string) {
    if (!phone) throw new BadRequestException('Phone is required');
    return this.warrantyService.lookupMyPhone(user.id, phone);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my warranties (USER)' })
  getMyWarranties(@CurrentUser() user: any) {
    return this.warrantyService.getUserWarranties(user.id);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim warranty (USER)' })
  claimWarranty(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ClaimWarrantyDto,
  ) {
    return this.warrantyService.claimWarranty(user.id, id, dto);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all warranties (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.warrantyService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get warranty detail (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.warrantyService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create warranty record (STAFF/MANAGER/ADMIN)' })
  create(@Body() dto: CreateWarrantyDto) {
    return this.warrantyService.create(dto);
  }

  @Put(':id/repair/:step')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  repair(@Param('id') id: string, @Param('step') step: string,
    @Body() dto: RepairWarrantyDto, @CurrentUser() user: any) {
    if (step !== 'receive' && step !== 'repair' && step !== 'return') {
      throw new BadRequestException('Unknown repair action');
    }
    return this.warrantyService.advanceRepair(id, step, dto, user.id);
  }

  @Put(':id/void')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Void warranty (MANAGER/ADMIN)' })
  voidWarranty(@Param('id') id: string) {
    return this.warrantyService.voidWarranty(id);
  }
}
