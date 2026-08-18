import request from './_request';

// 获取图形验证码
export async function queryCaptchaImage(options?: { [key: string]: any }) {
  return request<API.CaptchaImageResult>('/api/core/captcha', {
    method: 'GET',
    headers: {
      public: true,
    },
    ...(options || {}),
  });
}

// 根据用户名获取租户列表
export async function queryTenantsByUsername(username: string) {
  return request<API.TenantItem[]>('/api/core/tenants-by-username', {
    method: 'GET',
    headers: { public: true },
    params: { username },
  });
}

// 账号登录
export async function loginForAccount(
  body: API.LoginAccountParams,
  options?: { [key: string]: any },
) {
  return request<API.LoginAccountResult>('/api/core/login', {
    method: 'POST',
    headers: {
      public: true,
    },
    data: body,
    ...(options || {}),
  });
}

// 用户信息
export async function getUserInfo(options?: { [key: string]: any }) {
  return request<API.UserInfoResult>('/api/core/system/user', {
    method: 'GET',
    ...(options || {}),
  });
}
