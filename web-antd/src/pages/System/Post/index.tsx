import {
  Button,
  Space,
  message,
  Tooltip,
  Dropdown,
  Popconfirm,
  Modal,
} from 'antd';
import {
  ExportOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
} from '@ant-design/pro-components';
import React, { useRef, useState } from 'react';
import { queryPostPage, deletePost } from '@/services/post';
import { queryDictsByType } from '@/services/dict';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import CreatePostForm from './components/CreatePostForm';
import UpdatePostForm from './components/UpdatePostForm';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deletePost(selectedRows.map((row) => row.id).join(','));
    hide();
    message.success(rawT('component.form.message.delete.success'));
    return true;
  } catch {
    hide();
    message.success(rawT('component.form.message.delete.error'));
    return false;
  }
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const actionRef = useRef<ActionType>();
  const [selectedRowsState, setSelectedRows] = useState<API.UserInfo[]>([]);

  const columns: ProColumns[] = [
    {
      title: <T id="page.post.field.id" />,
      dataIndex: 'id',
      hideInSearch: true,
      hideInForm: true,
    },
    {
      title: <T id="page.post.field.postKey" />,
      dataIndex: 'code',
      valueType: 'text',
      width: 160,
    },
    {
      title: <T id="page.post.field.postName" />,
      dataIndex: 'name',
      valueType: 'text',
      width: 160,
    },
    {
      title: <T id="component.field.sort" />,
      dataIndex: 'sort',
      valueType: 'digit',
      width: 120,
      initialValue: 0,
      hideInSearch: true,
    },
    {
      title: <T id="component.field.status" />,
      dataIndex: 'status',
      valueType: 'select',
      width: 120,
      request: async () => {
        const res = await queryDictsByType('sys_normal_disable');
        return res.data.map((dict) => ({
          label: dict.label,
          value: dict.value,
        }));
      },
    },
    {
      title: <T id="component.field.createTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 220,
    },
    {
      title: <T id="component.table.action" />,
      width: 100,
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="update" requireds={['core:post:update']}>
            <Tooltip title={<T id="component.tooltip.update" />}>
              <UpdatePostForm
                values={record}
                formRender={formRender}
                trigger={
                  <Button type="link" size="small" icon={<EditOutlined />} />
                }
                onFinish={() => {
                  actionRef.current?.reload();
                }}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard key="destroy" requireds={['core:post:destroy']}>
            <Tooltip title={<T id="component.tooltip.delete" />}>
              <Popconfirm
                title={<T id="component.confirm.delete" />}
                description={<T id="component.confirm.delete.desc" />}
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
        label={<T id="page.post.field.postName" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.post.field.postName'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.post.field.postName'),
            }),
          },
        ]}
      />
      <ProFormText
        name="code"
        label={<T id="page.post.field.postKey" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.post.field.postKey'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.post.field.postKey'),
            }),
          },
        ]}
      />
      <ProFormDigit
        name="sort"
        label={<T id="component.field.sort" />}
        placeholder={t('component.field.sort.placeholder')}
        min={0}
        fieldProps={{ precision: 0 }}
        rules={[
          { required: true, message: t('component.field.sort.placeholder') },
        ]}
      />
      <ProFormSelect
        name="status"
        label={<T id="component.field.status" />}
        initialValue={1}
        options={[
          { label: t('dict.status.normal'), value: 1 },
          { label: t('dict.status.disable'), value: 0 },
        ]}
      />
      <ProFormTextArea
        name="remark"
        label={<T id="component.field.remark" />}
        placeholder={t('component.field.remark.placeholder')}
      />
    </>
  );

  return (
    <PageContainer
      header={{
        title: <T id="menu.system.post" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save" requireds={['core:post:save']}>
            <CreatePostForm
              formRedner={formRender}
              trigger={
                <Button type="primary" icon={<PlusOutlined />} key="add">
                  <T id="component.table.tool.add" />
                </Button>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>,
          <Dropdown
            menu={{
              items: [
                {
                  label: <T id="component.table.tool.export" />,
                  icon: <ExportOutlined />,
                  key: 'export',
                },
              ],
            }}
            key="menu"
          >
            <Button>
              <EllipsisOutlined />
            </Button>
          </Dropdown>,
        ]}
        request={async (params, sorter, filter) => {
          const { code, list, total } = await queryPostPage({
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
      />
      {selectedRowsState?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              <T
                id="component.table.selection"
                values={{
                  num: (
                    <a style={{ fontWeight: 600 }}>
                      {selectedRowsState.length}
                    </a>
                  ),
                }}
              />
            </div>
          }
        >
          <PermissionGuard key="destroy2" requireds={['core:post:destroy']}>
            <Button
              onClick={async () => {
                Modal.confirm({
                  title: t('component.confirm.delete'),
                  content: t('component.confirm.delete.select.desc'),
                  onOk: async () => {
                    const ok = await handleRemove(selectedRowsState);
                    if (ok) {
                      setSelectedRows([]);
                      actionRef.current?.reloadAndRest?.();
                      Promise.resolve();
                    } else {
                      Promise.reject();
                    }
                  },
                });
              }}
            >
              <T id="component.table.tool.batchdelete" />
            </Button>
          </PermissionGuard>
        </FooterToolbar>
      )}
    </PageContainer>
  );
};
