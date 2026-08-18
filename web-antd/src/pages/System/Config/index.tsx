import React, { useRef, useState } from 'react';
import {
  Button,
  Space,
  message,
  Dropdown,
  Tooltip,
  Popconfirm,
  Modal,
} from 'antd';
import {
  ExportOutlined,
  EllipsisOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { queryConfigPage, deleteConfig } from '@/services/config';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import CreateConfigForm from './components/CreateConfigForm';
import UpdateConfigForm from './components/UpdateConfigForm';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteConfig(selectedRows.map((row) => row.id).join(','));
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
      title: <T id="page.config.field.id" />,
      dataIndex: 'id',
      hideInSearch: true,
      width: 140,
    },
    {
      title: <T id="page.config.field.configName" />,
      dataIndex: 'name',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="page.config.field.configKey" />,
      dataIndex: 'key',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="page.config.field.configValue" />,
      dataIndex: 'value',
      valueType: 'text',
      width: 180,
      hideInSearch: true,
    },
    {
      title: <T id="page.config.field.inputType" />,
      dataIndex: 'input_type',
      valueType: 'select',
      width: 120,
      valueEnum: {
        text: { text: <T id="dict.config.inputType.text" /> },
        textarea: { text: <T id="dict.config.inputType.textarea" /> },
        select: { text: <T id="dict.config.inputType.select" /> },
        switch: { text: <T id="dict.config.inputType.switch" /> },
        number: { text: <T id="dict.config.inputType.number" /> },
        password: { text: <T id="dict.config.inputType.password" /> },
      },
    },
    {
      title: <T id="component.field.remark" />,
      dataIndex: 'remark',
      valueType: 'textarea',
      hideInSearch: true,
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
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="edit" requireds={['core:config:edit']}>
            <UpdateConfigForm
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
          <PermissionGuard key="delete" requireds={['core:config:edit']}>
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
        label={<T id="page.config.field.configName" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.config.field.configName'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.config.field.configName'),
            }),
          },
        ]}
      />
      <ProFormText
        name="key"
        label={<T id="page.config.field.configKey" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.config.field.configKey'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.config.field.configKey'),
            }),
          },
        ]}
      />
      <ProFormText
        name="value"
        label={<T id="page.config.field.configValue" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.config.field.configValue'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.config.field.configValue'),
            }),
          },
        ]}
      />
      <ProFormSelect
        name="input_type"
        label={<T id="page.config.field.inputType" />}
        initialValue="text"
        options={[
          { label: t('dict.config.inputType.text'), value: 'text' },
          { label: t('dict.config.inputType.textarea'), value: 'textarea' },
          { label: t('dict.config.inputType.select'), value: 'select' },
          { label: t('dict.config.inputType.switch'), value: 'switch' },
          { label: t('dict.config.inputType.number'), value: 'number' },
          { label: t('dict.config.inputType.password'), value: 'password' },
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
        title: <T id="menu.system.config" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save" requireds={['core:config:save']}>
            <CreateConfigForm
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
          <Button
            icon={<ReloadOutlined />}
            key="refresh"
            onClick={() => actionRef.current?.reload()}
          >
            <T id="page.config.refresh" />
          </Button>,
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
          const { code, list, total } = await queryConfigPage({
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
          <PermissionGuard key="batchDelete" requireds={['core:config:edit']}>
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
    </PageContainer>
  );
};
