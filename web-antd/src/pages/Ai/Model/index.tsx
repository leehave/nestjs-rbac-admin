import React, { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, Popconfirm, Tabs, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  ActionType,
  PageContainer,
  ProTable,
  ProColumns,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { EditFormModal } from '@/components';
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  providerOptions,
  listModels,
  createModel,
  updateModel,
  deleteModel,
} from '@/services/ai';

// 适配器类型选项（与后端 sa_ai_provider.adapter_type 保持一致）
const ADAPTER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'openai-completions', label: 'OpenAI Chat Completions' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'google-generative-ai', label: 'Google Generative AI' },
  { value: 'bedrock-converse-stream', label: 'Amazon Bedrock' },
];

const ADAPTER_TYPE_VALUE_ENUM = ADAPTER_TYPE_OPTIONS.reduce(
  (acc, { value, label }) => {
    acc[value] = { text: label };
    return acc;
  },
  {} as Record<string, { text: string }>,
);

// ── 供应商表单 ──────────────────────────────────────────
interface ProviderFormProps {
  record?: Ai.ProviderItem;
  trigger: JSX.Element;
  onFinish: () => void;
}

const ProviderForm: React.FC<ProviderFormProps> = ({ record, trigger, onFinish }) => {
  const formRender = (
    <>
      <ProFormText
        name="code"
        label="供应商编码"
        placeholder="如 openai"
        disabled={!!record}
        rules={[{ required: true, message: '请输入供应商编码' }]}
      />
      <ProFormText
        name="name"
        label="名称"
        placeholder="如 OpenAI"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormText
        name="base_url"
        label="Base URL"
        placeholder="如 https://api.openai.com/v1"
        rules={[{ required: true, message: '请输入 Base URL' }]}
      />
      <ProFormSelect
        name="adapter_type"
        label="适配器类型"
        initialValue="openai-completions"
        placeholder="请选择适配器类型"
        options={ADAPTER_TYPE_OPTIONS}
      />
      <ProFormText
        name="api_key"
        label="API Key"
        placeholder={record ? '留空则不修改' : '请输入 API Key'}
        fieldProps={{ type: 'password', autoComplete: 'new-password' }}
        rules={record ? [] : [{ required: true, message: '请输入 API Key' }]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue="1"
        options={[
          { label: '启用', value: '1' },
          { label: '停用', value: '0' },
        ]}
      />
      <ProFormDigit name="sort" label="排序" initialValue={0} fieldProps={{ precision: 0 }} />
      <ProFormTextArea name="remark" label="备注" placeholder="备注" />
    </>
  );

  return (
    <EditFormModal
      title={record ? '编辑供应商' : '新增供应商'}
      trigger={trigger}
      values={record}
      formRender={formRender}
      onFinish={async (values) => {
        try {
          if (record) {
            await updateProvider(record.id, values);
          } else {
            await createProvider(values);
          }
          message.success('保存成功');
          onFinish();
          return true;
        } catch {
          return false;
        }
      }}
    />
  );
};

// ── 模型表单 ────────────────────────────────────────────
interface ModelFormProps {
  record?: Ai.ModelItem;
  providers: Ai.ProviderOption[];
  trigger: JSX.Element;
  onFinish: () => void;
}

const ModelForm: React.FC<ModelFormProps> = ({ record, providers, trigger, onFinish }) => {
  const formRender = (
    <>
      <ProFormText
        name="name"
        label="模型名称"
        placeholder="如 GPT-4o"
        rules={[{ required: true, message: '请输入模型名称' }]}
      />
      <ProFormText
        name="model_code"
        label="模型编码"
        placeholder="如 gpt-4o"
        rules={[{ required: true, message: '请输入模型编码' }]}
      />
      <ProFormSelect
        name="provider_id"
        label="供应商"
        placeholder="请选择供应商"
        options={providers.map((p) => ({ label: p.name, value: p.id }))}
        rules={[{ required: true, message: '请选择供应商' }]}
      />
      <ProFormDigit
        name="context_window"
        label="上下文窗口"
        initialValue={32000}
        fieldProps={{ precision: 0, min: 1 }}
      />
      <ProFormDigit
        name="max_output_tokens"
        label="最大输出"
        initialValue={4096}
        fieldProps={{ precision: 0, min: 1 }}
      />
      <ProFormDigit
        name="default_temperature"
        label="默认温度"
        initialValue={0.7}
        fieldProps={{ min: 0, max: 2, step: 0.1, precision: 2 }}
      />
      <ProFormSelect
        name="is_default"
        label="默认模型"
        initialValue={0}
        options={[
          { label: '否', value: 0 },
          { label: '是', value: 1 },
        ]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue="1"
        options={[
          { label: '启用', value: '1' },
          { label: '停用', value: '0' },
        ]}
      />
      <ProFormDigit name="sort" label="排序" initialValue={0} fieldProps={{ precision: 0 }} />
      <ProFormTextArea name="remark" label="备注" placeholder="备注" />
    </>
  );

  return (
    <EditFormModal
      title={record ? '编辑模型' : '新增模型'}
      trigger={trigger}
      values={record}
      formRender={formRender}
      onFinish={async (values) => {
        try {
          if (record) {
            await updateModel(record.id, values);
          } else {
            await createModel(values);
          }
          message.success('保存成功');
          onFinish();
          return true;
        } catch {
          return false;
        }
      }}
    />
  );
};

// ── 供应商面板 ──────────────────────────────────────────
const ProviderPanel: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Ai.ProviderItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, hideInSearch: true },
    { title: '编码', dataIndex: 'code', width: 120, hideInSearch: true },
    { title: '名称', dataIndex: 'name', width: 140 },
    { title: 'Base URL', dataIndex: 'base_url', width: 220, hideInSearch: true, ellipsis: true },
    { title: '适配器', dataIndex: 'adapter_type', width: 140, hideInSearch: true, valueEnum: ADAPTER_TYPE_VALUE_ENUM },
    { title: 'API Key', dataIndex: 'api_key_masked', width: 140, hideInSearch: true, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        '1': { text: '启用', status: 'success' },
        '0': { text: '停用', status: 'error' },
      },
    },
    { title: '排序', dataIndex: 'sort', width: 80, hideInSearch: true },
    { title: '创建时间', dataIndex: 'create_time', width: 160, hideInSearch: true, valueType: 'dateTime' },
    {
      title: '操作',
      width: 100,
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <ProviderForm
              record={record}
              trigger={<Button type="link" size="small" icon={<EditOutlined />} />}
              onFinish={() => actionRef.current?.reload()}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除？"
              description="删除前请确保该供应商下无模型"
              onConfirm={async () => {
                await deleteProvider(record.id);
                message.success('删除成功');
                actionRef.current?.reloadAndRest?.();
              }}
            >
              <Button type="link" size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<Ai.ProviderItem>
      headerTitle="供应商列表"
      actionRef={actionRef}
      rowKey="id"
      toolBarRender={() => [
        <ProviderForm
          key="add"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              新增
            </Button>
          }
          onFinish={() => actionRef.current?.reload()}
        />,
      ]}
      request={async (params: any) => {
        const { current = 1, pageSize = 10, name } = params;
        const res = await listProviders({ page: current, limit: pageSize, name });
        return { data: res.list || [], total: res.total, success: res.code === 200 };
      }}
      columns={columns}
      search={{ labelWidth: 'auto' }}
      pagination={{ defaultPageSize: 10 }}
      scroll={{ x: 1200 }}
    />
  );
};

