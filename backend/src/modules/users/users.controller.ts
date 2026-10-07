import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- USER ENDPOINTS ---

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  // --- ADMIN & STAFF ENDPOINTS ---

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get all users (ADMIN or STAFF for customers)' })
  findAll(@Query() query: QueryUserDto, @CurrentUser() user: any) {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get user detail (ADMIN or STAFF for customers)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user);
  }

  @Get(':id/customer-360')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get Customer 360 overview (ADMIN and STAFF)' })
  getCustomer360(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getCustomer360(id, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user (ADMIN)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.usersService.update(id, dto, user);
  }

  @Put(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate user (ADMIN)' })
  activateUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.changeStatus(id, 'ACTIVE', user);
  }

  @Put(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (ADMIN)' })
  deactivateUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.changeStatus(id, 'INACTIVE', user);
  }

  @Put(':id/ban')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ban user (ADMIN)' })
  banUser(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    if (body?.reason) {
      return this.usersService.changeStatus(id, 'BANNED', user, body.reason);
    }
    return this.usersService.changeStatus(id, 'BANNED', user);
  }
}
