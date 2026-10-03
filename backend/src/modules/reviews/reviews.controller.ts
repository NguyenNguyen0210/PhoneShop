import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, CreateReplyDto } from './dto/review.dto';
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

  // NOTE: static routes ('product/:productId/my-review', 'admin/all') must be
  // registered BEFORE ':id', otherwise they are captured as id='product'/'admin'.
  @Get('product/:productId/my-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user review and review eligibility for a product' })
  getMyReviewStatus(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.reviewsService.getMyReviewStatus(user.id, productId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews for moderation (STAFF/MANAGER/ADMIN)' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllAdmin(
    @Query('productId') productId?: string,
    @Query('status') status?: ReviewStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.reviewsService.findAllAdmin(productId, status, pageNum, limitNum);
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

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve review (STAFF/MANAGER/ADMIN)' })
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.approve(id, user?.id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject review (STAFF/MANAGER/ADMIN)' })
  reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.reject(id, user?.id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify review as confirmed purchaser (MANAGER/ADMIN)' })
  verify(@Param('id') id: string) {
    return this.reviewsService.verify(id);
  }

  // ── M14: REPLIES ──────────────────────────────────────────

  @Post(':id/replies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review as shop staff (STAFF/MANAGER/ADMIN)' })
  createReply(
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.createReply(id, user.id, dto);
  }

  @Delete('replies/:replyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a reply (owner or staff)' })
  deleteReply(@Param('replyId') replyId: string, @CurrentUser() user: any) {
    const roles: string[] = user?.roles ?? [];
    const isStaff =
      user?.role === Role.STAFF ||
      user?.role === Role.MANAGER ||
      user?.role === Role.ADMIN ||
      roles.includes(Role.STAFF) ||
      roles.includes(Role.MANAGER) ||
      roles.includes(Role.ADMIN);
    return this.reviewsService.deleteReply(replyId, user.id, isStaff);
  }
}
