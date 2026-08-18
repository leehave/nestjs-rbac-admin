import React, { useRef, useState, useEffect } from 'react';
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Image,
  Popconfirm,
  App,
  Tooltip,
} from 'antd';
import { PlusOutlined, ReloadOutlined, InboxOutlined, FolderOutlined } from '@ant-design/icons';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import {
  queryAttachmentPage,
  uploadAttachment,
  updateAttachment,
  deleteAttachment,
  moveAttachment,
  getAttachmentStats,
  queryAttachmentCategoryList,
  createAttachmentCategory,
  updateAttachmentCategory,
  deleteAttachmentCategory,
} from '@/services/attachment';
import { PermissionGuard } from '@/components/Layout';
import { useT, T } from '@/locales';

const isImage = (mime: string) => (mime || '').startsWith('image/');

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 上传
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  // 重命名
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameRow, setRenameRow] = useState<any>(null);
  const [renameForm] = Form.useForm();

  // 移动
  const [moveVisible, setMoveVisible] = useState(false);
  const [moveRow, setMoveRow] = useState<any>(null);
  const [moveCategory, setMoveCategory] = useState<number | undefined>(undefined);

  // 分类管理
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [catForm] = Form.useForm();
  const [catEditId, setCatEditId] = useState<number | undefined>(undefined);
  const [catFormVisible, setCatFormVisible] = useState(false);

  const loadCategories = async () => {
    const res = await queryAttachmentCategoryList();
    const list = res.data || res || [];
    const map: Record<number, string> = {};
    const opts: any[] = [];
    (list || []).forEach((c: any) => {
      map[c.id] = c.category_name;
      opts.push({ label: c.category_name, value: c.id });
    });
    setCategoryMap(map);
    setCategoryOptions(opts);
    setCategories(list || []);
    return list;
  };

  const loadStats = async () => {
    try {
      const res = await getAttachmentStats();
      setTotalCount(res.total_count || 0);
    } catch {
      setTotalCount(0);
    }
  };

  const reloadAll = () => {
    actionRef.current?.reload();
    loadCategories();
    loadStats();
  };

  useEffect(() => {
    loadCategories();
    loadStats();
  }, []);

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (uploadCategory) {
      formData.append('category_id', String(uploadCategory));
    }
    return uploadAttachment(formData)
      .then(() => {
        message.success('上传成功');
        reloadAll();
      })
      .catch((e: any) => {
        message.error('上传失败');
        throw e;
      });
  };

  const handleRename = async () => {
    const values = await renameForm.validateFields();
    await updateAttachment(renameRow.id, values);
    message.success('更新成功');
    setRenameVisible(false);
    renameForm.resetFields();
    reloadAll();
  };

  const handleMove = async () => {
    if (!moveCategory) {
      message.warning('请选择目标分类');
      return;
    }
    await moveAttachment({ ids: [moveRow.id], category_id: moveCategory });
    message.success('移动成功');
    setMoveVisible(false);
    setMoveCategory(undefined);
    reloadAll();
  };

  const handleRemove = async (rows: any[]) => {
    await deleteAttachment(rows.map((r) => r.id));
    message.success('删除成功');
    setSelectedRows([]);
    reloadAll();
  };

  const openCategoryManage = () => {
    loadCategories();
    setCategoryVisible(true);
  };

  const openCategoryAdd = () => {
    setCatEditId(undefined);
    catForm.resetFields();
    catForm.setFieldsValue({ parent_id: 0, sort: 100, status: 1 });
    setCatFormVisible(true);
  };

  const openCategoryEdit = (row: any) => {
    setCatEditId(row.id);
    catForm.setFieldsValue({
      parent_id: row.parent_id,
      category_name: row.category_name,
      sort: row.sort,
      status: row.status,
      remark: row.remark,
    });
    setCatFormVisible(true);
  };

  const handleCategorySave = async () => {
    const values = await catForm.validateFields();
    if (catEditId) {
      await updateAttachmentCategory(catEditId, values);
    } else {
      await createAttachmentCategory(values);
    }
    message.success('保存成功');
    setCatFormVisible(false);
    catForm.resetFields();
    reloadAll();
  };

  const handleCategoryDelete = async (row: any) => {
    await deleteAttachmentCategory(row.id);
    message.success('删除成功');
    reloadAll();
  };

  const columns: ProColumns[] = [
    {
      title: '预览',
      dataIndex: 'url',
      valueType: 'text',
      width: 70,
      hideInSearch: true,
      render: (_, row) =>
        isImage(row.mime_type) ? (
          <Image
            src={row.url}
            width={44}
            height={44}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{ mask: null }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <FolderOutlined style={{ fontSize: 20, color: '#999' }} />
          </div>
        ),
    },
    {
      title: '文件名',
      dataIndex: 'origin_name',
      valueType: 'text',
      ellipsis: true,
      width: 180,
    },
    {
      title: '分类',
      dataIndex: 'category_id',
      valueType: 'select',
      width: 130,
      fieldProps: { options: categoryOptions, allowClear: true },
      render: (_, row) => categoryMap[row.category_id] || '-',
    },
    {
      title: '大小',
      dataIndex: 'size_info',
      valueType: 'text',
      width: 90,
      hideInSearch: true,
    },
    {
      title: '类型',
      dataIndex: 'mime_type',
      valueType: 'text',
      width: 150,
      hideInSearch: true,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      valueType: 'text',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '上传时间',
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      width: 150,
      render: (_, row) => (
        <Space size={4} wrap>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setRenameRow(row);
              renameForm.setFieldsValue({
                origin_name: row.origin_name,
                remark: row.remark,
              });
              setRenameVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setMoveRow(row);
              setMoveCategory(undefined);
              setMoveVisible(true);
            }}
          >
            移动
          </Button>
          <PermissionGuard key="destroy" requireds={['core:attachment:edit']}>
            <Popconfirm
              title="删除附件"
              description="确认删除该附件？"
              onConfirm={() => handleRemove([row])}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: <T id="menu.monitor.attachment" />,
      }}
    >
      <ProTable
        headerTitle={`附件列表（共 ${totalCount} 个）`}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="upload" requireds={['core:attachment:edit']}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setUploadCategory(undefined);
                setUploadVisible(true);
              }}
            >
              上传附件
            </Button>
          </PermissionGuard>,
          <PermissionGuard key="category" requireds={['core:attachment:edit']}>
            <Button icon={<FolderOutlined />} onClick={openCategoryManage}>
              分类管理
            </Button>
          </PermissionGuard>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={reloadAll}>
            刷新
          </Button>,
        ]}
        request={async (params) => {
          const { code, list, total } = await queryAttachmentPage({
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
        pagination={{ defaultPageSize: 12 }}
        rowSelection={{
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        scroll={{ x: 1100 }}
      />
      {selectedRows?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              <T
                id="component.table.selection"
                values={{
                  num: (
                    <a style={{ fontWeight: 600 }}>{selectedRows.length}</a>
                  ),
                }}
              />
            </div>
          }
        >
          <PermissionGuard key="destroy2" requireds={['core:attachment:edit']}>
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
          </PermissionGuard>
        </FooterToolbar>
      )}

      <Modal
        title="上传附件"
        open={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>所属分类：</div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择分类"
            allowClear
            value={uploadCategory}
            options={categoryOptions}
            onChange={setUploadCategory}
          />
        </div>
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
          <p className="ant-upload-hint">支持单个或批量上传</p>
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

      <Modal
        title="编辑附件"
        open={renameVisible}
        onCancel={() => setRenameVisible(false)}
        onOk={handleRename}
        width={480}
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="origin_name"
            label="文件名"
            rules={[{ required: true, message: '请输入文件名' }]}
          >
            <Input placeholder="文件名" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="移动附件"
        open={moveVisible}
        onCancel={() => setMoveVisible(false)}
        onOk={handleMove}
        width={420}
        destroyOnHidden
      >
        <div style={{ margin: '16px 0' }}>
          <div style={{ marginBottom: 8 }}>
            将 {moveRow?.origin_name} 移动到：
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择目标分类"
            value={moveCategory}
            options={categoryOptions}
            onChange={setMoveCategory}
          />
        </div>
      </Modal>

      <Modal
        title="分类管理"
        open={categoryVisible}
        onCancel={() => setCategoryVisible(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <PermissionGuard requireds={['core:attachment:edit']}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCategoryAdd}
            >
              新增分类
            </Button>
          </PermissionGuard>
        </div>
        <ProTable
          rowKey="id"
          search={false}
          pagination={false}
          options={false}
          dataSource={categories}
          columns={[
            { title: '分类名称', dataIndex: 'category_name', width: 160 },
            {
              title: '父级ID',
              dataIndex: 'parent_id',
              width: 90,
              render: (_, r) => (r.parent_id ? r.parent_id : '根'),
            },
            { title: '排序', dataIndex: 'sort', width: 70 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 80,
              render: (_, r) =>
                r.status === 1 ? (
                  <Tag color="success">正常</Tag>
                ) : (
                  <Tag>停用</Tag>
                ),
            },
            { title: '备注', dataIndex: 'remark', ellipsis: true },
            {
              title: <T id="component.table.action" />,
              dataIndex: 'option',
              valueType: 'option',
              width: 130,
              render: (_, row) => (
                <Space size={4}>
                  <Button type="link" size="small" onClick={() => openCategoryEdit(row)}>
                    编辑
                  </Button>
                  <Popconfirm
                    title="删除分类"
                    description="确认删除该分类？"
                    onConfirm={() => handleCategoryDelete(row)}
                  >
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={catEditId ? '编辑分类' : '新增分类'}
        open={catFormVisible}
        onCancel={() => setCatFormVisible(false)}
        onOk={handleCategorySave}
        width={480}
        destroyOnHidden
      >
        <Form form={catForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="parent_id" label="父级ID" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="category_name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={100}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select
              options={[
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};
