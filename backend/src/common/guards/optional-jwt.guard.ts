import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Optional authentication: populates req.user when a valid Bearer token is
// present, but lets anonymous requests through (req.user stays undefined).
// Used by endpoints like voucher validation that personalize for logged-in
// users (server-side cart totals) while remaining usable for guests.
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
