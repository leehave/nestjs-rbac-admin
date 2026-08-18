import request from './_request';

// ── 供应商 ─────────────────────────────────────────────
export const listProviders = (params: { page?: number; limit?: number; name?: string }) =>
  request<API.AiProviderPageResult>('/api/ai/admin/providers/list', {
    method: 'GET',
    params,
  });

export const createProvider = (data: Record<string, any>) =>
  request('/api/ai/admin/providers/create', { method: 'POST', data });

export const updateProvider = (id: string, data: Record<string, any>) =>
  request('/api/ai/admin/providers/update/' + id, { method: 'PUT', data });

export const deleteProvider = (id: string) =>
  request('/api/ai/admin/providers/delete/' + id, { method: 'DELETE' });

export const providerOptions = () =>
  request<API.AiProviderOptionsResult>('/api/ai/admin/providers/options', { method: 'GET' });

// ── 模型 ───────────────────────────────────────────────
export const listModels = (params: { page?: number; limit?: number; name?: string }) =>
  request<API.AiModelPageResult>('/api/ai/admin/models/list', {
    method: 'GET',
    params,
  });

export const createModel = (data: Record<string, any>) =>
  request('/api/ai/admin/models/create', { method: 'POST', data });

export const updateModel = (id: string, data: Record<string, any>) =>
  request('/api/ai/admin/models/update/' + id, { method: 'PUT', data });

export const deleteModel = (id: string) =>
  request('/api/ai/admin/models/delete/' + id, { method: 'DELETE' });

// ── 会话 ───────────────────────────────────────────────
export const listSessions = (params: { page?: number; limit?: number }) =>
  request<API.AiSessionListResult>('/api/ai/sessions', { method: 'GET', params });

export const createSession = (data: { model_id?: string; title?: string }) =>
  request<API.AiSessionCreateResult>('/api/ai/sessions', { method: 'POST', data });

export const listMessages = (uuid: string) =>
  request<API.AiMessageListResult>('/api/ai/sessions/' + uuid + '/messages', { method: 'GET' });

export const updateSessionTitle = (uuid: string, title: string) =>
  request('/api/ai/sessions/' + uuid + '/title', { method: 'PATCH', data: { title } });

export const updateSessionModel = (uuid: string, model_id: string) =>
  request('/api/ai/sessions/' + uuid + '/model', { method: 'PATCH', data: { model_id } });

export const deleteSession = (uuid: string) =>
  request('/api/ai/sessions/' + uuid, { method: 'DELETE' });

// ── 选项 ───────────────────────────────────────────────
export const modelOptions = () =>
  request<API.AiModelOptionsResult>('/api/ai/models/options', { method: 'GET' });
