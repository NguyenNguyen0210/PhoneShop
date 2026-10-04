import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstallmentsService } from './installments.service';
import { QueryInstallmentDto, ReviewInstallmentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

function isStaffOrAdminUser(user: any): boolean {
  return (
    user?.roles?.includes(Role.ADMIN) ||
    user?.roles?.includes(Role.STAFF) ||
    user?.roles?.includes(Role.MANAGER) ||
    user?.role === Role.ADMIN ||
    user?.role === Role.STAFF ||
    user?.role === Role.MANAGER
  );
}

@ApiTags('Installments')
@Controller('installments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get('my')
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get current user installment applications' })
  getMyInstallments(@CurrentUser() user: any) {
    return this.installmentsService.getMyInstallments(user.id);
  }

  @Get('order/:orderId')
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get installment application details by order ID' })
  findByOrderId(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const checkUserId = isStaffOrAdminUser(user) ? undefined : user.id;
    return this.installmentsService.findByOrderId(orderId, checkUserId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Get all installment applications (Staff/Admin)' })
  findAll(@Query() query: QueryInstallmentDto) {
    return this.installmentsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Get installment application detail by ID (Staff/Admin)' })
  findById(@Param('id') id: string) {
    return this.installmentsService.findById(id);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Review installment application (Approve / Reject) (Staff/Admin)' })
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewInstallmentDto,
  ) {
    return this.installmentsService.review(id, user.id, dto);
  }
}

@ApiTags('Admin Installments')
@Controller('admin/installments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminInstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Get all installment applications with pagination and filters' })
  findAll(@Query() query: QueryInstallmentDto) {
    return this.installmentsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Get installment application by ID with full details' })
  findById(@Param('id') id: string) {
    return this.installmentsService.findById(id);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.STAFF, Role.MANAGER)
  @ApiOperation({ summary: 'Approve or Reject installment application' })
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewInstallmentDto,
  ) {
    return this.installmentsService.review(id, user.id, dto);
  }
}
