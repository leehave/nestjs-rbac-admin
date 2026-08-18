import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { applyAuditOnInsertRow, applyAuditOnUpdate } from '../utils/audit.util';

/**
 * TypeOrmAuditBootstrap — 在应用启动时修补 TypeORM Repository 方法，
 * 确保通过 repository.insert / repository.update / queryBuilder 操作时
 * 也能自动注入审计字段。
 */
@Injectable()
export class TypeOrmAuditBootstrap implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 模块初始化入口，在数据源就绪后执行修补
   */
  onModuleInit(): void {
    // 延迟到连接就绪后再修补
    if (this.dataSource.isInitialized) {
      this.patch();
    } else {
      this.dataSource.initialize().then(() => this.patch());
    }
  }

  /**
   * 修补 repository.insert 和 repository.update 方法，
   * 在插入/更新前自动注入审计字段（createdBy/updatedBy/createTime/updateTime）
   */
  private patch(): void {
    const repoPrototype = this.dataSource.getRepository('').constructor.prototype;

    // 修补 repository.insert
    const originalInsert = repoPrototype.insert;
    if (originalInsert) {
      repoPrototype.insert = async function (entityOrEntities: any, ...args: any[]) {
        const metadata = this.metadata;
        const entities = Array.isArray(entityOrEntities)
          ? entityOrEntities.map((e: any) => applyAuditOnInsertRow(e, metadata))
          : applyAuditOnInsertRow(entityOrEntities, metadata);
        return originalInsert.call(this, entities, ...args);
      };
    }

    // 修补 repository.update
    const originalUpdate = repoPrototype.update;
    if (originalUpdate) {
      repoPrototype.update = async function (criteria: any, partialEntity: any, ...args: any[]) {
        const metadata = this.metadata;
        const patched = applyAuditOnUpdate(partialEntity, metadata);
        return originalUpdate.call(this, criteria, patched, ...args);
      };
    }
  }
}
