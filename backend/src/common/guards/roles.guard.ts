import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      // AUDIT: explicit allowlist default-allow. Routes WITHOUT @Roles() are
      // intentionally public (login, register, product listing, public
      // reviews...). Do NOT flip to `false` — that would lock out every
      // public route. Protected routes must declare @Roles(...) explicitly.
      return true; // No roles required, allow access
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    const userRoles: string[] = Array.isArray(user.roles)
      ? user.roles
      : user.role
        ? [user.role]
        : [];

    if (userRoles.length === 0) {
      return false; // User not authenticated or has no roles
    }

    // Checking if user has at least one of the required roles
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
