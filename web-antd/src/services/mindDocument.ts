import request from './_request';

// ── 文档 ───────────────────────────────────────────────
// 查询知识库文档分页列表
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
  return request<API.MindDocumentPageResult>('/api/mind/document/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 上传本地文档
export const uploadMindDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request<API.MindDocumentUploadResult>('/api/mind/document/upload', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 抓取网页入库
export const uploadMindWebsite = (website: string) => {
  return request<API.MindDocumentUploadResult>('/api/mind/document/website', {
    method: 'POST',
    data: { website },
  });
};

// 批量删除文档
export const deleteMindDocument = (ids: string[]) => {
  return request<API.MindDocumentPageResult>('/api/mind/document/delete', {
    method: 'POST',
    data: { ids: ids.join(',') },
  });
};

// 批量重建索引
export const reindexMindDocument = (ids: string[]) => {
  return request<API.MindDocumentReindexResult>('/api/mind/document/reindex', {
    method: 'POST',
    data: { ids: ids.join(',') },
  });
};

// 查询文档索引进度
export const getMindIndexStatus = (ids: string[]) => {
  return request<API.MindIndexStatusResult>('/api/mind/document/index-status', {
    method: 'GET',
    params: { ids: ids.join(',') },
  });
};

// 预览文档正文
export const previewMindDocument = (
  documentName: string,
  documentType: string,
) => {
  return request<API.MindDocumentPreviewResult>('/api/mind/document/preview', {
    method: 'GET',
    params: { documentName, documentType },
  });
};

// 下载原始文件
export const downloadMindDocument = (documentName: string) => {
  return request<Blob>('/api/mind/document/download', {
    method: 'POST',
    data: { documentName },
    responseType: 'blob',
  });
};

// ── 索引队列 ───────────────────────────────────────────
// 队列控制状态
export const getMindQueueStatus = () => {
  return request<API.MindQueueStatusResult>('/api/mind/document/queue/status', {
    method: 'GET',
  });
};

// 队列健康状态
export const getMindQueueHealth = () => {
  return request<API.MindQueueHealthResult>('/api/mind/document/queue/health', {
    method: 'GET',
  });
};

// 暂停消费
export const pauseMindQueue = () => {
  return request<API.MindQueueStatusResult>('/api/mind/document/queue/pause', {
    method: 'POST',
  });
};

// 恢复消费
export const resumeMindQueue = () => {
  return request<API.MindQueueStatusResult>('/api/mind/document/queue/resume', {
    method: 'POST',
  });
};
