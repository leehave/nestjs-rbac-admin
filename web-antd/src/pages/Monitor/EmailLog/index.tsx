import React, { useRef, useState } from 'react';
import { Button, Space, Tag, Tooltip, message, Popconfirm, Modal } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import { queryEmailLogPage, deleteEmailLog } from '@/services/monitor';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteEmailLog(selectedRows.map((row) => row.id));
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
      title: <T id="page.dict.field.id" />,
      dataIndex: 'id',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '服务Host',
      dataIndex: 'gateway',
      valueType: 'text',
      width: 140,
      hideInSearch: true,
    },
    {
      title: '发件人',
      dataIndex: 'from',
      valueType: 'text',
      width: 150,
    },
    {
      title: '收件人',
      dataIndex: 'email',
      valueType: 'text',
      width: 150,
    },
    {
      title: '验证码',
      dataIndex: 'code',
      valueType: 'text',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '发送状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: {
        success: { text: '成功' },
        fail: { text: '失败' },
      },
      render: (_, row) =>
        ['success', '1', 1].includes(row.status) ? (
          <Tag color="success">成功</Tag>
        ) : (
          <Tag color="error">失败</Tag>
        ),
    },
    {
      title: '发送结果',
      dataIndex: 'response',
      valueType: 'textarea',
      width: 180,
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '发送时间',
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      width: 80,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="destroy" requireds={['core:email:destroy']}>
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
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.monitor.emailLog" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          const { code, list, total } = await queryEmailLogPage({
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
          <PermissionGuard key="destroy2" requireds={['core:email:destroy']}>
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
