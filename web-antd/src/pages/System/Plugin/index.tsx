import React, { useRef, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Popconfirm,
  App,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import {
  queryPluginPage,
  createPlugin,
  installPlugin,
  uninstallPlugin,
  enablePlugin,
  disablePlugin,
  getPluginConfig,
  updatePluginConfig,
  pluginDoctor,
} from '@/services/plugin';
import { useT, T } from '@/locales';

const statusTag = (status: number) => {
  if (status === 2) return <Tag color="success">已启用</Tag>;
  if (status === 1) return <Tag color="warning">已安装</Tag>;
  return <Tag>未安装</Tag>;
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [createVisible, setCreateVisible] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [doctorVisible, setDoctorVisible] = useState(false);
  const [doctorText, setDoctorText] = useState('');
  const [createForm] = Form.useForm();

  const handleInstall = async (row: any) => {
    await installPlugin({
      name: row.name,
      title: row.title,
      description: row.description,
      version: row.version,
      author: row.author,
    });
    message.success('安装成功');
    actionRef.current?.reload();
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    await createPlugin({ ...values, version: values.version || '1.0.0' });
    message.success('插件创建成功');
    setCreateVisible(false);
    createForm.resetFields();
    actionRef.current?.reload();
  };

  const openConfig = async (name: string) => {
    const res = await getPluginConfig(name);
    setConfigName(name);
    setConfigText(JSON.stringify(res.data ?? {}, null, 2));
    setConfigVisible(true);
  };

  const saveConfig = async () => {
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(configText || '{}');
    } catch {
      message.error('配置 JSON 格式不正确');
      return;
    }
    await updatePluginConfig(configName, JSON.stringify(parsed));
    message.success('配置已保存');
    setConfigVisible(false);
  };

  const openDoctor = async () => {
    const res = await pluginDoctor();
    setDoctorText(JSON.stringify(res.data ?? {}, null, 2));
    setDoctorVisible(true);
  };

  const columns: ProColumns[] = [
    {
      title: '名称',
      dataIndex: 'name',
      valueType: 'text',
      width: 140,
    },
    {
      title: '标题',
      dataIndex: 'title',
      valueType: 'text',
      width: 160,
    },
    {
      title: '版本',
      dataIndex: 'version',
      valueType: 'text',
      width: 100,
    },
    {
      title: '作者',
      dataIndex: 'author',
      valueType: 'text',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'text',
      width: 100,
      render: (_, row) => statusTag(row.status),
    },
    {
      title: <T id="component.table.action" />,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      width: 300,
      render: (_, row) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openConfig(row.name)}>
            配置
          </Button>
          {row.status === 0 && (
            <Popconfirm
              title={`安装插件：${row.name}`}
              description="确认安装该插件？"
              onConfirm={() => handleInstall(row)}
            >
              <Button type="link" size="small">
                安装
              </Button>
            </Popconfirm>
          )}
          {row.status === 1 && (
            <Popconfirm
              title={`启用插件：${row.name}`}
              description="确认启用该插件？"
              onConfirm={async () => {
                await enablePlugin(row.name);
                message.success('启用成功');
                actionRef.current?.reload();
              }}
            >
              <Button type="link" size="small">
                启用
              </Button>
            </Popconfirm>
          )}
          {row.status === 2 && (
            <Popconfirm
              title={`禁用插件：${row.name}`}
              description="确认禁用该插件？"
              onConfirm={async () => {
                await disablePlugin(row.name);
                message.success('禁用成功');
                actionRef.current?.reload();
              }}
            >
              <Button type="link" size="small">
                禁用
              </Button>
            </Popconfirm>
          )}
          {row.status !== 0 && (
            <Popconfirm
              title={`卸载插件：${row.name}`}
              description="确认卸载该插件？"
              onConfirm={async () => {
                await uninstallPlugin(row.name);
                message.success('卸载成功');
                actionRef.current?.reload();
              }}
            >
              <Button type="link" size="small" danger>
                卸载
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.system.plugin" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="name"
        search={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateVisible(true)}
          >
            新建插件
          </Button>,
          <Button
            key="doctor"
            icon={<ToolOutlined />}
            onClick={openDoctor}
          >
            插件诊断
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            刷新
          </Button>,
        ]}
        request={async (params) => {
          const { code, list, total } = await queryPluginPage({
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
        pagination={false}
      />

      <Modal
        title="新建插件"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        width={520}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入插件名称' }]}
          >
            <Input placeholder="如 blog-center" />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入插件标题' }]}
          >
            <Input placeholder="如 博客中心" />
          </Form.Item>
          <Form.Item name="version" label="版本" initialValue="1.0.0">
            <Input placeholder="如 1.0.0" />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input placeholder="作者名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="插件描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="插件配置"
        open={configVisible}
        onCancel={() => setConfigVisible(false)}
        onOk={saveConfig}
        width={760}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          插件：{configName}
        </Typography.Paragraph>
        <Input.TextArea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          rows={18}
          style={{ fontFamily: 'monospace' }}
          placeholder="请输入 JSON 配置"
        />
      </Modal>

      <Modal
        title="插件诊断"
        open={doctorVisible}
        onCancel={() => setDoctorVisible(false)}
        onOk={openDoctor}
        okText="刷新诊断"
        width={980}
        destroyOnHidden
      >
        <Input.TextArea
          value={doctorText}
          readOnly
          rows={22}
          style={{ fontFamily: 'monospace' }}
          placeholder="诊断结果将显示在这里"
        />
      </Modal>
    </PageContainer>
  );
};
