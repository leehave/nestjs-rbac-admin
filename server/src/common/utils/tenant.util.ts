import { InsertEvent, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { TenantContext } from '../tenant/tenant.context';

export function getTenantId(): number | null {
  return TenantContext.getTenantId();
}

export function applyTenantFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  column = 'tenantId',
): void {
  const tenantId = getTenantId();
  if (tenantId) {
    qb.andWhere(`${alias}.${column} = :tenantId`, { tenantId });
  }
}

export function appendTenantWhere(
  where: Record<string, any>,
  column = 'tenantId',
): Record<string, any> {
  const tenantId = getTenantId();
  if (!tenantId) return where;
  return { ...where, [column]: tenantId };
}

function shouldFillTenantId(value: unknown): boolean {
  return value == null || value === 0;
}

/** 为单条写入数据补全 tenantId */
export function withTenantId<T extends Record<string, any>>(row: T): T {
  if (TenantContext.isIgnoring()) return row;
  const tenantId = getTenantId();
  if (!tenantId || !shouldFillTenantId(row.tenantId)) return row;
  return { ...row, tenantId };
}

/** TypeORM save 前自动补全 tenantId */
export function applyTenantIdOnInsert(event: InsertEvent<any>): void {
  if (TenantContext.isIgnoring()) return;
  const tenantId = getTenantId();
  if (!tenantId || !event.entity) return;

  const hasTenantColumn = event.metadata.columns.some(
    (col) => col.propertyName === 'tenantId',
  );
  if (!hasTenantColumn) return;
  if (shouldFillTenantId(event.entity.tenantId)) {
    event.entity.tenantId = tenantId;
  }
}
