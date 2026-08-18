import { EntityMetadata, InsertEvent, UpdateEvent } from 'typeorm';
import { applyEntityAuditOnInsert, applyEntityAuditOnUpdate } from '../utils/audit.util';
import { applyTenantIdOnInsert } from '../utils/tenant.util';

/**
 * EntityAuditSubscriber — 自动审计字段填充。
 * 在实体 save/insert/update 时自动补全 createdBy/updatedBy/createTime/updateTime/tenantId。
 */
export class EntityAuditSubscriber {
  listenTo() {
    return null; // 监听所有实体
  }

  beforeInsert(event: InsertEvent<any>): void {
    applyTenantIdOnInsert(event);
    applyEntityAuditOnInsert(event);
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    applyEntityAuditOnUpdate(event);
  }
}
