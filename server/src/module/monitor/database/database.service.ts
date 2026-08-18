import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * 验证表名是否合法（非空且仅包含字母、数字和下划线）
   * @param tableName - 待验证的表名
   * @throws BadRequestException 表名为空或格式不正确时抛出
   */
  private validateTableName(tableName: string) {
    if (!tableName) {
      throw new BadRequestException('表名不能为空');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('表名格式不正确');
    }
  }

  /**
   * 格式化字节大小为可读字符串（支持 B、KB、MB、GB）
   * @param bytes - 字节数值
   * @returns 格式化后的字符串
   */
  private formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 100) / 100} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;
    return `${Math.round((bytes / 1024 / 1024 / 1024) * 100) / 100} GB`;
  }

  /**
   * 获取所有数据表（无分页，支持名称搜索）
   */
  async getTableList(query: Record<string, any>) {
    const name = String(query.name || '').trim();
    const rows = await this.entityManager.query('SHOW TABLE STATUS');

    const list = (rows || [])
      .map((row: Record<string, any>) => {
        const tableName = row.Name || '';
        const dataFree = Number(row.Data_free || 0);
        const dataLength = Number(row.Data_length || 0) + Number(row.Index_length || 0);

        return {
          name: tableName,
          comment: row.Comment || '',
          engine: row.Engine || '',
          rows: Number(row.Rows || 0),
          data_free: this.formatBytes(dataFree),
          data_length: this.formatBytes(dataLength),
          collation: row.Collation || '',
          create_time: formatDateTime(row.Create_time) || '',
          update_time: formatDateTime(row.Update_time) || '',
        };
      })
      .filter((item) => {
        if (!name) return true;
        return item.name.toLowerCase().includes(name.toLowerCase());
      });

    return ResultData.ok({
      list,
      total: list.length,
    });
  }

  /**
   * 获取数据源连接名称列表
   */
  async getDataSource() {
    return ResultData.ok(['mysql']);
  }

  /**
   * 获取表字段详情
   */
  async getDetailed(query: Record<string, any>) {
    const tableName = query.table || query.tableName;
    this.validateTableName(tableName);

    const rows = await this.entityManager.query(`SHOW FULL COLUMNS FROM \`${tableName}\``);
    const columns = (rows || []).map((row: Record<string, any>) => ({
      column_name: row.Field || '',
      column_type: row.Type || '',
      column_key: row.Key || '',
      is_nullable: (row.Null || '') === 'YES',
      column_default: row.Default ?? null,
      column_comment: row.Comment || '',
    }));

    return ResultData.ok({ columns });
  }

  /**
   * 获取建表语句
   */
  async getCreateSql(query: Record<string, any>) {
    const tableName = query.table || query.tableName;
    this.validateTableName(tableName);

    const rows = await this.entityManager.query(`SHOW CREATE TABLE \`${tableName}\``);
    if (!rows?.length) {
      return ResultData.ok({ table: tableName, sql: '' });
    }

    const row = rows[0];
    const sql = row['Create Table'] || row['Create View'] || '';

    return ResultData.ok({ table: tableName, sql });
  }

  /**
   * 获取回收站数据（delete_time 不为空的记录）
   */
  async getRecycleList(query: Record<string, any>) {
    const table = query.table || '';
    const page = Math.max(1, Number(query.page || query.pageNum || 1));
    const limit = Math.max(1, Number(query.limit || query.pageSize || 20));

    if (!table) {
      return ResultData.ok({ list: [], total: 0, page, limit });
    }

    this.validateTableName(table);

    const cols = await this.entityManager.query(`DESCRIBE \`${table}\``);
    const hasDeleteTime = (cols || []).some((col: Record<string, any>) => col.Field === 'delete_time');
    if (!hasDeleteTime) {
      return ResultData.ok({ list: [], total: 0, page, limit });
    }

    const countRows = await this.entityManager.query(
      `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE delete_time IS NOT NULL`,
    );
    const total = Number(countRows[0]?.cnt || 0);
    const offset = (page - 1) * limit;

    const rows = await this.entityManager.query(
      `SELECT * FROM \`${table}\` WHERE delete_time IS NOT NULL ORDER BY delete_time DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    const list = (rows || []).map((row: Record<string, any>) => ({
      id: row.id ?? null,
      delete_time: formatDateTime(row.delete_time) || row.delete_time || '',
      json_data: JSON.stringify(row),
    }));

    return ResultData.ok({
      list,
      total,
      page,
      limit,
    });
  }

  /**
   * 销毁回收站数据（物理删除）
   */
  async destroy(body: Record<string, any>) {
    const table = body.table || '';
    const ids = (body.ids || []).map((id: any) => Number(id)).filter((id: number) => !Number.isNaN(id));

    if (!table || !ids.length) {
      return ResultData.fail(400, '参数不完整');
    }

    this.validateTableName(table);
    const placeholders = ids.map(() => '?').join(',');
    await this.entityManager.query(`DELETE FROM \`${table}\` WHERE id IN (${placeholders})`, ids);

    return ResultData.ok([], '销毁成功');
  }

  /**
   * 恢复回收站数据
   */
  async recovery(body: Record<string, any>) {
    const table = body.table || '';
    const ids = (body.ids || []).map((id: any) => Number(id)).filter((id: number) => !Number.isNaN(id));

    if (!table || !ids.length) {
      return ResultData.fail(400, '参数不完整');
    }

    this.validateTableName(table);
    const placeholders = ids.map(() => '?').join(',');
    await this.entityManager.query(
      `UPDATE \`${table}\` SET delete_time = NULL WHERE id IN (${placeholders})`,
      ids,
    );

    return ResultData.ok([], '恢复成功');
  }

  /**
   * 优化表
   */
  async optimize(body: Record<string, any>) {
    const tables = body.tables || body.tableNames || [];
    if (!tables.length) {
      return ResultData.fail(400, '请选择要优化的表');
    }

    const results: Record<string, { success: boolean; message?: string }> = {};
    for (const table of tables) {
      this.validateTableName(table);
      try {
        await this.entityManager.query(`OPTIMIZE TABLE \`${table}\``);
        results[table] = { success: true };
      } catch (error) {
        results[table] = { success: false, message: (error as any)?.message || '优化失败' };
      }
    }

    return ResultData.ok(results, '优化完成');
  }

  /**
   * 清理表碎片
   */
  async fragment(body: Record<string, any>) {
    const tables = body.tables || body.tableNames || [];
    if (!tables.length) {
      return ResultData.fail(400, '请选择要清理的表');
    }

    const results: Record<string, { success: boolean; message?: string }> = {};
    for (const table of tables) {
      this.validateTableName(table);
      try {
        await this.entityManager.query(`OPTIMIZE TABLE \`${table}\``);
        await this.entityManager.query(`ANALYZE TABLE \`${table}\``);
        results[table] = { success: true };
      } catch (error) {
        results[table] = { success: false, message: (error as any)?.message || '清理失败' };
      }
    }

    return ResultData.ok(results, '清理完成');
  }
}
