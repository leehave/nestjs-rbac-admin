import { Tooltip, Button, Statistic, Row, Col, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import KeyspacePie from './components/KeyspacePie';
import { rawT, useT, T } from '@/locales';
import { useRequest, useResponsive } from 'ahooks';
import { queryCacheInfo } from '@/services/monitor';

export const Component = () => {
  const t = useT();
  const responsive = useResponsive();
  const {
    data: info,
    loading,
    refresh,
  } = useRequest(async () => {
    const res = await queryCacheInfo();
    const data = res.data || {};
    const variable = data.variable || {};
    return {
      uptime_in_seconds: data.uptime_in_seconds || 0,
      connected_clients: data.connected_clients || 0,
      used_memory: data.used_memory || '-',
      variable,
    };
  });

  return (
    <PageContainer header={{ title: false }}>
      <ProCard
        title="缓存监控"
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
        <ProCard split={responsive.lg ? 'vertical' : 'horizontal'}>
          <ProCard title="Redis 信息">
            <Row gutter={[12, 24]} wrap>
              <Col span={24}>
                <Statistic.Timer
                  type="countup"
                  value={
                    new Date().getTime() - info?.uptime_in_seconds * 1000
                  }
                  title="运行时间"
                  format="HH:mm:ss"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Redis 版本"
                  value={info?.variable?.redis_version || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="端口"
                  value={info?.variable?.tcp_port || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="运行模式"
                  value={
                    info?.variable?.redis_mode == 'standalone'
                      ? '单机'
                      : '集群'
                  }
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="AOF 开启"
                  value={
                    info?.variable?.aof_enabled == 0
                      ? '否'
                      : '是'
                  }
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="连接客户端数"
                  value={info?.connected_clients || 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="每秒操作数"
                  value={info?.variable?.instantaneous_ops_per_sec || 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="已用内存"
                  value={info?.used_memory || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="过期 Key 数"
                  value={info?.variable?.expired_keys || 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="驱逐 Key 数"
                  value={info?.variable?.evicted_keys || 0}
                />
              </Col>
            </Row>
          </ProCard>
          <ProCard title="键空间命中">
            <KeyspacePie
              data={{
                hits: info?.variable?.keyspace_hits,
                misses: info?.variable?.keyspace_misses,
              }}
            />
          </ProCard>
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};