// ── 模型面板 ────────────────────────────────────────────
const ModelPanel: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [providers, setProviders] = useState<Ai.ProviderOption[]>([]);

  useEffect(() => {
    providerOptions().then((res) => setProviders(res.list || []));
  }, []);

  const columns: ProColumns<Ai.ModelItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, hideInSearch: true },
    { title: '模型名称', dataIndex: 'name', width: 140 },
    { title: '模型编码', dataIndex: 'model_code', width: 140, hideInSearch: true },
    { title: '供应商', dataIndex: 'provider_name', width: 140, hideInSearch: true },
    { title: '上下文窗口', dataIndex: 'context_window', width: 110, hideInSearch: true },
    { title: '最大输出', dataIndex: 'max_output_tokens', width: 100, hideInSearch: true },
    { title: '默认温度', dataIndex: 'default_temperature', width: 90, hideInSearch: true },
    {
      title: '默认',
      dataIndex: 'is_default',
      width: 80,
      valueEnum: {
        1: { text: '是', status: 'success' },
        0: { text: '否' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        '1': { text: '启用', status: 'success' },
        '0': { text: '停用', status: 'error' },
      },
    },
    { title: '排序', dataIndex: 'sort', width: 80, hideInSearch: true },
    {
      title: '操作',
      width: 100,
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <ModelForm
              record={record}
              providers={providers}
              trigger={<Button type="link" size="small" icon={<EditOutlined />} />}
              onFinish={() => actionRef.current?.reload()}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除？"
              description="删除后不可恢复"
              onConfirm={async () => {
                await deleteModel(record.id);
                message.success('删除成功');
                actionRef.current?.reloadAndRest?.();
              }}
            >
              <Button type="link" size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<Ai.ModelItem>
      headerTitle="模型列表"
      actionRef={actionRef}
      rowKey="id"
      toolBarRender={() => [
        <ModelForm
          key="add"
          providers={providers}
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              新增
            </Button>
          }
          onFinish={() => actionRef.current?.reload()}
        />,
      ]}
      request={async (params: any) => {
        const { current = 1, pageSize = 10, name } = params;
        const res = await listModels({ page: current, limit: pageSize, name });
        return { data: res.list || [], total: res.total, success: res.code === 200 };
      }}
      columns={columns}
      search={{ labelWidth: 'auto' }}
      pagination={{ defaultPageSize: 10 }}
      scroll={{ x: 1200 }}
    />
  );
};

// ── 页面入口 ────────────────────────────────────────────
export const Component: React.FC<unknown> = () => {
  return (
    <PageContainer header={{ title: '模型设置' }}>
      <Tabs
        defaultActiveKey="provider"
        items={[
          { key: 'provider', label: '供应商', children: <ProviderPanel /> },
          { key: 'model', label: '模型', children: <ModelPanel /> },
        ]}
      />
    </PageContainer>
  );
};
