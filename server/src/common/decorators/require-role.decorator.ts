import { SetMetadata } from '@nestjs/common';

/**
 * @RequireRole — 角色标识装饰器。
 * 标注在控制器或方法上，指定需要的角色列表。
 * 由 RolesGuard 读取。
 */
export const RequireRole = (...roles: string[]) => SetMetadata('requireRole', roles);
