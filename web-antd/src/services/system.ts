import request from './_request';

// 获取系统配置
export const getSystemConfig = (options?: { [key: string]: any }) =>
  request<any>('/api/system/config/web', {
    method: 'GET',
    ...(options || {}),
  });

// 修改系统配置
export const updateSystemConfig = (data: Record<string, any>) =>
  request<any>('/api/system/config/web', {
    method: 'POST',
    data,
  });

// 获取菜单
export const getSystemMenus = (options?: { [key: string]: any }) =>
  request<any>('/api/core/system/menu', {
    method: 'GET',
    ...(options || {}),
  });

// 获取用户信息
export const getProfile = (options?: { [key: string]: any }) =>
  request<any>('/api/core/system/user', {
    method: 'GET',
    ...(options || {}),
  });

// 修改用户信息
export const updateProfile = (data: Record<string, any>) =>
  request<any>('/api/core/user/updateInfo', {
    method: 'POST',
    data,
  });

// 修改用户密码
// 后端从 query 取参，交给 axios 序列化以正确转义密码中的 & + 等字符
export const updatePwd = (params: {
  oldPassword: string;
  newPassword: string;
}) =>
  request<any>('/api/core/user/modifyPassword', {
    method: 'POST',
    params,
  });
