declare namespace API {
  type Response = {
    code: number;
    msg: string;
  };

  type PageResponse<T = any> = Response & {
    rows: T[];
    list?: T[];
    total: number;
  };

  /** 通用行数据类型（各页面 id 字段命名不一，如 jobId/userId/postId） */
  type UserInfo = {
    [key: string]: any;
  };

  /** 租户项 */
  type TenantItem = {
    id: number;
    name: string;
    is_default: boolean;
  };

  /** Result GET /api/core/captcha (拦截器已将 data 展开到顶层) */
  type CaptchaImageResult = Response & {
    result: string;
    uuid: string;
    image: string;
  };

  /** Params POST /api/core/login */
  type LoginAccountParams = {
    uuid: string;
    username: string;
    password: string;
    code: string;
    tenant_id: number;
  };

  /** Result POST /api/core/login */
  type LoginAccountResult = Response & {
    data: {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
      user: User.UserInfo['user'];
      roles: string[];
      permissions: string[];
    };
  };

  /** Result GET /api/core/system/user */
  type UserInfoResult = Response & {
    data: User.UserInfo;
  };

  /** Result GET /system/dept/list */
  type DeptListResult = Response & {
    data: Dept.Item[];
  };

  /** Result GET /system/user/deptTree */
  type DeptTreeListResult = Response & {
    data: Dept.NodeTree[];
  };

  /** Result GET /system/user/list */
  type UserPageResult = PageResponse<User.Item & { dept: Dept.Item }>;

  /** Result GET /system/role/list */
  type RolePageResult = PageResponse<Role.Item>;

  /** Result GET /system/menu/list */
  type MenuListResult = Response & {
    data: Menu.Item[];
  };

  /** Result GET /system/post/list */
  type PostPageResult = PageResponse<Post.Item>;

  /** Result GET /system/dict/type/list */
  type DictTypePageResult = PageResponse<Dict.Type>;

  /** 参数配置项 */
  type ConfigItem = {
    id: number;
    name: string;
    key: string;
    value: string;
    input_type: string;
    remark: string;
    create_time: string;
    create_by: string;
    update_time: string;
    update_by: string;
  };

  /** Result GET /api/core/config/list */
  type ConfigListResult = Response & {
    list: ConfigItem[];
    total: number;
  };
}
