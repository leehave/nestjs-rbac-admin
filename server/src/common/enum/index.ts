/** 状态枚举 */
export enum StatusEnum {
  NORMAL = '0',
  STOP = '1',
}

/** 性别枚举 */
export enum SexEnum {
  MAN = '0',
  WOMAN = '1',
}

/** 删除标记枚举 */
export enum DelFlagEnum {
  NORMAL = '0',
  DELETE = '2',
}

/** 数据范围枚举 */
export enum DataScopeEnum {
  DATA_SCOPE_ALL = '1',
  DATA_SCOPE_CUSTOM = '2',
  DATA_SCOPE_DEPT = '3',
  DATA_SCOPE_DEPT_AND_CHILD = '4',
  DATA_SCOPE_SELF = '5',
}

/** 排序规则 */
export enum SortRuleEnum {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

/** 菜单类型枚举 */
export enum MenuTypeEnum {
  /** 目录 */
  DIR = 'M',
  /** 菜单 */
  MENU = 'C',
  /** 按钮 */
  BUTTON = 'F',
}

/** 缓存键前缀 */
export enum CacheEnum {
  LOGIN_TOKEN_KEY = 'login_tokens:',
  CAPTCHA_CODE_KEY = 'captcha_codes:',
  SYS_CONFIG_KEY = 'sys_config:',
  SYS_DICT_KEY = 'sys_dict:',
  REPEAT_SUBMIT_KEY = 'repeat_submit:',
  RATE_LIMIT_KEY = 'rate_limit:',
  CRON_LOCK_KEY = 'cron:lock:',
  PWD_ERR_CNT_KEY = 'pwd_err_cnt:',
  GZ_TYPE = 'gz_type:',
  MA_CODE = 'ma_code:',
  SYS_USER_KEY = 'user:',
  SYS_DEPT_KEY = 'sys_dept:',
  SYS_MENU_KEY = 'sys_menu:',
}
