import request from './_request';

// 查询插件分页列表
export const queryPluginPage = (
  params: PageField & {
    name?: string;
    status?: number;
  },
  options?: { [key: string]: any },
) => {
  return request('/api/system/plugin/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 创建插件
export const createPlugin = (data) => {
  return request('/api/system/plugin/create', {
    method: 'POST',
    data,
  });
};

// 安装插件
export const installPlugin = (data) => {
  return request('/api/system/plugin/install', {
    method: 'POST',
    data,
  });
};

// 卸载插件
export const uninstallPlugin = (name: string) => {
  return request('/api/system/plugin/uninstall', {
    method: 'POST',
    data: { name },
  });
};

// 启用插件
export const enablePlugin = (name: string) => {
  return request('/api/system/plugin/enable/' + name, {
    method: 'PUT',
  });
};

// 禁用插件
export const disablePlugin = (name: string) => {
  return request('/api/system/plugin/disable/' + name, {
    method: 'PUT',
  });
};

// 获取插件配置
export const getPluginConfig = (name: string) => {
  return request('/api/system/plugin/config/' + name, {
    method: 'GET',
  });
};

// 更新插件配置
export const updatePluginConfig = (name: string, config: string) => {
  return request('/api/system/plugin/config/' + name, {
    method: 'PUT',
    data: { config },
  });
};

// 插件诊断
export const pluginDoctor = () => {
  return request('/api/system/plugin/doctor', {
    method: 'GET',
  });
};
