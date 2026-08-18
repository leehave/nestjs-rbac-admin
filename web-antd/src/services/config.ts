import request from './_request';

// 查询参数列表
export const queryConfigPage = (params, options?: { [key: string]: any }) => {
  return request<API.ConfigListResult>('/api/core/config/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 新增参数
export const addConfig = (data) => {
  return request<any>('/api/core/config/save', {
    method: 'POST',
    data,
  });
};

// 删除参数
export const deleteConfig = (configId) => {
  return request<any>('/api/core/config/delete?ids=' + configId, {
    method: 'DELETE',
  });
};

// 修改参数
export const updateConfig = (data) => {
  return request<any>('/api/core/config/update/' + data.id, {
    method: 'PUT',
    data,
  });
};

// 参数详情
export const getConfig = (configId) => {
  return request<any>('/api/core/config/' + configId, {
    method: 'GET',
  });
};

