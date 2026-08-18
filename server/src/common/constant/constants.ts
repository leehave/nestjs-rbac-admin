/**
 * 自定义装饰器在 Reflect 元数据里使用的 key，需与守卫里读取的 key 一致。
 * IS_PUBLIC_KEY — JwtAuthGuard 放行
 * PERMISSION_KEY — PermissionGuard 取权限码
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSION_KEY = 'permission';
