import request from './_request';

// 查询文章分类分页列表
export const queryArticleCategoryPage = (
  params: PageField & {
    /** name 分类名称 */
    name?: string;
    /** status 状态 */
    status?: number;
  },
  options?: { [key: string]: any },
) => {
  return request<API.PostPageResult>('/api/article/category/list', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
};

// 查询所有启用的分类（下拉选项）
export const queryAllArticleCategory = () => {
  return request('/api/article/category/enabled', {
    method: 'GET',
  });
};

// 新增分类
export const addArticleCategory = (data) => {
  return request('/api/article/category/create', {
    method: 'POST',
    data,
  });
};

// 删除分类（批量，ids 逗号分隔）
export const deleteArticleCategory = (ids: number[]) => {
  return request('/api/article/category/delete/' + ids.join(','), {
    method: 'DELETE',
  });
};

// 修改分类
export const updateArticleCategory = (data) => {
  return request('/api/article/category/update/' + data.id, {
    method: 'PUT',
    data,
  });
};

// 分类详情
export const getArticleCategory = (id: number) => {
  return request('/api/article/category/detail/' + id, {
    method: 'GET',
  });
};
