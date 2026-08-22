import { Controller, Get, Post, Body, Param, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WarrantyService } from './warranty.service';
import { CreateWarrantyDto, ClaimWarrantyDto } from './dto/warranty.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warranty')
@Controller('warranty')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  // ── USER ──────────────────────────────────────────────

  @Get('my')
  @ApiOperation({ summary: 'Get my warranties (USER)' })
  getMyWarranties(@CurrentUser() user: any) {
    return this.warrantyService.getUserWarranties(user.id);
  }

  @Get('check/:code')
  @ApiOperation({ summary: 'Check warranty by code (All)' })
  checkStatus(@Param('code') code: string) {
    return this.warrantyService.checkStatus(code);
  }

  @Get('search/:code')
  @ApiOperation({ summary: 'Search warranty by code (All)' })
  searchByCode(@Param('code') code: string) {
    return this.warrantyService.searchByCode(code);
  }

  @Post(':id/claim')
  @Roles(Role.USER, Role.ADMIN)
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
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all warranties (STAFF/MANAGER/ADMIN)' })
  findAll() {
    return this.warrantyService.findAll();
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get warranty detail (STAFF/MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.warrantyService.findOne(id);
  }

  @Post()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create warranty record (STAFF/MANAGER/ADMIN)' })
  create(@Body() dto: CreateWarrantyDto) {
    return this.warrantyService.create(dto);
  }

  @Put(':id/void')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Void warranty (MANAGER/ADMIN)' })
  voidWarranty(@Param('id') id: string) {
    return this.warrantyService.voidWarranty(id);
  }
}
