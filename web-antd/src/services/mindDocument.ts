import request from './_request';

// 知识库文档分页列表
export const queryMindDocumentPage = (
  params: PageField & {
    current_page?: number;
    page_size?: number;
    document_name?: string;
    document_type?: string;
    upload_time?: string;
  },
  options?: { [key: string]: any },
) => {
  return request('/api/mind/document/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 上传文档（文件）
export const uploadMindDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/mind/document/upload', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 上传网站（网页抓取入库）
export const uploadMindWebsite = (website: string) => {
  return request('/api/mind/document/website', {
    method: 'POST',
    data: { website },
  });
};

// 批量删除文档（body 传逗号分隔 ids）
export const deleteMindDocument = (ids: string[]) => {
  return request('/api/mind/document/delete', {
    method: 'POST',
    data: { ids: ids.join(',') },
  });
};

// 重新索引（body 传逗号分隔 ids）
export const reindexMindDocument = (ids: string[]) => {
  return request('/api/mind/document/reindex', {
    method: 'POST',
    data: { ids: ids.join(',') },
  });
};

// 获取文档索引状态（ids 逗号分隔）
export const getMindIndexStatus = (ids: string[]) => {
  return request('/api/mind/document/index-status', {
    method: 'GET',
    params: { ids: ids.join(',') },
  });
};

// 索引队列控制状态
export const getMindQueueStatus = () => {
  return request('/api/mind/document/queue/status', { method: 'GET' });
};

// 索引队列健康状态
export const getMindQueueHealth = () => {
  return request('/api/mind/document/queue/health', { method: 'GET' });
};

// 暂停索引队列
export const pauseMindQueue = () => {
  return request('/api/mind/document/queue/pause', { method: 'POST' });
};

// 恢复索引队列
export const resumeMindQueue = () => {
  return request('/api/mind/document/queue/resume', { method: 'POST' });
};

// 预览文档内容
export const previewMindDocument = (documentName: string, documentType: string) => {
  return request('/api/mind/document/preview', {
    method: 'GET',
    params: { documentName, documentType },
  });
};

// 下载原始文件（返回 blob）
export const downloadMindDocument = (documentName: string) => {
  return request('/api/mind/document/download', {
    method: 'POST',
    data: { documentName },
    responseType: 'blob',
  });
};
