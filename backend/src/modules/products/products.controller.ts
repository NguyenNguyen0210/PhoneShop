import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, Put, ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ProductStatus } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── PUBLIC ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get active products with filter/sort/pagination (Public)' })
  findAll(@Query() filter: FilterProductDto) {
    return this.productsService.findAll(filter, true);
  }

  // ── MANAGER / ADMIN ──────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (MANAGER/ADMIN)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products including drafts (STAFF/MANAGER/ADMIN)' })
  findAllAdmin(@Query() filter: FilterProductDto) {
    return this.productsService.findAll(filter, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail (Public)' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Put(':id/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change product status (MANAGER/ADMIN)' })
  changeStatus(
    @Param('id') id: string,
    @Param('status', new ParseEnumPipe(ProductStatus)) status: ProductStatus,
  ) {
    return this.productsService.changeStatus(id, status);
  }

  // ── VARIANTS ──────────────────────────────────────────

  @Post(':productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create variant for product (MANAGER/ADMIN)' })
  createVariant(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.productsService.createVariant(productId, dto);
  }

  @Patch(':productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant (MANAGER/ADMIN)' })
  updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(productId, variantId, dto);
  }

  @Delete(':productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete variant (MANAGER/ADMIN)' })
  removeVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.removeVariant(productId, variantId);
  }

  @Put(':productId/variants/:variantId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate variant (MANAGER/ADMIN)' })
  activateVariant(@Param('productId') productId: string, @Param('variantId') variantId: string) {
    return this.productsService.toggleVariantStatus(productId, variantId, true);
  }

  @Put(':productId/variants/:variantId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate variant (MANAGER/ADMIN)' })
  deactivateVariant(@Param('productId') productId: string, @Param('variantId') variantId: string) {
    return this.productsService.toggleVariantStatus(productId, variantId, false);
  }
}
