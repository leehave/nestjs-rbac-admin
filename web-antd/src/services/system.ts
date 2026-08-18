import request from './_request';

// 获取系统配置
export async function getSystemConfig(options?: { [key: string]: any }) {
  return request<any>('/api/system/config/web', {
    method: 'GET',
    ...(options || {}),
  });
}

// 修改系统配置
export async function updateSystemConfig(data) {
  return request<any>('/api/system/config/web', {
    method: 'POST',
    data,
  });
}

// 获取菜单
export async function getSystemMenus(options?: { [key: string]: any }) {
  return request<any>('/api/core/system/menu', {
    method: 'GET',
    ...(options || {}),
  });
}

// 获取用户信息
export async function getProfile(options?: { [key: string]: any }) {
  return request<any>('/api/core/system/user', {
    method: 'GET',
    ...(options || {}),
  });
}

// 修改用户信息
export async function updateProfile(data) {
  return request<any>('/api/core/user/updateInfo', {
    method: 'POST',
    data,
  });
}

// 修改用户密码
export async function updatePwd({ oldPassword, newPassword }) {
  return request<any>(
    '/api/core/user/modifyPassword?oldPassword=' +
      oldPassword +
      '&newPassword=' +
      newPassword,
    {
      method: 'POST',
    },
  );
}
