import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { DataScopeContext } from '../data-scope/data-scope.context';

/**
 * 读取当前请求解析出的数据权限 userId 集合（等价 Camelus 的 PreMenuUtils.USER_PRE_GROUP.get()）。
 * undefined = 无 @DataScope 注解；null = 无限制；Set = 需过滤。
 */
export function getDataScopeUserIds(): Set<number> | null | undefined {
  return DataScopeContext.getUserIds();
}

/**
 * 在查询构造器上应用 `create_by IN (...)` 数据权限过滤（等价 Camelus 的 SpecBuilder.in(createId, ids)）。
 * 无 @DataScope 注解或解析为无限制时不做任何事。
 * @param qb TypeORM 查询构造器
 * @param alias 查询别名（如 'entity'）
 * @param column 归属用户字段（默认 'createdBy'，对应列 created_by）
 */
export function applyDataScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  column = 'createdBy',
): void {
  const ids = DataScopeContext.getUserIds();
  if (ids === undefined || ids === null) return; // 未注解 / 无限制
  if (ids.size === 0) {
    // 自己和下属解析为空集，则一条数据都不放行
    qb.andWhere('1 = 0');
    return;
  }
  qb.andWhere(`${alias}.${column} IN (:...dataScopeUserIds)`, {
    dataScopeUserIds: [...ids],
  });
}
