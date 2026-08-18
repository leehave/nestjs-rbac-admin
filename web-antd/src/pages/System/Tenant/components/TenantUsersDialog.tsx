import React, { useEffect, useState } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Switch,
  message,
  Popconfirm,
  App,
} from 'antd';
import {
  getTenantUsers,
  getTenantAvailableUsers,
  addTenantUsers,
  removeTenantUser,
  setTenantAdmin,
  setTenantDefault,
} from '@/services/tenant';
import { useT } from '@/locales';

interface Props {
  open: boolean;
  tenantId: number;
  tenantName: string;
  onClose: () => void;
}

const TenantUsersDialog: React.FC<Props> = ({
  open,
  tenantId,
  tenantName,
  onClose,
}) => {
  const t = useT();
  const { message: msg } = App.useApp();
  const [activeTab, setActiveTab] = useState('bound');

  // 已关联用户
  const [boundLoading, setBoundLoading] = useState(false);
  const [boundRows, setBoundRows] = useState<any[]>([]);
  const [boundTotal, setBoundTotal] = useState(0);
  const [boundPage, setBoundPage] = useState(1);
  const [boundLimit, setBoundLimit] = useState(10);
  const [boundSearch, setBoundSearch] = useState({
    username: '',
    realname: '',
    phone: '',
  });

  // 可添加用户
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableRows, setAvailableRows] = useState<any[]>([]);
  const [availableTotal, setAvailableTotal] = useState(0);
  const [availablePage, setAvailablePage] = useState(1);
  const [availableLimit, setAvailableLimit] = useState(10);
  const [availableSearch, setAvailableSearch] = useState({
    username: '',
    realname: '',
    phone: '',
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const loadBound = async () => {
    if (!tenantId) return;
    setBoundLoading(true);
    try {
      const res = await getTenantUsers(tenantId, {
        page: boundPage,
        limit: boundLimit,
        ...boundSearch,
      });
      setBoundRows(res.list || res.rows || []);
      setBoundTotal(Number(res.total || 0));
    } finally {
      setBoundLoading(false);
    }
  };

  const loadAvailable = async () => {
    if (!tenantId) return;
    setAvailableLoading(true);
    try {
      const res = await getTenantAvailableUsers(tenantId, {
        page: availablePage,
        limit: availableLimit,
        ...availableSearch,
      });
      setAvailableRows(res.list || res.rows || []);
      setAvailableTotal(Number(res.total || 0));
    } finally {
      setAvailableLoading(false);
    }
  };

  useEffect(() => {
    if (open && tenantId) {
      setBoundPage(1);
      setSelectedRowKeys([]);
      setActiveTab('bound');
      loadBound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId]);

  useEffect(() => {
    if (activeTab === 'bound' && open) loadBound();
    else if (activeTab === 'available' && open) loadAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, boundPage, boundLimit, availablePage, availableLimit, open]);

  const handleAddUsers = async () => {
    if (!selectedRowKeys.length) {
      msg.warning('请先选择用户');
      return;
    }
    await addTenantUsers(
      tenantId,
      selectedRowKeys.map((k) => Number(k)),
    );
    msg.success('添加成功');
    setSelectedRowKeys([]);
    setAvailablePage(1);
    await loadAvailable();
    setBoundPage(1);
    await loadBound();
  };

  const handleRemove = async (userId: number) => {
    await removeTenantUser(tenantId, userId);
    msg.success('移除成功');
    await loadBound();
    await loadAvailable();
  };

  const handleAdminChange = async (userId: number, value: boolean) => {
    try {
      await setTenantAdmin(tenantId, userId, value ? 1 : 0);
      msg.success(value ? '已设为租户管理员' : '已取消租户管理员');
      await loadBound();
    } catch {
      msg.error('设置失败');
      await loadBound();
    }
  };

  const handleDefaultChange = async (userId: number, value: boolean) => {
    try {
      await setTenantDefault(tenantId, userId, value ? 1 : 0);
      msg.success(value ? '已设为默认租户' : '已取消默认租户');
      await loadBound();
    } catch {
      msg.error('设置失败');
      await loadBound();
    }
  };

  const boundColumns: any[] = [
    { title: '用户ID', dataIndex: 'user_id', width: 90, align: 'center' },
    { title: '账号', dataIndex: 'username', width: 140 },
    { title: '姓名', dataIndex: 'realname', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '默认租户',
      width: 100,
      align: 'center',
      render: (_: any, row: any) => (
        <Switch
          checked={row.is_default === 1}
          disabled={row.user_id === 1}
          onChange={(v) => handleDefaultChange(row.user_id, v)}
        />
      ),
    },
    {
      title: '租户管理员',
      width: 100,
      align: 'center',
      render: (_: any, row: any) => (
        <Switch
          checked={row.is_super === 1}
          disabled={row.user_id === 1}
          onChange={(v) => handleAdminChange(row.user_id, v)}
        />
      ),
    },
    {
      title: '状态',
      width: 90,
      align: 'center',
      render: (_: any, row: any) =>
        row.status === 1 ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="error">禁用</Tag>
        ),
    },
    {
      title: '操作',
      width: 90,
      align: 'center',
      render: (_: any, row: any) =>
        row.user_id === 1 ? null : (
          <Popconfirm
            title="移除用户"
            description="确定要将该用户从租户中移除吗？"
            onConfirm={() => handleRemove(row.user_id)}
          >
            <Button type="link" danger size="small">
              移除
            </Button>
          </Popconfirm>
        ),
    },
  ];

  const availableColumns: any[] = [
    { title: '用户ID', dataIndex: 'id', width: 90, align: 'center' },
    { title: '账号', dataIndex: 'username', width: 140 },
    { title: '姓名', dataIndex: 'realname', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    {
      title: '状态',
      width: 90,
      align: 'center',
      render: (_: any, row: any) =>
        row.status === 1 ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="error">禁用</Tag>
        ),
    },
  ];

  return (
    <Modal
      title={`租户用户管理 - ${tenantName}`}
      open={open}
      width={1080}
      footer={
        <Button onClick={onClose}>关闭</Button>
      }
      destroyOnHidden
      onCancel={onClose}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: 'bound',
            label: '已关联用户',
            children: (
              <>
                <Space style={{ marginBottom: 12 }} wrap>
                  <Input
                    placeholder="账号"
                    allowClear
                    style={{ width: 160 }}
                    value={boundSearch.username}
                    onChange={(e) =>
                      setBoundSearch({ ...boundSearch, username: e.target.value })
                    }
                  />
                  <Input
                    placeholder="姓名"
                    allowClear
                    style={{ width: 160 }}
                    value={boundSearch.realname}
                    onChange={(e) =>
                      setBoundSearch({ ...boundSearch, realname: e.target.value })
                    }
                  />
                  <Input
                    placeholder="手机号"
                    allowClear
                    style={{ width: 160 }}
                    value={boundSearch.phone}
                    onChange={(e) =>
                      setBoundSearch({ ...boundSearch, phone: e.target.value })
                    }
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      setBoundPage(1);
                      loadBound();
                    }}
                  >
                    查询
                  </Button>
                </Space>
                <Table
                  rowKey="user_id"
                  size="small"
                  loading={boundLoading}
                  columns={boundColumns}
                  dataSource={boundRows}
                  pagination={{
                    current: boundPage,
                    pageSize: boundLimit,
                    total: boundTotal,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    onChange: (page, pageSize) => {
                      setBoundPage(page);
                      setBoundLimit(pageSize);
                    },
                  }}
                  scroll={{ y: 360 }}
                />
              </>
            ),
          },
          {
            key: 'available',
            label: '添加用户',
            children: (
              <>
                <Space style={{ marginBottom: 12 }} wrap>
                  <Input
                    placeholder="账号"
                    allowClear
                    style={{ width: 160 }}
                    value={availableSearch.username}
                    onChange={(e) =>
                      setAvailableSearch({
                        ...availableSearch,
                        username: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="姓名"
                    allowClear
                    style={{ width: 160 }}
                    value={availableSearch.realname}
                    onChange={(e) =>
                      setAvailableSearch({
                        ...availableSearch,
                        realname: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="手机号"
                    allowClear
                    style={{ width: 160 }}
                    value={availableSearch.phone}
                    onChange={(e) =>
                      setAvailableSearch({
                        ...availableSearch,
                        phone: e.target.value,
                      })
                    }
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      setAvailablePage(1);
                      loadAvailable();
                    }}
                  >
                    查询
                  </Button>
                  <Button
                    type="primary"
                    disabled={!selectedRowKeys.length}
                    onClick={handleAddUsers}
                  >
                    添加选中用户
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  size="small"
                  loading={availableLoading}
                  columns={availableColumns}
                  dataSource={availableRows}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                  }}
                  pagination={{
                    current: availablePage,
                    pageSize: availableLimit,
                    total: availableTotal,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    onChange: (page, pageSize) => {
                      setAvailablePage(page);
                      setAvailableLimit(pageSize);
                    },
                  }}
                  scroll={{ y: 360 }}
                />
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default TenantUsersDialog;
