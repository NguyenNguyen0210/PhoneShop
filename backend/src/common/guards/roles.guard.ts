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
    
    if (!user || !user.roles) {
      return false; // User not authenticated or has no roles
    }

    // Assuming user.roles is an array of role names from the JWT payload
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
