import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, ValidateVoucherDto } from './dto/voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('active')
  @ApiOperation({ summary: 'View active public vouchers' })
  findPublicActive() {
    return this.vouchersService.findAll(true);
  }

  @Post('validate')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Validate and calculate discount for a voucher' })
  validate(@Req() req: any, @Body() dto: ValidateVoucherDto) {
    // M3: OptionalJwtGuard populates req.user only when a valid token is
    // sent — authenticated quotes use the server-side cart, guests keep the
    // estimate path. Never 401s here.
    const userId = req.user?.id;
    return this.vouchersService.validate(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View available vouchers (USER/MANAGER/ADMIN)' })
  findAllActive(@CurrentUser() user: any) {
    const showAll = user.roles.includes(Role.MANAGER) || user.roles.includes(Role.ADMIN);
    return this.vouchersService.findAll(!showAll);
  }

  // ── MANAGER / ADMIN ──────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create voucher (MANAGER/ADMIN)' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Get('analytics/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thống kê tổng quan voucher (MANAGER/ADMIN)' })
  getSummaryAnalytics() {
    return this.vouchersService.getSummaryAnalytics();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get voucher detail (MANAGER/ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update voucher (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete voucher (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate voucher (MANAGER/ADMIN)' })
  activate(@Param('id') id: string) {
    return this.vouchersService.changeStatus(id, true);
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate voucher (MANAGER/ADMIN)' })
  deactivate(@Param('id') id: string) {
    return this.vouchersService.changeStatus(id, false);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View voucher usage (MANAGER/ADMIN)' })
  viewUsage(@Param('id') id: string) {
    return this.vouchersService.viewUsage(id);
  }
}
