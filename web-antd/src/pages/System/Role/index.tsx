import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Space,
  message,
  Dropdown,
  Tooltip,
  Col,
  Popconfirm,
  Modal,
} from 'antd';
import {
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PlusOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { queryRolePage } from '@/services/role';
import { PermissionGuard } from '@/components/Layout';
import CreateRoleForm from './components/CreateRoleForm';
import UpdateRoleForm from './components/UpdateRoleForm';
import RoleMenuScopeTree from './components/RoleMenuScopeTree';
import { queryMenuTree } from '@/services/menu';
import { deleteRole } from '@/services/role';
import { rawT, useT, T } from '@/locales';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteRole(selectedRows.map((row) => row.id).join(','));
    hide();
    message.success(rawT('component.form.message.delete.success'));
    return true;
  } catch {
    hide();
    message.error(rawT('component.form.message.delete.error'));
    return false;
  }
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const actionRef = useRef<ActionType>();
  const [selectedRowsState, setSelectedRows] = useState<API.UserInfo[]>([]);


  const columns: ProColumns[] = [
    {
      title: <T id="page.role.field.id" />,
      dataIndex: 'id',
      hideInSearch: true,
      width: 140,
    },
    {
      title: <T id="page.role.field.roleName" />,
      dataIndex: 'name',
      valueType: 'text',
      width: 140,
    },
    {
      title: <T id="page.role.field.authKey" />,
      dataIndex: 'code',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="component.field.sort" />,
      dataIndex: 'sort',
      valueType: 'text',
      width: 120,
      hideInSearch: true,
    },
    {
      title: <T id="component.field.status" />,
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        1: { text: t('dict.status.normal'), status: 'success' },
        0: { text: t('dict.status.disable'), status: 'error' },
      },
      width: 120,
    },
    {
      title: <T id="component.field.createTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 220,
    },
    {
      title: <T id="component.table.action" />,
      width: 180,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => {
        if (record.roleKey === 'admin') return;
        return (
          <Space direction="horizontal" size={16}>
            <PermissionGuard key="update" requireds={['core:role:update']}>
              <UpdateRoleForm
                values={record}
                formRender={formRender}
                trigger={
                  <Tooltip title={<T id="component.tooltip.update" />}>
                    <Button type="link" size="small" icon={<EditOutlined />} />
                  </Tooltip>
                }
                onFinish={() => {
                  actionRef.current?.reload();
                }}
              />
            </PermissionGuard>
            <PermissionGuard key="destroy" requireds={['core:role:destroy']}>
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
            <PermissionGuard key="update3" requireds={['core:role:update']}>
              <Tooltip title={<T id="page.role.authUser" />}>
                <Link to={`../role/${record.id}`}>
                  <Button type="link" size="small" icon={<UserOutlined />} />
                </Link>
              </Tooltip>
            </PermissionGuard>
          </Space>
        );
      },
    },
  ];

  const formRender = (
    <>
      <ProFormText
        name="name"
        label={<T id="page.role.field.roleName" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.role.field.roleName'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.role.field.roleName'),
            }),
          },
        ]}
      />
      <ProFormText
        name="code"
        label={<T id="page.role.field.authKey" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.role.field.authKey'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.role.field.authKey'),
            }),
          },
        ]}
      />
      <Col span={20}>
        <ProForm.Item
          name="menu_ids"
          label={<T id="page.role.field.authMenu" />}
          initialValue={[]}
        >
          <RoleMenuScopeTree
            request={async () => {
              const res = await queryMenuTree();
              return res.data;
            }}
          />
        </ProForm.Item>
      </Col>
      <ProFormDigit
        name="sort"
        label={<T id="component.field.sort" />}
        placeholder={t('component.form.placeholder', {
          label: t('component.field.sort'),
        })}
        min={1}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('component.field.sort'),
            }),
          },
        ]}
        fieldProps={{ precision: 0 }}
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
        placeholder={t('component.form.placeholder', {
          label: t('component.field.remark'),
        })}
      />
    </>
  );

  return (
    <PageContainer
      header={{
        title: <T id="menu.system.role" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard requireds={['core:role:save']} key="add">
            <CreateRoleForm
              formRender={formRender}
              trigger={
                <Button type="primary" icon={<PlusOutlined />}>
                  <T id="component.table.tool.add" />
                </Button>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>,
          <Dropdown
            key="menu"
            menu={{
              items: [
                {
                  label: <T id="component.table.tool.export" />,
                  icon: <ExportOutlined />,
                  key: 'export',
                },
              ],
            }}
          >
            <Button>
              <EllipsisOutlined />
            </Button>
          </Dropdown>,
        ]}
        request={async (params, sorter, filter) => {
          const { code, list, total } = await queryRolePage({
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
          <PermissionGuard key="destroy2" requireds={['core:role:destroy']}>
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
