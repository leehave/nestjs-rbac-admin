import { Tooltip, Button, Statistic, Row, Col, Progress, Spin } from 'antd';
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  StatisticCard,
} from '@ant-design/pro-components';
import { rawT, useT, T } from '@/locales';
import { useRequest, useResponsive } from 'ahooks';
import { queryServerInfo } from '@/services/monitor';

const DiskList: React.FC<{ list: any }> = ({ list }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {list?.map((disk: any, index: number) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DatabaseOutlined style={{ fontSize: 24 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {disk.filesystem || disk.mounted_on}
            </div>
            <Progress
              percent={parseFloat(disk.use_percentage) || 0}
              percentPosition={{ align: 'end', type: 'inner' }}
              strokeLinecap="butt"
              size={{ height: 20 }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              已用 {disk.used} / 总计 {disk.size}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Component = () => {
  const t = useT();
  const responsive = useResponsive();
  const {
    data: info,
    loading,
    refresh,
  } = useRequest(async () => {
    const res = await queryServerInfo();
    const data = res.data || {};
    return {
      memory: data.memory || {},
      phpEnv: data.phpEnv || {},
      disk: data.disk || [],
    };
  });

  const memRate = parseFloat(info?.memory?.rate) || 0;

  return (
    <PageContainer header={{ title: false }}>
      <ProCard
        title="服务监控"
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
          <ProCard title="运行环境">
            <Row gutter={[12, 24]} wrap>
              <Col span={24}>
                <Statistic
                  title="系统运行时间"
                  value={info?.phpEnv?.uptime || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="操作系统"
                  value={info?.phpEnv?.os || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="主机名"
                  value={info?.phpEnv?.hostname || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Node 版本"
                  value={info?.phpEnv?.php_version || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="架构"
                  value={info?.phpEnv?.arch || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="CPU 型号"
                  value={info?.phpEnv?.cpu_model || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="CPU 核心数"
                  value={info?.phpEnv?.cpu_cores || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="负载均值"
                  value={info?.phpEnv?.load_average || '-'}
                />
              </Col>
            </Row>
          </ProCard>
          <ProCard
            title="资源使用"
            split="horizontal"
          >
            <StatisticCard
              statistic={{
                title: '内存使用率',
                value: memRate,
                suffix: '%',
                description: (
                  <>
                    <StatisticCard.Statistic
                      layout="inline"
                      title="总计"
                      value={info?.memory?.total || '-'}
                    />
                    <StatisticCard.Statistic
                      layout="inline"
                      title="已用"
                      value={info?.memory?.used || '-'}
                    />
                    <StatisticCard.Statistic
                      layout="inline"
                      title="可用"
                      value={info?.memory?.free || '-'}
                    />
                  </>
                ),
              }}
              chart={
                <Progress
                  percent={memRate}
                  showInfo={false}
                  strokeLinecap="butt"
                  size={{ height: 10 }}
                />
              }
            />
          </ProCard>
        </ProCard>
        <ProCard title="磁盘信息">
          <DiskList list={info?.disk} />
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};
