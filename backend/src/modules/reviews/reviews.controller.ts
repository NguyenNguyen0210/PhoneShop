import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewStatus } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── PUBLIC ────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get approved reviews (Public)' })
  @ApiQuery({ name: 'productId', required: false })
  findAll(@Query('productId') productId?: string) {
    return this.reviewsService.findAll(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review detail (Public)' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // ── USER ──────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review (USER)' })
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review (USER)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review (USER)' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.reviewsService.remove(user.id, id, isAdmin);
  }

  // ── STAFF / MANAGER / ADMIN ──────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews for moderation (STAFF/MANAGER/ADMIN)' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
  findAllAdmin(
    @Query('productId') productId?: string,
    @Query('status') status?: ReviewStatus,
  ) {
    return this.reviewsService.findAllAdmin(productId, status);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve review (STAFF/MANAGER/ADMIN)' })
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject review (STAFF/MANAGER/ADMIN)' })
  reject(@Param('id') id: string) {
    return this.reviewsService.reject(id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify review as confirmed purchaser (MANAGER/ADMIN)' })
  verify(@Param('id') id: string) {
    return this.reviewsService.verify(id);
  }
}
