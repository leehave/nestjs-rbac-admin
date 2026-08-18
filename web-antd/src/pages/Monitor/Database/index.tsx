import React, { useRef, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Tabs,
  Select,
  Tooltip,
  Popconfirm,
  App,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  ActionType,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import {
  queryDatabaseTableList,
  queryDatabaseDataSource,
  queryDatabaseDetailed,
  queryDatabaseCreateSql,
  optimizeDatabaseTable,
  fragmentDatabaseTable,
  queryDatabaseRecycleList,
  destroyRecycle,
  recoveryRecycle,
} from '@/services/monitor';
import { useT, T } from '@/locales';

const errMsg = (e: any) => {
  const m = (e as any)?.response?.data?.message || (e as any)?.message;
  return typeof m === 'string' ? m : '操作失败';
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const recycleRef = useRef<ActionType>();
  const [activeTab, setActiveTab] = useState('table');
  const [dataSource, setDataSource] = useState<string[]>([]);
  const [recycleTable, setRecycleTable] = useState<string>('');
  const [tableOptions, setTableOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedTables, setSelectedTables] = useState<any[]>([]);
  const [selectedRecycle, setSelectedRecycle] = useState<any[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailColumns, setDetailColumns] = useState<any[]>([]);
  const [detailTable, setDetailTable] = useState('');
  const [sqlVisible, setSqlVisible] = useState(false);
  const [sqlText, setSqlText] = useState('');

  const loadTableOptions = async () => {
    const res = await queryDatabaseTableList({});
    const list = res.list || res.rows || [];
    setTableOptions(list.map((row: any) => ({ label: row.name, value: row.name })));
  };

  const loadDataSource = async () => {
    try {
      const res = await queryDatabaseDataSource();
      setDataSource(res.data || res || []);
    } catch {
      setDataSource([]);
    }
  };

  const refreshAll = () => {
    actionRef.current?.reload();
    recycleRef.current?.reload();
  };

  const handleDetail = async (name: string) => {
    try {
      const res = await queryDatabaseDetailed({ table: name });
      setDetailColumns(res.columns || []);
      setDetailTable(name);
      setDetailVisible(true);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleCreateSql = async (name: string) => {
    try {
      const res = await queryDatabaseCreateSql({ table: name });
      setSqlText(res.sql || '');
      setSqlVisible(true);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleOptimize = async (tables: string[]) => {
    if (!tables.length) {
      message.warning('请先选择要优化的数据表');
      return;
    }
    try {
      await optimizeDatabaseTable({ tables });
      message.success('优化完成');
      actionRef.current?.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleFragment = async (tables: string[]) => {
    if (!tables.length) {
      message.warning('请先选择要清理的表');
      return;
    }
    try {
      await fragmentDatabaseTable({ tables });
      message.success('清理完成');
      actionRef.current?.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleDestroy = async (rows: any[]) => {
    if (!recycleTable || !rows.length) return;
    try {
      await destroyRecycle({ table: recycleTable, ids: rows.map((r) => r.id) });
      message.success('销毁成功');
      setSelectedRecycle([]);
      recycleRef.current?.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleRecovery = async (rows: any[]) => {
    if (!recycleTable || !rows.length) return;
    try {
      await recoveryRecycle({ table: recycleTable, ids: rows.map((r) => r.id) });
      message.success('恢复成功');
      setSelectedRecycle([]);
      recycleRef.current?.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const tableColumns: ProColumns[] = [
    {
      title: '表名',
      dataIndex: 'name',
      valueType: 'text',
      width: 180,
    },
    {
      title: '表注释',
      dataIndex: 'comment',
      valueType: 'text',
      ellipsis: true,
      width: 200,
    },
    {
      title: '引擎',
      dataIndex: 'engine',
      valueType: 'text',
      width: 90,
    },
    {
      title: '行数',
      dataIndex: 'rows',
      valueType: 'text',
      width: 90,
    },
    {
      title: '数据大小',
      dataIndex: 'data_length',
      valueType: 'text',
      width: 100,
    },
    {
      title: '碎片大小',
      dataIndex: 'data_free',
      valueType: 'text',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      valueType: 'text',
      width: 160,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      width: 200,
      render: (_, row) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => handleDetail(row.name)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handleCreateSql(row.name)}>
            建表语句
          </Button>
          <Popconfirm
            title={`优化表：${row.name}`}
            description="确认优化该数据表？"
            onConfirm={() => handleOptimize([row.name])}
          >
            <Button type="link" size="small">
              优化表
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`清除碎片：${row.name}`}
            description="确认清除该表碎片？"
            onConfirm={() => handleFragment([row.name])}
          >
            <Button type="link" size="small">
              清除碎片
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const recycleColumns: ProColumns[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'text',
      width: 100,
    },
    {
      title: '删除时间',
      dataIndex: 'delete_time',
      valueType: 'text',
      width: 180,
    },
    {
      title: '数据内容',
      dataIndex: 'json_data',
      valueType: 'textarea',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      width: 160,
      render: (_, row) => (
        <Space size={4} wrap>
          <Popconfirm
            title="恢复数据"
            description="确认恢复该条数据？"
            onConfirm={() => handleRecovery([row])}
          >
            <Button type="link" size="small">
              恢复
            </Button>
          </Popconfirm>
          <Popconfirm
            title="销毁数据"
            description="物理删除，确认销毁该条数据？"
            onConfirm={() => handleDestroy([row])}
          >
            <Button type="link" size="small" danger>
              销毁
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.monitor.database" />,
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (key === 'recycle') {
            loadTableOptions();
            refreshAll();
          }
        }}
        items={[
          {
            key: 'table',
            label: '数据表',
            children: (
              <ProTable
                headerTitle="数据表列表"
                actionRef={actionRef}
                rowKey="name"
                search={{ labelWidth: 'auto' }}
                toolBarRender={() => [
                  dataSource.length > 0 && (
                    <Select
                      key="ds"
                      style={{ width: 160 }}
                      value={dataSource[0]}
                      options={dataSource.map((d) => ({ label: d, value: d }))}
                      disabled
                    />
                  ),
                  <Button
                    key="refresh"
                    icon={<ReloadOutlined />}
                    onClick={refreshAll}
                  >
                    刷新
                  </Button>,
                ]}
                request={async (params) => {
                  const { code, list, total } = await queryDatabaseTableList({
                    name: params.name,
                  });
                  return {
                    data: list,
                    total,
                    success: code === 200,
                  };
                }}
                columns={tableColumns}
                pagination={false}
                rowSelection={{
                  onChange: (_, rows) => setSelectedTables(rows),
                }}
                tableAlertOptionRender={() => (
                  <Space size={8}>
                    <Button size="small" onClick={() => handleOptimize(selectedTables.map((r) => r.name))}>
                      优化表
                    </Button>
                    <Button size="small" onClick={() => handleFragment(selectedTables.map((r) => r.name))}>
                      清除碎片
                    </Button>
                  </Space>
                )}
                scroll={{ x: 1100 }}
              />
            ),
          },
          {
            key: 'recycle',
            label: '回收站',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <span>选择数据表：</span>
                    <Select
                      style={{ width: 260 }}
                      placeholder="请选择数据表"
                      showSearch
                      optionFilterProp="label"
                      value={recycleTable || undefined}
                      options={tableOptions}
                      onChange={(v) => {
                        setRecycleTable(v);
                        setSelectedRecycle([]);
                        recycleRef.current?.reload();
                      }}
                    />
                  </Space>
                </div>
                <ProTable
                  headerTitle="回收站数据"
                  actionRef={recycleRef}
                  rowKey="id"
                  search={false}
                  request={async (params) => {
                    if (!recycleTable) {
                      return { data: [], total: 0, success: true };
                    }
                    const { code, list, total } = await queryDatabaseRecycleList({
                      table: recycleTable,
                      pageNum: params.current,
                      pageSize: params.pageSize,
                    });
                    return {
                      data: list,
                      total,
                      success: code === 200,
                    };
                  }}
                  columns={recycleColumns}
                  pagination={{ defaultPageSize: 10 }}
                  rowSelection={{
                    onChange: (_, rows) => setSelectedRecycle(rows),
                  }}
                  tableAlertOptionRender={() => (
                    <Space size={8}>
                      <Button size="small" onClick={() => handleRecovery(selectedRecycle)}>
                        恢复
                      </Button>
                      <Button size="small" danger onClick={() => handleDestroy(selectedRecycle)}>
                        销毁
                      </Button>
                    </Space>
                  )}
                  scroll={{ x: 800 }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={`字段详情 - ${detailTable}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <ProTable
          rowKey="column_name"
          search={false}
          pagination={false}
          options={false}
          dataSource={detailColumns}
          columns={[
            { title: '字段名', dataIndex: 'column_name', width: 160 },
            { title: '类型', dataIndex: 'column_type', width: 160 },
            { title: '键', dataIndex: 'column_key', width: 80 },
            {
              title: '可空',
              dataIndex: 'is_nullable',
              width: 80,
              render: (_, r) => (r.is_nullable ? <Tag>YES</Tag> : <Tag color="default">NO</Tag>),
            },
            { title: '默认值', dataIndex: 'column_default', ellipsis: true, width: 120 },
            { title: '注释', dataIndex: 'column_comment', ellipsis: true },
          ]}
          scroll={{ x: 800 }}
        />
      </Modal>

      <Modal
        title="建表语句"
        open={sqlVisible}
        onCancel={() => setSqlVisible(false)}
        footer={null}
        width={820}
        destroyOnHidden
      >
        <Typography.Paragraph copyable style={{ textAlign: 'right' }} />
        <pre
          style={{
            margin: 0,
            padding: 12,
            maxHeight: 480,
            overflow: 'auto',
            background: '#f6f8fa',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {sqlText || '无数据'}
        </pre>
      </Modal>
    </PageContainer>
  );
};
