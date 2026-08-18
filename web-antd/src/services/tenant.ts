import request from './_request';

// 查询租户分页列表
export const queryTenantPage = (
  params: PageField & {
    tenant_name?: string;
    tenant_code?: string;
    status?: number;
  },
  options?: { [key: string]: any },
) => {
  return request('/api/system/tenant/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 租户详情
export const getTenant = (id: number | string) => {
  return request('/api/system/tenant/detail/' + id, {
    method: 'GET',
  });
};

// 新增租户
export const addTenant = (data) => {
  return request('/api/system/tenant/create', {
    method: 'POST',
    data,
  });
};

// 修改租户
export const updateTenant = (data) => {
  return request('/api/system/tenant/update/' + data.id, {
    method: 'PUT',
    data,
  });
};

// 删除租户
export const deleteTenant = (ids: string) => {
  return request('/api/system/tenant/delete/' + ids, {
    method: 'DELETE',
  });
};

// 更新租户状态
export const updateTenantStatus = (id: number, status: number) => {
  return request('/api/system/tenant/status/' + id, {
    method: 'PUT',
    data: { status },
  });
};

// 租户下已关联用户
export const getTenantUsers = (id: number, params?: any) => {
  return request('/api/system/tenant/users/' + id, {
    method: 'GET',
    params: { ...params },
  });
};

// 可添加到租户的用户
export const getTenantAvailableUsers = (id: number, params?: any) => {
  return request('/api/system/tenant/available-users/' + id, {
    method: 'GET',
    params: { ...params },
  });
};

// 添加用户到租户
export const addTenantUsers = (id: number, userIds: number[]) => {
  return request('/api/system/tenant/add-users/' + id, {
    method: 'POST',
    data: { userIds },
  });
};

// 从租户移除用户
export const removeTenantUser = (id: number, userId: number) => {
  return request('/api/system/tenant/remove-user/' + id + '/' + userId, {
    method: 'DELETE',
  });
};

// 设置租户管理员
export const setTenantAdmin = (id: number, userId: number, isSuper: number) => {
  return request('/api/system/tenant/set-admin/' + id + '/' + userId, {
    method: 'PUT',
    data: { is_super: isSuper },
  });
};

// 设置默认租户
export const setTenantDefault = (
  id: number,
  userId: number,
  isDefault: number,
) => {
  return request('/api/system/tenant/set-default/' + id + '/' + userId, {
    method: 'PUT',
    data: { is_default: isDefault },
  });
};
