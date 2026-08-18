import React, { useRef, useState } from 'react';
import { Button, Space, message, Dropdown, Tooltip, Modal } from 'antd';
import {
  ExportOutlined,
  EllipsisOutlined,
  EyeOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import { queryDictsByType } from '@/services/dict';
import { queryOperlogPage, deleteOperlog, cleanOperlog } from '@/services/log';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import ViewOperlog from './components/ViewOperlog';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteOperlog(selectedRows.map((row) => row.id).join(','));
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
      title: <T id="page.operlog.field.id" />,
      dataIndex: 'id',
      hideInSearch: true,
      width: 140,
    },
    {
      title: <T id="page.operlog.field.module" />,
      dataIndex: 'app',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="page.operlog.field.method" />,
      dataIndex: 'method',
      valueType: 'select',
      width: 180,
      request: async () => {
        const res = await queryDictsByType('sys_oper_type');
        return res.data.map((dict) => ({
          label: dict.label,
          value: dict.value,
        }));
      },
    },
    {
      title: <T id="page.operlog.field.operBy" />,
      dataIndex: 'username',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="page.operlog.field.ip" />,
      dataIndex: 'ip',
      valueType: 'text',
      width: 180,
    },
    {
      title: <T id="page.operlog.field.operStatus" />,
      dataIndex: 'status',
      hideInSearch: true,
      hideInTable: true,
      valueType: 'select',
      width: 120,
      request: async () => {
        const res = await queryDictsByType('sys_common_status');
        return res.data.map((dict) => ({
          label: dict.label,
          value: dict.value,
        }));
      },
    },
    {
      title: <T id="page.operlog.field.timer" />,
      dataIndex: 'duration',
      valueType: 'text',
      hideInSearch: true,
      width: 120,
    },
    {
      title: <T id="page.operlog.field.operTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 220,
    },
    {
      title: <T id="component.table.action" />,
      width: 60,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <ViewOperlog
            values={record}
            trigger={
              <Tooltip title={<T id="component.tooltip.detail" />}>
                <Button type="link" size="small" icon={<EyeOutlined />} />
              </Tooltip>
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.log.operlog" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="operId"
        toolBarRender={() => [
          <PermissionGuard key="deleteOper" requireds={['core:logs:deleteOper']}>
            <Button
              icon={<ClearOutlined />}
              key="clear"
              onClick={() => {
                Modal.confirm({
                  title: t('component.confirm.delete'),
                  content: t('component.confirm.delete.desc'),
                  onOk: async () => {
                    const hide = message.loading(
                      t('component.form.message.delete.loading'),
                    );
                    try {
                      await cleanOperlog();
                      hide();
                      message.success(
                        t('component.form.message.delete.success'),
                      );
                      actionRef.current?.reloadAndRest?.();
                      Promise.resolve();
                    } catch {
                      hide();
                      message.error(t('component.form.message.delete.loading'));
                      Promise.reject();
                    }
                  },
                });
              }}
            >
              <T id="page.operlog.clear" />
            </Button>
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
          const { code, list, total } = await queryOperlogPage({
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
          <PermissionGuard key="deleteOper2" requireds={['core:logs:deleteOper']}>
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
