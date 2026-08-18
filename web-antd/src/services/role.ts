import request from './_request';

// 查询角色分页列表
export const queryRolePage = (
  params: PageField & {
    // query
    /** roleName */
    roleName?: string;
    /** roleKey */
    roleKey?: string;
    /** status */
    status?: string;
    /** beginTime */
    beginTime?: string;
    /** endTime */
    endTime?: string;
  },
  options?: { [key: string]: any },
) => {
  return request<API.RolePageResult>('/api/system/role/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 查询所有角色
export const queryAllRole = () => {
  return request('/api/system/role/all', {
    method: 'GET',
  });
};

// 新增角色
export const addRole = (data) => {
  return request('/api/system/role/create', {
    method: 'POST',
    data,
  });
};

// 删除角色
export const deleteRole = (roleIds) => {
  return request<any>('/api/system/role/delete/' + roleIds, {
    method: 'DELETE',
  });
};

// 修改角色
export const updateRole = (data) => {
  return request('/api/system/role/update/' + data.id, {
    method: 'PUT',
    data,
  });
};

// 角色详情
export const getRole = (roleId) => {
  return request('/api/system/role/detail/' + roleId, {
    method: 'GET',
  });
};

// 分配菜单权限（含数据权限阈值 menu_filters）
export const assignRoleMenus = (
  roleId: number,
  data: {
    menu_ids?: number[];
    menu_filters?: Array<{ menu_id: number; filter_type: number }>;
  },
) => {
  return request('/api/system/role/assign-menus/' + roleId, {
    method: 'PUT',
    data,
  });
};

// 数据权限
export const updateDataScope = (data) => {
  return request('/api/system/role/dataScope', {
    method: 'PUT',
    data,
  });
};

// 用户授权
export const updateAuthUser = (params) => {
  return request('/api/system/role/authUser/selectAll', {
    method: 'PUT',
    params,
  });
};

// 取消用户授权
export function updateUnAuthUser(data: any) {
  return request<any>('/api/system/role/authUser/cancel', {
    method: 'PUT',
    data,
  });
}

// 批量取消用户授权
export function updateUnAuthBatchUser(params: any) {
  return request<any>('/api/system/role/authUser/cancelAll', {
    method: 'PUT',
    params,
  });
}
