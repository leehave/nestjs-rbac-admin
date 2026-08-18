import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * PermissionGuard — 权限守卫。
 * 检查当前用户是否具有 @RequirePermission() 装饰器中指定的权限标识。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 权限守卫核心逻辑。
   * 从元数据获取 @RequirePermission 指定的权限列表，检查当前用户是否拥有任一权限。
   * 管理员（isAdmin / isSuper === 1）或拥有 `*:*:*` 通配符权限的用户自动放行。
   */
  canActivate(context: ExecutionContext): boolean {
    const requirePermissions = this.reflector.getAllAndOverride<string[]>('requirePermission', [
      context.getClass(),
      context.getHandler(),
    ]);

    // 没有权限要求则放行
    if (!requirePermissions || requirePermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 管理员放行
    if (user?.user?.isAdmin || user?.user?.isSuper === 1) return true;
    if (user?.permissions?.includes('*:*:*')) return true;

    // 检查权限
    if (!user?.permissions || user.permissions.length === 0) return false;

    return requirePermissions.some((perm) => user.permissions.includes(perm));
  }
}
