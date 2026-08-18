/** Redis 缓存键前缀枚举 */
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
