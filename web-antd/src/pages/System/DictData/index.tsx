import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Tooltip,
  message,
  Dropdown,
  Popconfirm,
  Modal,
  Badge,
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
  ProDescriptions,
  ProTable,
  ProColumns,
  ProDescriptionsItemProps,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useRequest } from 'ahooks';
import {
  queryDictPage,
  queryDictsByType,
  getDictType,
  deleteDict,
} from '@/services/dict';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import CreateDictDataForm from './components/CreateDictDataForm';
import UpdateDictDataForm from './components/UpdateDictDataForm';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteDict(selectedRows.map((row) => row.id).join(','));
    hide();
    message.success(rawT('component.form.message.delete.success'));
    return true;
  } catch {
    hide();
    message.success(rawT('component.form.message.delete.error'));
    return false;
  }
};

interface TableListProps {
  dictType: string;
}

const TableList: React.FC<TableListProps> = (props) => {
  const t = useT();
  const { dictType } = props;
  const actionRef = useRef<ActionType>();
  const [selectedRowsState, setSelectedRows] = useState<API.UserInfo[]>([]);

  const columns: ProColumns[] = [
    {
      title: <T id="page.dict.field.id" />,
      dataIndex: 'id',
      width: 140,
      hideInSearch: true,
    },
    {
      title: <T id="page.dict.field.dictLabel" />,
      dataIndex: 'label',
      valueType: 'text',
      width: 140,
    },
    {
      title: <T id="page.dict.field.dictValue" />,
      dataIndex: 'value',
      valueType: 'text',
      width: 180,
      hideInSearch: true,
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
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      width: 100,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="edit" requireds={['core:dict:edit']}>
            <UpdateDictDataForm
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
          <PermissionGuard key="edit2" requireds={['core:dict:edit']}>
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
        name="label"
        label={<T id="page.dict.field.dictLabel" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.dict.field.dictLabel'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.dict.field.dictLabel'),
            }),
          },
        ]}
      />
      <ProFormText
        name="value"
        label={<T id="page.dict.field.dictValue" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.dict.field.dictValue'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('page.dict.field.dictValue'),
            }),
          },
        ]}
      />
      <ProFormText
        name="i18nKey"
        label={<T id="page.dict.field.i18nKey" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.dict.field.i18nKey'),
        })}
        tooltip={<T id="page.dict.field.i18nKey.tooltip" />}
      />
      <ProFormText
        name="css_class"
        label={<T id="page.dict.field.class" />}
        placeholder={t('component.form.placeholder', {
          label: t('page.dict.field.class'),
        })}
      />
      <ProFormSelect
        name="list_class"
        label={<T id="page.dict.field.style" />}
        placeholder={t('component.form.placeholder.sel', {
          label: t('page.dict.field.style'),
        })}
        valueEnum={{
          Default: {
            text: <T id="page.dict.style.option.default" />,
            status: 'Default',
          },
          Processing: {
            text: <T id="page.dict.style.option.processing" />,
            status: 'Processing',
          },
          Success: {
            text: <T id="page.dict.style.option.success" />,
            status: 'Success',
          },
          Warning: {
            text: <T id="page.dict.style.option.warning" />,
            status: 'Warning',
          },
          Error: {
            text: <T id="page.dict.style.option.error" />,
            status: 'Error',
          },
        }}
        fieldProps={{
          optionRender: (option) => {
            const statusMap: Record<
              string,
              'default' | 'error' | 'success' | 'warning' | 'processing'
            > = {
              Default: 'default',
              Processing: 'processing',
              Success: 'success',
              Warning: 'warning',
              Error: 'error',
            };

            return (
              <Badge
                offset={[4, 0]}
                status={statusMap[String(option.value)] ?? 'default'}
                text={option.label}
              />
            );
          },
        }}
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
    <>
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="edit3" requireds={['core:dict:edit']}>
            <CreateDictDataForm
              values={{ dictType }}
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
          const { code, list, total } = await queryDictPage({
            dictType,
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
          <PermissionGuard key="edit4" requireds={['core:dict:edit']}>
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
    </>
  );
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const params = useParams();
  const navigate = useNavigate();
  const { loading, data } = useRequest(
    async () => {
      const res = await getDictType(params.dictId);
      return res.data;
    },
    {
      refreshDeps: [params.dictId],
    },
  );

  const columns: ProDescriptionsItemProps[] = [
    {
      title: <T id="page.dict.field.id" />,
      dataIndex: 'dictId',
    },
    {
      title: <T id="page.dict.field.dictName" />,
      dataIndex: 'name',
      valueType: 'text',
    },
    {
      title: <T id="page.dict.field.dictType" />,
      dataIndex: 'code',
      valueType: 'text',
    },
    {
      title: <T id="component.field.status" />,
      dataIndex: 'status',
      valueType: 'radio',
      request: async () => {
        const res = await queryDictsByType('sys_normal_disable');
        return res.data.map((dict) => ({
          label: dict.label,
          value: dict.value,
        }));
      },
    },
    {
      title: <T id="component.field.remark" />,
      dataIndex: 'remark',
      valueType: 'textarea',
    },
    {
      title: <T id="component.field.createTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.system.dictData" />,
      }}
      content={
        <ProDescriptions
          columns={columns}
          column={{ sm: 1, md: 2, lg: 2, xl: 2 }}
          loading={loading}
          dataSource={data}
        />
      }
      onBack={() => navigate(-1)}
    >
      {!!data?.dictType && <TableList dictType={data.dictType} />}
    </PageContainer>
  );
};
