import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});

export type UserDto = {
  user?: any;
  userId: number;
  deptId?: number;
  roles?: any[];
  permissions?: string[];
  token?: string;
  tenantId?: number;
};
