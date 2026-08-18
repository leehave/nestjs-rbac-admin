import { EntityMetadata, InsertEvent, UpdateEvent } from 'typeorm';
import { TenantContext } from '../tenant/tenant.context';
import { withTenantId } from './tenant.util';

export function getUserId(): number | null {
  return TenantContext.getUserId();
}

function shouldFillTimestamp(value: unknown): boolean {
  return value == null;
}

function now(): Date {
  return new Date();
}

function hasColumn(metadata: EntityMetadata, propertyName: string): boolean {
  return metadata.columns.some((col) => col.propertyName === propertyName);
}

function canApplyAudit(): boolean {
  return !TenantContext.isIgnoringAudit();
}

/** 为 insert 行数据补全审计字段 */
export function applyAuditOnInsertRow<T extends Record<string, any>>(
  row: T,
  metadata?: EntityMetadata,
): T {
  if (!canApplyAudit() || !metadata) return withTenantId(row);

  const result: Record<string, any> = withTenantId({ ...row });
  const userId = getUserId();
  const timestamp = now();

  if (userId && hasColumn(metadata, 'createdBy')) result.createdBy = userId;
  if (userId && hasColumn(metadata, 'updatedBy')) result.updatedBy = userId;
  if (hasColumn(metadata, 'createTime') && shouldFillTimestamp(result.createTime))
    result.createTime = timestamp;
  if (hasColumn(metadata, 'updateTime') && shouldFillTimestamp(result.updateTime))
    result.updateTime = timestamp;

  return result as T;
}

/** 为 update 数据补全审计字段 */
export function applyAuditOnUpdate<T extends Record<string, any>>(
  partial: T,
  metadata?: EntityMetadata,
): T {
  if (!canApplyAudit() || !metadata) return partial;

  const result: Record<string, any> = { ...partial };
  const userId = getUserId();
  const timestamp = now();

  if (userId && hasColumn(metadata, 'updatedBy')) result.updatedBy = userId;
  if (hasColumn(metadata, 'updateTime')) result.updateTime = timestamp;

  return result as T;
}

/** TypeORM save 插入前自动补全审计字段 */
export function applyEntityAuditOnInsert(event: InsertEvent<any>): void {
  if (!canApplyAudit() || !event.entity) return;

  const userId = getUserId();
  const timestamp = now();
  const { entity, metadata } = event;

  if (userId && hasColumn(metadata, 'createdBy')) entity.createdBy = userId;
  if (userId && hasColumn(metadata, 'updatedBy')) entity.updatedBy = userId;
  if (hasColumn(metadata, 'createTime') && shouldFillTimestamp(entity.createTime))
    entity.createTime = timestamp;
  if (hasColumn(metadata, 'updateTime') && shouldFillTimestamp(entity.updateTime))
    entity.updateTime = timestamp;
}

/** TypeORM save 更新前自动补全审计字段 */
export function applyEntityAuditOnUpdate(event: UpdateEvent<any>): void {
  if (!canApplyAudit() || !event.entity) return;

  const userId = getUserId();
  if (userId && hasColumn(event.metadata, 'updatedBy')) event.entity.updatedBy = userId;
  if (hasColumn(event.metadata, 'updateTime')) event.entity.updateTime = now();
}
