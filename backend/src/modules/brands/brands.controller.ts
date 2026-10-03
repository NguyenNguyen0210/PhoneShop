import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active brands (Public)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAllPublic(@Query('search') search?: string) {
    return this.brandsService.findAll(search, true);
  }

  // NOTE: static route 'admin/all' must be registered BEFORE ':id',
  // otherwise 'admin/all' is captured as id='admin'.
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all brands including inactive (MANAGER/ADMIN)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAllAdmin(@Query('search') search?: string) {
    return this.brandsService.findAll(search, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand detail (Public)' })
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  // --- MANAGER / ADMIN ENDPOINTS ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create brand (MANAGER/ADMIN)' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete brand (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate brand (MANAGER/ADMIN)' })
  activate(@Param('id') id: string) {
    return this.brandsService.changeStatus(id, true);
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate brand (MANAGER/ADMIN)' })
  deactivate(@Param('id') id: string) {
    return this.brandsService.changeStatus(id, false);
  }
}
