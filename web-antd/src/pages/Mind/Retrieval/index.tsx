import React, { useRef, useState } from 'react';
import { Button, Card, Collapse, Empty, Input, Radio, Space, Spin, Tag, Typography } from 'antd';
import {
  SearchOutlined,
  StopOutlined,
  ClearOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { retrieveRag, retrieveAdvance } from '@/services/mindRetrieval';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type Mode = 'rag' | 'advance';

export const Component: React.FC<unknown> = () => {
  const [mode, setMode] = useState<Mode>('rag');
  const [query, setQuery] = useState('');
  const [library, setLibrary] = useState('');
  const [loading, setLoading] = useState(false);

  const [answer, setAnswer] = useState('');
  const [thinks, setThinks] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const resetResult = () => {
    setAnswer('');
    setThinks([]);
    setEvents([]);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    if (loading) return;

    resetResult();
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const params = {
      query: q,
      ...(library.trim() ? { library: library.trim() } : {}),
    };

    const handlers = {
      onEvent: (payload: string) => setEvents((prev) => [...prev, payload]),
      onThink: (payload: string) => setThinks((prev) => [...prev, payload]),
      onData: (payload: string) => setAnswer((prev) => prev + payload),
      signal: controller.signal,
    };

    try {
      if (mode === 'rag') {
        await retrieveRag(params, handlers);
      } else {
        await retrieveAdvance(params, handlers);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setEvents((prev) => [...prev, `请求出错：${e?.message || '未知错误'}`]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleClear = () => {
    setQuery('');
    setLibrary('');
    resetResult();
  };

  const lastEvent = events[events.length - 1];

  return (
    <PageContainer header={{ title: '文档检索' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space size={24} wrap>
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: '文档检索（RAG）', value: 'rag' },
                { label: '智能检索（Advanced）', value: 'advance' },
              ]}
            />
            <Input
              placeholder="知识库编号（可选，留空使用默认知识库）"
              value={library}
              onChange={(e) => setLibrary(e.target.value)}
              style={{ width: 320 }}
              allowClear
            />
          </Space>
          <TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入你的问题，基于知识库进行检索问答…"
            autoSize={{ minRows: 2, maxRows: 5 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={loading}
              onClick={handleSearch}
              disabled={!query.trim()}
            >
              检索
            </Button>
            {loading && (
              <Button icon={<StopOutlined />} onClick={handleStop}>
                停止
              </Button>
            )}
            <Button icon={<ClearOutlined />} onClick={handleClear}>
              清空
            </Button>
          </Space>
        </Space>
      </Card>

      {loading && !answer && !thinks.length && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <div style={{ marginTop: 12 }}>正在检索…</div>
          </div>
        </Card>
      )}

      {(answer || thinks.length || events.length) && (
        <Card
          title={
            <Space>
              <Text strong>检索结果</Text>
              {loading ? <Tag color="processing">生成中…</Tag> : <Tag color="success">完成</Tag>}
            </Space>
          }
        >
          {(thinks.length || events.length) && (
            <Collapse
              ghost
              size="small"
              defaultActiveKey={thinks.length ? ['process'] : []}
              items={[
                {
                  key: 'process',
                  label: `检索过程（${thinks.length} 条思考 · ${events.length} 条事件）`,
                  children: (
                    <div
                      style={{
                        maxHeight: 320,
                        overflow: 'auto',
                        background: '#fafafa',
                        borderRadius: 6,
                        padding: '12px 16px',
                      }}
                    >
                      {events.map((e, i) => (
                        <Paragraph key={`e-${i}`} style={{ marginBottom: 4, color: '#999', fontSize: 12 }}>
                          <Text code>[事件]</Text> {e}
                        </Paragraph>
                      ))}
                      {thinks.map((t, i) => (
                        <Paragraph key={`t-${i}`} style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>
                          <Text code>[思考]</Text> {t}
                        </Paragraph>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}

          <div style={{ marginTop: 12 }}>
            {answer ? (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
              </div>
            ) : (
              !loading && <Empty description="暂无结果" />
            )}
            {loading && answer && (
              <div style={{ color: '#999', marginTop: 8 }}>
                <LoadingOutlined spin /> 生成中…
              </div>
            )}
          </div>

          {lastEvent && lastEvent !== 'Streaming finished' && !loading && (
            <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
              最后状态：{lastEvent}
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
};
