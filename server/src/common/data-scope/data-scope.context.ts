import { AsyncLocalStorage } from 'node:async_hooks';

export interface DataScopeStore {
  /** null = 无限制；Set = 过滤为这些 userId；不设置 = 未注解 @DataScope */
  userIds?: Set<number> | null;
}

/**
 * DataScopeContext — 数据权限上下文（等价 Camelus 的 PreMenuUtils.USER_PRE_GROUP ThreadLocal）。
 * 由 DataScopeInterceptor 在 @DataScope 注解的路由上解析并写入，
 * 业务服务通过 applyDataScope/getDataScopeUserIds 读取。
 */
export class DataScopeContext {
  private static readonly storage = new AsyncLocalStorage<DataScopeStore>();

  static run<T>(store: DataScopeStore, cb: () => T): T {
    return this.storage.run(store, cb);
  }

  /**
   * 三态返回：
   * - undefined：当前路由未标注 @DataScope（无数据权限语义）
   * - null：无限制（超管 / filterType=2 / is_data_permission 关闭）
   * - Set<number>：需要按这些 userId 过滤
   */
  static getUserIds(): Set<number> | null | undefined {
    return this.storage.getStore()?.userIds;
  }
}
