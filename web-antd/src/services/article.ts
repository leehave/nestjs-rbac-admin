import request from './_request';

// 查询文章分页列表
export const queryArticlePage = (
  params: PageField & {
    /** keyword 关键词（标题/简介/内容） */
    keyword?: string;
    /** category_id 分类ID */
    category_id?: number;
    /** author 作者 */
    author?: string;
    /** status 状态 */
    status?: number;
  },
  options?: { [key: string]: any },
) => {
  return request<API.PostPageResult>('/api/article/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 新增文章
export const addArticle = (data) => {
  return request('/api/article/create', {
    method: 'POST',
    data,
  });
};

// 删除文章（批量，body 传 ids）
export const deleteArticle = (ids: number[]) => {
  return request('/api/article/delete', {
    method: 'DELETE',
    data: { ids },
  });
};

// 修改文章
export const updateArticle = (data) => {
  return request('/api/article/update/' + data.id, {
    method: 'PUT',
    data,
  });
};

// 文章详情
export const getArticle = (id: number) => {
  return request('/api/article/detail/' + id, {
    method: 'GET',
  });
};
