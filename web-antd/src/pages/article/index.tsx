import React, { useEffect, useRef, useState } from 'react';
import { Button, Space, message, Tooltip, Popconfirm, Modal, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { queryArticlePage, deleteArticle } from '@/services/article';
import { queryAllArticleCategory } from '@/services/articleCategory';
import { PermissionGuard } from '@/components/Layout';
import { WangEdtior } from '@/components';
import CreateArticleForm from './components/CreateArticleForm';
import UpdateArticleForm from './components/UpdateArticleForm';

/**
 * 删除文章（批量，body 传 ids）
 * @param selectedRows
 */
const handleRemove = async (selectedRows: any[]) => {
  const hide = message.loading('删除中...');
  if (!selectedRows) return true;
  try {
    await deleteArticle(selectedRows.map((row) => row.id));
    hide();
    message.success('删除成功');
    return true;
  } catch {
    hide();
    message.error('删除失败');
    return false;
  }
};

export const Component: React.FC<unknown> = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRowsState, setSelectedRows] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);
  const [categoryValueEnum, setCategoryValueEnum] = useState<Record<number, { text: string }>>({});

  useEffect(() => {
    queryAllArticleCategory()
      .then((res: any) => {
        const list = res?.data ?? [];
        setCategoryOptions(list.map((c: any) => ({ label: c.name, value: c.id })));
        setCategoryValueEnum(
          list.reduce((acc: Record<number, { text: string }>, c: any) => {
            acc[c.id] = { text: c.name };
            return acc;
          }, {}),
        );
      })
      .catch(() => {});
  }, []);

  const columns: ProColumns[] = [
    {
      title: '序号',
      dataIndex: 'id',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '标题',
      dataIndex: 'title',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      valueType: 'text',
      hideInTable: true,
    },
    {
      title: '分类',
      dataIndex: 'category_id',
      valueType: 'select',
      width: 120,
      valueEnum: categoryValueEnum,
    },
    {
      title: '作者',
      dataIndex: 'author',
      valueType: 'text',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: {
        1: { text: '启用', status: 'success' },
        0: { text: '禁用', status: 'error' },
      },
    },
    {
      title: '浏览量',
      dataIndex: 'views',
      valueType: 'text',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'text',
      width: 80,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      width: 100,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="update" requireds={['core:article:update']}>
            <UpdateArticleForm
              values={record}
              formRender={formRender}
              trigger={
                <Tooltip title="编辑">
                  <Button type="link" size="small" icon={<EditOutlined />} />
                </Tooltip>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>
          <PermissionGuard key="destroy" requireds={['core:article:destroy']}>
            <Tooltip title="删除">
              <Popconfirm
                title="确认删除？"
                description="删除后不可恢复"
                onConfirm={async () => {
                  await handleRemove([record]);
                  actionRef.current?.reloadAndRest?.();
                }}
              >
                <Button type="link" size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const formRender = (
    <>
      <ProFormText
        name="title"
        label="标题"
        placeholder="请输入标题"
        rules={[
          {
            required: true,
            message: '请输入标题',
          },
        ]}
      />
      <ProFormSelect
        name="category_id"
        label="分类"
        placeholder="请选择分类"
        options={categoryOptions}
        rules={[
          {
            required: true,
            message: '请选择分类',
          },
        ]}
      />
      <ProFormText name="author" label="作者" placeholder="请输入作者" />
      <ProFormText name="image" label="封面图" placeholder="请输入封面图地址" />
      <ProFormTextArea
        name="describe"
        label="简介"
        placeholder="请输入简介"
        rules={[
          {
            required: true,
            message: '请输入简介',
          },
        ]}
      />
      <Col span={20}>
        <ProForm.Item name="content" label="内容">
          <WangEdtior />
        </ProForm.Item>
      </Col>
      <ProFormSelect
        name="is_link"
        label="是否外链"
        initialValue={2}
        options={[
          { label: '是', value: 1 },
          { label: '否', value: 2 },
        ]}
      />
      <ProFormText name="link_url" label="外链地址" placeholder="请输入外链地址" />
      <ProFormSelect
        name="is_hot"
        label="是否热门"
        initialValue={2}
        options={[
          { label: '热门', value: 1 },
          { label: '普通', value: 2 },
        ]}
      />
      <ProFormDigit
        name="sort"
        label="排序"
        placeholder="请输入排序"
        initialValue={1}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue={1}
        options={[
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ]}
      />
    </>
  );

  return (
    <PageContainer
      header={{
        title: '文章管理',
      }}
    >
      <ProTable
        headerTitle="文章列表"
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save" requireds={['core:article:save']}>
            <CreateArticleForm
              formRender={formRender}
              trigger={
                <Button type="primary" icon={<PlusOutlined />} key="add">
                  新增
                </Button>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>,
        ]}
        request={async (params, sorter, filter) => {
          const { code, list, total } = await queryArticlePage({
            ...params,
            // FIXME: remove @ts-ignore
            // @ts-ignore
            sorter,
            filter,
          });
          return {
            data: list,
            total,
            success: code === 200,
          };
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 12,
        }}
        rowSelection={{
          onChange: (_, selectedRows) => setSelectedRows(selectedRows),
        }}
        scroll={{ x: 1400 }}
      />
      {selectedRowsState?.length > 0 && (
        <FooterToolbar
          extra={<div>已选择 {selectedRowsState.length} 项</div>}
        >
          <PermissionGuard key="destroy2" requireds={['core:article:destroy']}>
            <Button
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: '删除后不可恢复',
                  onOk: async () => {
                    const ok = await handleRemove(selectedRowsState);
                    if (ok) {
                      setSelectedRows([]);
                      actionRef.current?.reloadAndRest?.();
                    }
                  },
                });
              }}
            >
              批量删除
            </Button>
          </PermissionGuard>
        </FooterToolbar>
      )}
    </PageContainer>
  );
};
