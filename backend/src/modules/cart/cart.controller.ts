import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto, BulkDeleteCartItemsDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/bulk')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Remove multiple items from cart' })
  removeItemsBulk(@CurrentUser() user: any, @Body() dto: BulkDeleteCartItemsDto) {
    return this.cartService.removeItemsBulk(user.id, dto.itemIds);
  }

  @Delete('items/:itemId')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete('clear')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Clear all items from cart' })
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }

  @Get('validate')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Validate cart before checkout' })
  validateCart(@CurrentUser() user: any) {
    return this.cartService.validateCart(user.id);
  }
}
