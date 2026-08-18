/** Token 过期常量 */
export const LOGIN_TOKEN_EXPIRESIN = 1000 * 60 * 60 * 24; // 24 小时
export const REFRESH_TOKEN_EXPIRESIN = 1000 * 60 * 60 * 24 * 7; // 7 天
export const ACCESS_TOKEN_EXPIRESIN = 3600; // 1 小时（秒）
export const REFRESH_TOKEN_KEY = 'refresh_tokens:';

/** 业务操作类型 */
export const BUSINESS_TYPE = {
  OTHER: '0',
  INSERT: '1',
  UPDATE: '2',
  DELETE: '3',
  GRANT: '4',
  EXPORT: '5',
  IMPORT: '6',
  FORCE_LOGOUT: '7',
  GENERATE_CODE: '8',
  CLEAN: '9',
};

/** 操作来源 */
export const OPERATOR_TYPE = {
  OTHER: '0',
  MANAGE: '1',
  MOBILE: '2',
};

/** 业务操作类型（server 兼容） */
export class BusinessType {
  public static readonly OTHER = 0;
  public static readonly INSERT = 1;
  public static readonly UPDATE = 2;
  public static readonly DELETE = 3;
  public static readonly GRANT = 4;
  public static readonly EXPORT = 5;
  public static readonly IMPORT = 6;
  public static readonly FORCE = 7;
  public static readonly GENCODE = 8;
  public static readonly CLEAN = 9;
}
