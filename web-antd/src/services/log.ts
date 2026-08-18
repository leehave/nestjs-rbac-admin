import request from './_request';

// 查询操作日志分页列表
export const queryOperlogPage = (
  params: PageField & {
    operIp?: string;
    title?: string;
    operName?: string;
    businessType?: string;
    status?: string;
    beginTime?: string;
    endTime?: string;
  },
  options?: { [key: string]: any },
) => {
  return request<API.PostPageResult>('/api/core/logs/getOperLogPageList', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 删除操作日志
export const deleteOperlog = (operIds) => {
  return request('/api/core/logs/deleteOperLog', {
    method: 'DELETE',
    params: { ids: operIds },
  });
};

// 清空操作日志
export const cleanOperlog = () => {
  return request('/api/core/logs/deleteOperLog', {
    method: 'DELETE',
  });
};

// 查询登录日志分页列表
export const queryLogininforPage = (
  params: PageField & {
    ipaddr?: string;
    userName?: string;
    status?: string;
    beginTime?: string;
    endTime?: string;
  },
  options?: { [key: string]: any },
) => {
  return request<API.PostPageResult>('/api/core/logs/getLoginLogPageList', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 删除登录日志
export const deleteLogininfor = (infoIds) => {
  return request('/api/core/logs/deleteLoginLog', {
    method: 'DELETE',
    params: { ids: infoIds },
  });
};

// 清空登录日志
export const cleanLogininfor = () => {
  return request('/api/core/logs/deleteLoginLog', {
    method: 'DELETE',
  });
};
