import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId?: number;
  userId?: number;
  /** 跳过审计处理 */
  ignoreAudit?: boolean;
  /** 跳过租户自动填充 */
  ignoreTenant?: boolean;
}

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  static run<T>(store: TenantStore, cb: () => T): T {
    return this.storage.run(store, cb);
  }

  static getTenantId(): number | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  static getUserId(): number | null {
    return this.storage.getStore()?.userId ?? null;
  }

  static isIgnoring(): boolean {
    return !!this.storage.getStore()?.ignoreTenant;
  }

  static isIgnoringAudit(): boolean {
    return !!this.storage.getStore()?.ignoreAudit;
  }
}
