import { Tooltip, Button, Statistic, Row, Col, Alert, Descriptions, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useT } from '@/locales';
import { useRequest } from 'ahooks';
import { queryRedisInfo } from '@/services/monitor';

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(2)} ${units[i]}`;
};

export const Component = () => {
  const t = useT();
  const {
    data: info,
    loading,
    refresh,
  } = useRequest(async () => {
    const res = await queryRedisInfo();
    const data = res.data || res || {};
    return {
      error: data.error,
      error_message: data.error_message,
      uptimeInDays: data.uptime_in_days || 0,
      connectedClients: data.connected_clients || 0,
      usedMemory: data.used_memory || '0 B',
      variable: data.variable || {},
    };
  });

  const v = info?.variable || {};
  const hits = Number(v.keyspace_hits) || 0;
  const misses = Number(v.keyspace_misses) || 0;
  const hitRate =
    hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  const basicList = [
    { label: 'Redis 版本', value: v.redis_version || '-' },
    { label: '运行模式', value: v.redis_mode || '-' },
    { label: 'TCP 端口', value: v.tcp_port || '-' },
    { label: '操作系统', value: v.os || '-' },
    { label: '架构位数', value: v.arch_bits ? `${v.arch_bits} bit` : '-' },
    { label: '内存分配器', value: v.mem_allocator || '-' },
    { label: '角色', value: v.role || '-' },
    { label: 'AOF 持久化', value: v.aof_enabled ? '开启' : '关闭' },
  ];

  const memoryList = [
    { label: '当前内存', value: formatBytes(Number(v.used_memory) || 0) },
    { label: '峰值内存', value: formatBytes(Number(v.used_memory_peak) || 0) },
    { label: 'RSS 内存', value: formatBytes(Number(v.used_memory_rss) || 0) },
    { label: '内存碎片率', value: v.mem_fragmentation_ratio || 0 },
  ];

  const statList = [
    { label: '命令总执行次数', value: Number(v.total_commands_processed) || 0 },
    { label: '每秒执行命令', value: Number(v.instantaneous_ops_per_sec) || 0 },
    { label: '网络输入', value: `${v.instantaneous_input_kbps || 0} KB/s` },
    { label: '网络输出', value: `${v.instantaneous_output_kbps || 0} KB/s` },
    { label: '过期键数量', value: Number(v.expired_keys) || 0 },
    { label: '淘汰键数量', value: Number(v.evicted_keys) || 0 },
    { label: '累计连接数', value: Number(v.total_connections_received) || 0 },
    {
      label: '最近保存变化键数',
      value: Number(v.rdb_changes_since_last_save) || 0,
    },
  ];

  return (
    <PageContainer header={{ title: false }}>
      <ProCard
        title="Redis监控"
        extra={
          <Tooltip title="刷新">
            <Button
              type="link"
              icon={<ReloadOutlined />}
              disabled={loading}
              onClick={() => refresh()}
            />
          </Tooltip>
        }
        split="horizontal"
        loading={
          loading ? (
            <div style={{ paddingBlock: 40, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : null
        }
        headerBordered
      >
        {info?.error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="Redis 连接异常"
            description={info.error_message}
          />
        )}
        <ProCard title="概览">
          <Row gutter={[16, 16]} wrap>
            <Col xs={12} md={6}>
              <Statistic title="运行天数" value={info?.uptimeInDays ?? 0} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="当前连接数"
                value={info?.connectedClients ?? 0}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="已用内存" value={info?.usedMemory ?? '0 B'} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="命中率" value={hitRate} suffix="%" />
            </Col>
          </Row>
        </ProCard>
        <ProCard split="horizontal">
          <ProCard title="基本信息" headerBordered>
            <Descriptions
              column={{ xs: 1, sm: 2, md: 4 }}
              size="small"
              bordered
              items={basicList.map((item) => ({
                key: item.label,
                label: item.label,
                children: item.value,
              }))}
            />
          </ProCard>
          <ProCard title="内存信息" headerBordered>
            <Descriptions
              column={{ xs: 1, sm: 2, md: 4 }}
              size="small"
              bordered
              items={memoryList.map((item) => ({
                key: item.label,
                label: item.label,
                children: item.value,
              }))}
            />
          </ProCard>
          <ProCard title="运行统计" headerBordered>
            <Descriptions
              column={{ xs: 1, sm: 2, md: 4 }}
              size="small"
              bordered
              items={statList.map((item) => ({
                key: item.label,
                label: item.label,
                children: item.value,
              }))}
            />
          </ProCard>
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};
