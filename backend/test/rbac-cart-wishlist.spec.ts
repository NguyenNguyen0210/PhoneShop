import { Reflector } from '@nestjs/core';
import { CartController } from '../src/modules/cart/cart.controller';
import { WishlistController } from '../src/modules/wishlist/wishlist.controller';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { Role } from '../src/common/enums/role.enum';

describe('RBAC - Cart & Wishlist for Staff/Manager (PR #4.1)', () => {
  const reflector = new Reflector();

  it('CartController các endpoint phải cho phép Role.STAFF và Role.MANAGER', () => {
    const methods = [
      'getCart',
      'addItem',
      'updateItem',
      'removeItem',
      'clearCart',
      'removeItemsBulk',
      'validateCart',
    ];
    methods.forEach((methodName) => {
      const roles = reflector.get<string[]>(ROLES_KEY, (CartController.prototype as any)[methodName]);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.STAFF);
      expect(roles).toContain(Role.MANAGER);
      expect(roles).toContain(Role.USER);
      expect(roles).toContain(Role.ADMIN);
    });
  });

  it('WishlistController class/method phải cho phép Role.STAFF và Role.MANAGER', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, WishlistController);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.USER);
    expect(roles).toContain(Role.ADMIN);
  });
});
