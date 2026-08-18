import { SetMetadata } from '@nestjs/common';

/**
 * @RequirePermission — 权限标识装饰器。
 * 标注在控制器或方法上，指定需要的权限标识列表。
 * 由 PermissionGuard 读取。
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata('requirePermission', permissions);
