import React, { useRef, useState } from 'react';
import { Button, Space, message, Tooltip, Popconfirm, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { queryArticleCategoryPage, deleteArticleCategory } from '@/services/articleCategory';
import { PermissionGuard } from '@/components/Layout';
import CreateArticleCategoryForm from './components/CreateArticleCategoryForm';
import UpdateArticleCategoryForm from './components/UpdateArticleCategoryForm';

/**
 * 删除分类（批量，ids 逗号分隔）
 * @param selectedRows
 */
const handleRemove = async (selectedRows: any[]) => {
  const hide = message.loading('删除中...');
  if (!selectedRows) return true;
  try {
    await deleteArticleCategory(selectedRows.map((row) => row.id));
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

  const columns: ProColumns[] = [
    {
      title: '序号',
      dataIndex: 'id',
      hideInSearch: true,
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      valueType: 'text',
      width: 180,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'digit',
      width: 100,
      hideInSearch: true,
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
      title: '备注',
      dataIndex: 'remark',
      valueType: 'text',
      width: 220,
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
          <PermissionGuard key="update" requireds={['core:articleCategory:edit']}>
            <UpdateArticleCategoryForm
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
          <PermissionGuard key="destroy" requireds={['core:articleCategory:remove']}>
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
        name="name"
        label="分类名称"
        placeholder="请输入分类名称"
        rules={[
          {
            required: true,
            message: '请输入分类名称',
          },
        ]}
      />
      <ProFormDigit
        name="sort"
        label="排序"
        placeholder="请输入排序"
        initialValue={0}
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
      <ProFormTextArea name="remark" label="备注" placeholder="请输入备注" />
    </>
  );

  return (
    <PageContainer
      header={{
        title: '分类管理',
      }}
    >
      <ProTable
        headerTitle="文章分类列表"
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save" requireds={['core:articleCategory:add']}>
            <CreateArticleCategoryForm
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
          const { code, list, total } = await queryArticleCategoryPage({
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
        scroll={{ x: 1200 }}
      />
      {selectedRowsState?.length > 0 && (
        <FooterToolbar
          extra={<div>已选择 {selectedRowsState.length} 项</div>}
        >
          <PermissionGuard key="destroy2" requireds={['core:articleCategory:remove']}>
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
