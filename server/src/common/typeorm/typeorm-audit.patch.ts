/**
 * 对 TypeORM 内部 InsertQueryBuilder / UpdateQueryBuilder 执行猴子补丁，
 * 确保通过 .values() / .set() 操作时自动注入审计字段。
 * 需在 TypeORM 加载后、任何实体操作之前调用。
 */
export function patchTypeOrmAudit(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const InsertQueryBuilder = require('typeorm/query-builder/InsertQueryBuilder').InsertQueryBuilder;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const UpdateQueryBuilder = require('typeorm/query-builder/UpdateQueryBuilder').UpdateQueryBuilder;

    if (InsertQueryBuilder?.prototype) {
      const originalValues = InsertQueryBuilder.prototype.values;
      if (originalValues) {
        InsertQueryBuilder.prototype.values = function (values: any) {
          const { applyAuditOnInsertRow } = require('../utils/audit.util');
          const patched = Array.isArray(values)
            ? values.map((v: any) => applyAuditOnInsertRow(v, this.expressionMap.mainAlias?.metadata))
            : applyAuditOnInsertRow(values, this.expressionMap.mainAlias?.metadata);
          return originalValues.call(this, patched);
        };
      }
    }

    if (UpdateQueryBuilder?.prototype) {
      const originalSet = UpdateQueryBuilder.prototype.set;
      if (originalSet) {
        UpdateQueryBuilder.prototype.set = function (value: any) {
          const { applyAuditOnUpdate } = require('../utils/audit.util');
          const patched = applyAuditOnUpdate(value, this.expressionMap.mainAlias?.metadata);
          return originalSet.call(this, patched);
        };
      }
    }
  } catch {
    // 如果补丁失败（如模块结构变更），静默跳过
  }
}
