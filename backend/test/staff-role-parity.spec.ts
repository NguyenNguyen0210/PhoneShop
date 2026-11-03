import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Role } from '../src/common/enums/role.enum';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('Staff Role & Roles Array Authorization Invariants', () => {
  let jwtStrategy: JwtStrategy;
  let rolesGuard: RolesGuard;
  let prisma: any;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn((key) => (key === 'JWT_SECRET' ? 'test-secret' : null)),
    } as any;

    jwtStrategy = new JwtStrategy(configService, prisma);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe('JwtStrategy payload extraction', () => {
    it('INVARIANT: should extract roles array AND set primary role for staff', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'staff-1',
        email: 'staff@phoneshop.vn',
        status: 'ACTIVE',
        roles: [
          { role: { name: 'USER' } },
          { role: { name: 'STAFF' } },
        ],
      });

      const result = await jwtStrategy.validate({ sub: 'staff-1', email: 'staff@phoneshop.vn' });

      expect(result).toBeDefined();
      expect(result.id).toBe('staff-1');
      expect(result.roles).toEqual(['USER', 'STAFF']);
      expect(result.role).toBe('STAFF'); // Primary role derived correctly
    });

    it('INVARIANT: should reject inactive or banned users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'banned-1',
        email: 'banned@phoneshop.vn',
        status: 'BANNED',
        roles: [{ role: { name: 'USER' } }],
      });

      await expect(
        jwtStrategy.validate({ sub: 'banned-1', email: 'banned@phoneshop.vn' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('RolesGuard verification', () => {
    function createMockContext(user: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
    }

    it('INVARIANT: should allow STAFF to access STAFF or ADMIN protected endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STAFF, Role.ADMIN]);

      const staffUser = { id: 'staff-1', roles: ['USER', 'STAFF'], role: 'STAFF' };
      const context = createMockContext(staffUser);

      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('INVARIANT: should block standard USER from accessing STAFF or ADMIN protected endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STAFF, Role.ADMIN]);

      const normalUser = { id: 'user-1', roles: ['USER'], role: 'USER' };
      const context = createMockContext(normalUser);

      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('INVARIANT: should allow access when no roles are required (public routes)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const context = createMockContext(null);
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });
});
