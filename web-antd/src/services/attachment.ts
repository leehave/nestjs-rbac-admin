import request from './_request';

// 查询附件分页列表
export const queryAttachmentPage = (
  params: PageField & {
    category_id?: number;
    origin_name?: string;
    mime_type?: string;
  },
  options?: { [key: string]: any },
) => {
  return request('/api/system/attachment/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 上传附件
export const uploadAttachment = (data: FormData, options?: { [key: string]: any }) => {
  return request('/api/system/attachment/upload', {
    method: 'POST',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
    ...(options || {}),
  });
};

// 更新附件
export const updateAttachment = (id: number, data: Record<string, any>) => {
  return request('/api/system/attachment/update/' + id, {
    method: 'PUT',
    data,
  });
};

// 删除附件
export const deleteAttachment = (ids: number[]) => {
  return request('/api/system/attachment/delete/' + ids.join(','), {
    method: 'DELETE',
  });
};

// 移动附件
export const moveAttachment = (data: { ids: number[]; category_id: number }) => {
  return request('/api/system/attachment/move', {
    method: 'PUT',
    data,
  });
};

// 附件统计
export const getAttachmentStats = () => {
  return request('/api/system/attachment/stats', {
    method: 'GET',
  });
};

// 查询附件分类列表
export const queryAttachmentCategoryList = (params?: { tree?: boolean }) => {
  return request('/api/system/attachment-category/list', {
    method: 'GET',
    params: { ...params },
  });
};

// 创建附件分类
export const createAttachmentCategory = (data: Record<string, any>) => {
  return request('/api/system/attachment-category/create', {
    method: 'POST',
    data,
  });
};

// 更新附件分类
export const updateAttachmentCategory = (id: number, data: Record<string, any>) => {
  return request('/api/system/attachment-category/update/' + id, {
    method: 'PUT',
    data,
  });
};

// 删除附件分类
export const deleteAttachmentCategory = (id: number) => {
  return request('/api/system/attachment-category/delete/' + id, {
    method: 'DELETE',
  });
};
