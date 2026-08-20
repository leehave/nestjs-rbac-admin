import React, { useRef, useState, useEffect } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  Popconfirm,
  App,
  Tooltip,
  Progress,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  InboxOutlined,
  GlobalOutlined,
  EyeOutlined,
  DownloadOutlined,
  PauseOutlined,
  CaretRightOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import {
  queryMindDocumentPage,
  uploadMindDocument,
  uploadMindWebsite,
  deleteMindDocument,
  reindexMindDocument,
  previewMindDocument,
  downloadMindDocument,
  getMindQueueStatus,
  getMindQueueHealth,
  pauseMindQueue,
  resumeMindQueue,
} from '@/services/mindDocument';
import { useT, T } from '@/locales';

const { Text } = Typography;

// 索引状态 -> 展示标签
const INDEX_STATUS_MAP: Record<string, { color: string; label: string }> = {
  done: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
  pending: { color: 'warning', label: '等待中' },
  processing: { color: 'processing', label: '处理中' },
  queued: { color: 'default', label: '已入队' },
  paused: { color: 'default', label: '已暂停' },
};

const renderIndexStatus = (record: any) => {
  const status = record?.index_status || (record?.status === 1 ? 'done' : 'pending');
  const meta = INDEX_STATUS_MAP[status] || { color: 'default', label: status || '-' };
  const progress = Number(record?.index_progress ?? (record?.status === 1 ? 100 : 0));
  const message = record?.index_message;
  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      <Tag color={meta.color}>{meta.label}</Tag>
      {progress > 0 && progress < 100 && (
        <Progress percent={progress} size="small" style={{ width: 120 }} />
      )}
      {message ? (
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: message }}>
          {message}
        </Text>
      ) : null}
    </Space>
  );
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // 上传文档
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 上传网站
  const [websiteVisible, setWebsiteVisible] = useState(false);
  const [websiteSubmitting, setWebsiteSubmitting] = useState(false);
  const [websiteForm] = Form.useForm();

  // 预览
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewName, setPreviewName] = useState('');

  // 队列状态
  const [queue, setQueue] = useState<any>({});
  const [queueLoading, setQueueLoading] = useState(false);

  const reloadAll = () => {
    actionRef.current?.reload();
    loadQueue();
  };

  const loadQueue = async () => {
    try {
      const [status, health] = await Promise.all([getMindQueueStatus(), getMindQueueHealth()]);
      setQueue({ ...status, ...health });
    } catch {
      // 忽略队列状态加载失败
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleUpload = (file: File) => {
    return uploadMindDocument(file)
      .then(() => {
        message.success('上传成功，正在后台索引');
        reloadAll();
      })
      .catch(() => {
        message.error('上传失败');
        throw new Error('上传失败');
      });
  };

  const handleWebsite = async () => {
    const values = await websiteForm.validateFields();
    setWebsiteSubmitting(true);
    try {
      await uploadMindWebsite(values.website);
      message.success('上传成功，正在后台索引');
      setWebsiteVisible(false);
      websiteForm.resetFields();
      reloadAll();
    } finally {
      setWebsiteSubmitting(false);
    }
  };

  const handlePreview = async (row: any) => {
    setPreviewName(row.document_name);
    setPreviewVisible(true);
    setPreviewLoading(true);
    try {
      const res: any = await previewMindDocument(row.document_name, row.document_type);
      setPreviewContent(res || '');
    } catch {
      setPreviewContent('');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (row: any) => {
    try {
      const blob: any = await downloadMindDocument(row.document_name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const handleRemove = async (rows: any[]) => {
    await deleteMindDocument(rows.map((r) => r.id));
    message.success('删除成功');
    setSelectedRows([]);
    reloadAll();
  };

  const handleReindex = async (rows: any[]) => {
    const res: any = await reindexMindDocument(rows.map((r) => r.id));
    message.success(`已加入队列 ${res?.queued ?? rows.length} 个文档`);
    reloadAll();
  };

  const handleToggleQueue = async () => {
    setQueueLoading(true);
    try {
      if (queue?.paused) {
        await resumeMindQueue();
        message.success('队列已恢复');
      } else {
        await pauseMindQueue();
        message.success('队列已暂停');
      }
      await loadQueue();
    } finally {
      setQueueLoading(false);
    }
  };

  const columns: ProColumns[] = [
    {
      title: '文档名',
      dataIndex: 'document_name',
      valueType: 'text',
      ellipsis: true,
      width: 220,
    },
    {
      title: '类型',
      dataIndex: 'document_type',
      valueType: 'text',
      width: 100,
      hideInSearch: true,
      render: (_, row) =>
        row.document_type ? <Tag>{String(row.document_type).toUpperCase()}</Tag> : '-',
    },
    {
      title: '大小(MB)',
      dataIndex: 'document_size',
      valueType: 'text',
      width: 90,
      hideInSearch: true,
      render: (_, row) => (row.document_size != null ? `${row.document_size} MB` : '-'),
    },
    {
      title: '知识库编号',
      dataIndex: 'library_number',
      valueType: 'text',
      width: 120,
      hideInSearch: true,
      render: (_, row) => row.library_number || '-',
    },
    {
      title: '索引状态',
      dataIndex: 'index_status',
      valueType: 'text',
      width: 150,
      hideInSearch: true,
      render: (_, row) => renderIndexStatus(row),
    },
    {
      title: '分析状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      hideInSearch: true,
      valueEnum: {
        1: { text: '已完成', status: 'Success' },
        0: { text: '未完成', status: 'Default' },
      },
    },
    {
      title: '摘要',
      dataIndex: 'document_summary',
      valueType: 'text',
      width: 200,
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '上传时间',
      dataIndex: 'upload_time',
      valueType: 'dateTime',
      width: 170,
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
          <Tooltip title="预览">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(row)}
            >
              预览
            </Button>
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(row)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            onClick={() => handleReindex([row])}
          >
            重索引
          </Button>
          <Popconfirm
            title="删除文档"
            description="确认删除该文档？"
            onConfirm={() => handleRemove([row])}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '知识库管理' }}>
      <ProTable
        headerTitle="文档列表"
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <Button
            key="upload"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadVisible(true)}
          >
            上传文档
          </Button>,
          <Button
            key="website"
            icon={<GlobalOutlined />}
            onClick={() => setWebsiteVisible(true)}
          >
            上传网站
          </Button>,
          <Tooltip
            key="queue"
            title={`队列长度 ${queue?.queue_length ?? 0} · 待处理 ${queue?.enqueued_count ?? 0} · Worker ${
              queue?.worker_connected ? '已连接' : '未连接'
            }`}
          >
            <Button
              icon={queue?.paused ? <CaretRightOutlined /> : <PauseOutlined />}
              loading={queueLoading}
              onClick={handleToggleQueue}
            >
              {queue?.paused ? '恢复队列' : '暂停队列'}
            </Button>
          </Tooltip>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={reloadAll}>
            刷新
          </Button>,
        ]}
        request={async (params) => {
          const res: any = await queryMindDocumentPage({
            current_page: params.current,
            page_size: params.pageSize,
            document_name: params.document_name,
            document_type: params.document_type,
            upload_time: params.upload_time,
          });
          return {
            data: res.records || [],
            total: res.total || 0,
            success: true,
          };
        }}
        columns={columns}
        pagination={{ defaultPageSize: 10 }}
        rowSelection={{
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        scroll={{ x: 1300 }}
      />

      {selectedRows?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              <T
                id="component.table.selection"
                values={{ num: <a style={{ fontWeight: 600 }}>{selectedRows.length}</a> }}
              />
            </div>
          }
        >
          <Button
            icon={<SyncOutlined />}
            onClick={() => handleReindex(selectedRows)}
          >
            批量重索引
          </Button>
          <Button
            onClick={async () => {
              Modal.confirm({
                title: t('component.confirm.delete'),
                content: t('component.confirm.delete.desc'),
                onOk: () => handleRemove(selectedRows),
              });
            }}
          >
            <T id="component.table.tool.batchdelete" />
          </Button>
        </FooterToolbar>
      )}

      {/* 上传文档 */}
      <Modal
        title="上传文档"
        open={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Upload.Dragger
          multiple
          showUploadList
          accept="*"
          customRequest={({ file, onSuccess, onError }) => {
            setUploading(true);
            handleUpload(file as File)
              .then(() => onSuccess?.({}))
              .catch((e) => onError?.(e))
              .finally(() => setUploading(false));
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持单个或批量上传，上传后自动进入索引队列</p>
        </Upload.Dragger>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button
            type="primary"
            loading={uploading}
            onClick={() => {
              setUploadVisible(false);
              reloadAll();
            }}
          >
            完成
          </Button>
        </div>
      </Modal>

      {/* 上传网站 */}
      <Modal
        title="上传网站"
        open={websiteVisible}
        onCancel={() => setWebsiteVisible(false)}
        onOk={handleWebsite}
        confirmLoading={websiteSubmitting}
        width={520}
        destroyOnHidden
      >
        <Form form={websiteForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="website"
            label="网址"
            rules={[
              { required: true, message: '请输入网址' },
              { type: 'url', message: '请输入合法的 URL' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览 */}
      <Modal
        title={`预览 - ${previewName}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <div
          style={{
            maxHeight: '60vh',
            overflow: 'auto',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            padding: 16,
            marginTop: 16,
          }}
        >
          {previewLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中…</div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {previewContent || '（无预览内容）'}
            </pre>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};
