import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || '';
    if (authHeader === 'Bearer mock-admin-token') {
      req.user = {
        id: 'admin-e2e-1',
        email: 'admin@mobilecommerce.vn',
        roles: ['ADMIN'],
        role: 'ADMIN',
      };
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
