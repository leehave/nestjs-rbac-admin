import { SetMetadata } from '@nestjs/common';

/**
 * @DataScope — 数据权限装饰器（等价 Camelus 的 @PreRequestMenu）。
 * 标注在控制器方法上，指定触发数据权限解析的菜单权限标识（slug）。
 * 由 DataScopeInterceptor 读取。
 */
export const DataScope = (...slugs: string[]) => SetMetadata('dataScopeSlugs', slugs);
