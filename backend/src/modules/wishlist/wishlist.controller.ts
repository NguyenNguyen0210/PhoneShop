import { Controller, Get, Post, Body, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto, MoveToCartDto } from './dto/wishlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(Role.USER, Role.ADMIN)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get wishlist' })
  getWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to wishlist' })
  addProduct(@CurrentUser() user: any, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addProduct(user.id, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeProduct(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.removeProduct(user.id, productId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all items from wishlist' })
  clearWishlist(@CurrentUser() user: any) {
    return this.wishlistService.clearWishlist(user.id);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  checkProduct(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.checkProduct(user.id, productId);
  }

  @Post('items/:productId/move-to-cart')
  @ApiOperation({ summary: 'Move product from wishlist to cart' })
  moveToCart(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
    @Body() dto?: MoveToCartDto,
  ) {
    return this.wishlistService.moveToCart(user.id, productId, dto?.variantId ?? variantId);
  }
}
