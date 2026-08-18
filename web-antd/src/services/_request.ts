import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import cache from '@/utils/cache';
import { tansParams } from '@/utils/parameter';
import { Modal, message, notification } from 'antd';
import { rawT } from '@/locales';

// 是否显示重新登录
export const isRelogin = { show: false };

// 错误信息
const ERROR_MESSAGES: Record<string, string> = {
  '401': rawT('layout.res.message.401'),
  '403': '当前操作没有权限',
  '404': '访问资源不存在',
  default: '系统未知错误，请反馈给管理员',
};

// 限制存放数据5M
const LIMIT_SIZE = 5 * 1024 * 1024;

const request = <T = any>(
  url: string,
  option: Omit<AxiosRequestConfig, 'url'>,
): Promise<T> => {
  const instance = axios.create({
    timeout: import.meta.env.VITE_TIMEOUT || 30000,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  });

  instance.interceptors.request.use(
    (config) => {
      config.url = url;

      let token;
      try {
        const tokenData = cache.local.getJSON('token');
        token = tokenData?.state?.token || undefined;
      } catch {}

      if (token && !config.headers.public) {
        // 请求携带token
        config.headers['Authorization'] = 'Bearer ' + token;
      }

      // get请求映射params参数
      if (config.method === 'get' && config.params) {
        let url = config.url + '?' + tansParams(config.params);
        url = url.slice(0, -1);
        config.params = {};
        config.url = url;
      }

      // 是否需要防止数据重复提交
      const isRepeatSubmit = config.headers.repeatSubmit === false;
      if (
        !isRepeatSubmit &&
        (config.method === 'post' || config.method === 'put')
      ) {
        const payload = {
          url: config.url,
          data:
            typeof config.data === 'object'
              ? JSON.stringify(config.data)
              : config.data,
          time: new Date().getTime(),
        };
        // 请求数据大小
        const payloadSize = Object.keys(JSON.stringify(payload)).length;
        if (payloadSize >= LIMIT_SIZE) {
          console.warn(
            `[${config.url}]: ` +
              '请求数据大小超出允许的5M限制，无法进行防重复提交验证。',
          );
          return config;
        }

        const sessionObj = cache.session.getJSON('sessionObj');
        if (
          sessionObj === undefined ||
          sessionObj === null ||
          sessionObj === ''
        ) {
          cache.session.setJSON('sessionObj', payload);
        } else {
          const s_url = sessionObj.url;
          const s_data = sessionObj.data;
          const s_time = sessionObj.time;
          const interval = 1000;
          if (
            s_data === payload.data &&
            payload.time - s_time < interval &&
            s_url === payload.url
          ) {
            const message = '数据正在处理，请勿重复提交';
            console.warn(`[${s_url}]: ` + message);
            return Promise.reject(new Error(message));
          } else {
            cache.session.setJSON('sessionObj', payload);
          }
        }
      }

      return config;
    },
    (error) => {
      console.log(error);
      Promise.reject(error);
    },
  );

  instance.interceptors.response.use((response) => {
    const code = response.data.code || 200;
    const msg =
      ERROR_MESSAGES[code] || response.data.msg || ERROR_MESSAGES['default'];
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      return response.data;
    }
    if (code === 401) {
      if (!isRelogin.show) {
        isRelogin.show = true;
        Modal.confirm({
          title: '系统提示',
          content: '登录状态已过期，您可以继续留在该页面，或者重新登录',
          okText: '重新登录',
          onOk() {
            isRelogin.show = false;
            cache.local.remove('token');
            location.href = '/login';
          },
          onCancel() {
            isRelogin.show = false;
          },
        });
      }
      return Promise.reject('无效的会话，或者会话已过期，请重新登录。');
    } else if (code === 500) {
      message.error({ key: 500, content: msg });
      return Promise.reject(new Error(msg));
    } else if (code === 601) {
      message.warning({ key: 601, content: msg, type: 'warning' });
      return Promise.reject(new Error(msg));
    } else if (code !== 200) {
      notification.error({ key: 200, message: msg, description: '' });
      return Promise.reject('error');
    } else {
      // 将内部 data 字段展开到顶层，使 { code, data: { list, total } }
      // 变为 { code, list, rows, total, data }
      // 仅当 data 是普通对象时展开（数组不展开）
      // 同时将 list 映射为 rows，兼容前端 ProTable 的 rows 字段
      const res = response.data;
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        const flat = { ...res, ...res.data };
        // 服务端分页返回 list，前端 ProTable 使用 rows
        if (flat.list && !flat.rows) {
          flat.rows = flat.list;
        }
        return Promise.resolve(flat);
      }
      return Promise.resolve(res);
    }
  });

  return instance(option);
};

export default request;
