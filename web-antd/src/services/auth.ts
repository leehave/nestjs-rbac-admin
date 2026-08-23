import request from './_request';

// 获取图形验证码
export const getCaptchaImage = (options?: { [key: string]: any }) =>
  request<API.CaptchaImageResult>('/api/core/captcha', {
    method: 'GET',
    headers: { public: true },
    ...(options || {}),
  });

// 根据用户名获取租户列表
export const queryTenantsByUsername = (username: string) =>
  request<API.TenantItem[]>('/api/core/tenants-by-username', {
    method: 'GET',
    headers: { public: true },
    params: { username },
  });

// 账号登录
export const loginForAccount = (
  body: API.LoginAccountParams,
  options?: { [key: string]: any },
) =>
  request<API.LoginAccountResult>('/api/core/login', {
    method: 'POST',
    headers: { public: true },
    data: body,
    ...(options || {}),
  });

// 用户信息
export const getUserInfo = (options?: { [key: string]: any }) =>
  request<API.UserInfoResult>('/api/core/system/user', {
    method: 'GET',
    ...(options || {}),
  });
