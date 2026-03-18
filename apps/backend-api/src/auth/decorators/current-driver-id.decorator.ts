import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TokenPayload } from '../auth.service';

export const CurrentDriverId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: TokenPayload }>();
  const user = request.user;
  if (!user?.driverId) {
    throw new Error('CurrentDriverId used without JWT guard');
  }
  return user.driverId;
});
