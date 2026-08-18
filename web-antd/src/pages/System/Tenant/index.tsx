import React, { useRef, useState } from 'react';
import { Button, Space, Tooltip, message, Popconfirm, Modal } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';
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
  ProFormDateTimePicker,
} from '@ant-design/pro-components';
import { queryTenantPage, deleteTenant } from '@/services/tenant';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import CreateTenantForm from './components/CreateTenantForm';
import UpdateTenantForm from './components/UpdateTenantForm';
import TenantUsersDialog from './components/TenantUsersDialog';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteTenant(selectedRows.map((row) => row.id).join(','));
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
  const [tenantUsersVisible, setTenantUsersVisible] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<{
    id: number;
    tenant_name: string;
  }>({ id: 0, tenant_name: '' });

  const columns: ProColumns[] = [
    {
      title: <T id="page.dict.field.id" />,
      dataIndex: 'id',
      width: 80,
      hideInSearch: true,
    },
    {
      title: '租户名称',
      dataIndex: 'tenant_name',
      valueType: 'text',
      width: 150,
    },
    {
      title: '租户编码',
      dataIndex: 'tenant_code',
      valueType: 'text',
      width: 130,
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      valueType: 'text',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      valueType: 'text',
      width: 130,
      hideInSearch: true,
    },
    {
      title: '最大用户数',
      dataIndex: 'max_users',
      valueType: 'digit',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '当前用户数',
      dataIndex: 'user_count',
      valueType: 'digit',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '过期时间',
      dataIndex: 'expire_time',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: <T id="component.field.status" />,
      dataIndex: 'status',
      valueType: 'select',
      width: 90,
      valueEnum: {
        1: { text: '正常' },
        0: { text: '停用' },
      },
    },
    {
      title: <T id="component.field.createTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      width: 170,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="update" requireds={['core:tenant:update']}>
            <UpdateTenantForm
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
          <PermissionGuard key="destroy" requireds={['core:tenant:destroy']}>
            <Popconfirm
              title={<T id="component.confirm.delete" />}
              description={<T id="component.confirm.delete.desc" />}
              onConfirm={async () => {
                await handleRemove([record]);
                actionRef.current?.reloadAndRest?.();
              }}
            >
              <Tooltip title={<T id="component.tooltip.delete" />}>
                <Button type="link" size="small" icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </PermissionGuard>
          <PermissionGuard key="users" requireds={['core:tenant:read']}>
            <Tooltip title="租户用户">
              <Button
                type="link"
                size="small"
                icon={<TeamOutlined />}
                onClick={() => {
                  setCurrentTenant({
                    id: Number(record.id),
                    tenant_name: record.tenant_name || '',
                  });
                  setTenantUsersVisible(true);
                }}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const formRender = (
    <>
      <ProFormText
        name="tenant_name"
        label="租户名称"
        placeholder={t('component.form.placeholder', { label: '租户名称' })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', { label: '租户名称' }),
          },
        ]}
      />
      <ProFormText
        name="tenant_code"
        label="租户编码"
        placeholder={t('component.form.placeholder', { label: '租户编码' })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', { label: '租户编码' }),
          },
        ]}
      />
      <ProFormText
        name="contact_name"
        label="联系人"
        placeholder={t('component.form.placeholder', { label: '联系人' })}
      />
      <ProFormText
        name="contact_phone"
        label="联系电话"
        placeholder={t('component.form.placeholder', { label: '联系电话' })}
      />
      <ProFormText
        name="contact_email"
        label="联系邮箱"
        placeholder={t('component.form.placeholder', { label: '联系邮箱' })}
      />
      <ProFormDateTimePicker
        name="expire_time"
        label="到期时间"
        placeholder={t('component.form.placeholder.sel', { label: '到期时间' })}
      />
      <ProFormDigit
        name="max_users"
        label="最大用户数"
        min={0}
        fieldProps={{ precision: 0 }}
        initialValue={0}
      />
      <ProFormDigit
        name="max_depts"
        label="最大部门数"
        min={0}
        fieldProps={{ precision: 0 }}
        initialValue={0}
      />
      <ProFormDigit
        name="max_roles"
        label="最大角色数"
        min={0}
        fieldProps={{ precision: 0 }}
        initialValue={0}
      />
      <ProFormText
        name="address"
        label="地址"
        placeholder={t('component.form.placeholder', { label: '地址' })}
      />
      <ProFormText
        name="logo_url"
        label="Logo地址"
        placeholder={t('component.form.placeholder', { label: 'Logo地址' })}
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
        title: <T id="menu.system.tenant" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save" requireds={['core:tenant:save']}>
            <CreateTenantForm
              formRender={formRender}
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
        ]}
        request={async (params) => {
          const { code, list, total } = await queryTenantPage({
            ...params,
            pageNum: params.current,
            pageSize: params.pageSize,
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
          <PermissionGuard key="destroy2" requireds={['core:tenant:destroy']}>
            <Button
              onClick={async () => {
                Modal.confirm({
                  title: t('component.confirm.delete'),
                  content: t('component.confirm.delete.desc'),
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
      <TenantUsersDialog
        open={tenantUsersVisible}
        tenantId={currentTenant.id}
        tenantName={currentTenant.tenant_name}
        onClose={() => setTenantUsersVisible(false)}
      />
    </PageContainer>
  );
};
