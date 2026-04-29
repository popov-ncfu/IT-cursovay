import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  // Keep the default Passport error handling; this override just ensures
  // we can extend behavior later if needed.
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

