import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  // --- USER ENDPOINTS ---

  @Post()
  @ApiOperation({ summary: 'Create new address for current user' })
  create(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all addresses of current user' })
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.id);
  }

  // NOTE: static route 'admin/all' must be registered BEFORE ':id',
  // otherwise 'admin/all' is captured as id='admin'.
  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all addresses (ADMIN)' })
  findAllForAdmin() {
    return this.addressesService.findAllForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address detail of current user' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address of current user' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address of current user' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.remove(user.id, id);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set address as default for current user' })
  setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.setDefault(user.id, id);
  }
}
