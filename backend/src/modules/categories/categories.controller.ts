import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active categories (Public)' })
  findAllPublic() {
    return this.categoriesService.findAll(true);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree (Public)' })
  getTreePublic() {
    return this.categoriesService.getTree(true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category detail (Public)' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // --- MANAGER / ADMIN ENDPOINTS ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (MANAGER/ADMIN)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories including inactive (MANAGER/ADMIN)' })
  findAllAdmin() {
    return this.categoriesService.findAll(false);
  }

  @Get('admin/tree')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete category tree (MANAGER/ADMIN)' })
  getTreeAdmin() {
    return this.categoriesService.getTree(false);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate category (MANAGER/ADMIN)' })
  activate(@Param('id') id: string) {
    return this.categoriesService.changeStatus(id, true);
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate category (MANAGER/ADMIN)' })
  deactivate(@Param('id') id: string) {
    return this.categoriesService.changeStatus(id, false);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
