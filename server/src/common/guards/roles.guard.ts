import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * RolesGuard — 角色守卫。
 * 检查当前用户是否具有 @RequireRole() 装饰器中指定的角色。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 角色守卫核心逻辑。
   * 从元数据获取 @RequireRole 指定的角色列表，检查当前用户是否拥有任一角色。
   * 用户必须包含 `roles` 数组，匹配依据为 `roleKey` 或 `roleId`。
   */
  canActivate(context: ExecutionContext): boolean {
    const requireRoles = this.reflector.getAllAndOverride<string[]>('requireRole', [
      context.getClass(),
      context.getHandler(),
    ]);

    // 没有角色要求则放行
    if (!requireRoles || requireRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 用户必须有 roles 数组
    if (!user?.roles || user.roles.length === 0) return false;

    // 检查用户角色是否包含所需角色
    return requireRoles.some((role) =>
      user.roles.some((userRole: any) => userRole.roleKey === role || userRole.roleId === +role),
    );
  }
}
