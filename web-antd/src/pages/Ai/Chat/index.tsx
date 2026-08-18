import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sender } from '@ant-design/x';
import { createAiWs, type AiWsClient } from '@/utils/ai-ws';
import cache from '@/utils/cache';
import {
  listSessions,
  createSession,
  listMessages,
  updateSessionTitle,
  updateSessionModel,
  deleteSession,
  modelOptions,
} from '@/services/ai';

interface ChatMessage {
  key: string;
  message_uuid?: string;
  role: 'user' | 'assistant';
  content: string;
  model_name?: string;
  status?: string;
  streaming?: boolean;
}

let tempSeq = 0;
const nextTempKey = (suffix: string) => `tmp-${++tempSeq}-${suffix}`;

export const Component: React.FC<unknown> = () => {
  const [sessions, setSessions] = useState<Ai.SessionItem[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionPage, setSessionPage] = useState(1);
  const [activeUuid, setActiveUuid] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<Ai.ModelOption[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  const wsRef = useRef<AiWsClient | null>(null);
  const streamingKeyRef = useRef<string | null>(null);
  const streamingMsgUuidRef = useRef<string | null>(null);
  const messageBoxRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messageBoxRef.current?.scrollTo({
        top: messageBoxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  };

  const loadSessions = async (page: number) => {
    const res = await listSessions({ page, limit: 20 });
    setSessions(res.list || []);
    setSessionTotal(res.total || 0);
    setSessionPage(page);
  };

  const loadModels = async () => {
    const res = await modelOptions();
    setModels(res.list || []);
  };

  const loadMessages = async (uuid: string) => {
    const res = await listMessages(uuid);
    setMessages(
      (res.list || []).map((m) => ({
        key: m.message_uuid,
        message_uuid: m.message_uuid,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        model_name: m.model_name ?? undefined,
        status: m.status,
      })),
    );
    setCurrentModelId(res.default_model_id ?? null);
    scrollToBottom();
  };

  const selectSession = (s: Ai.SessionItem) => {
    setActiveUuid(s.session_uuid);
    setActiveTitle(s.title);
    loadMessages(s.session_uuid);
  };

  const handleWsMessage = (event: string, data: any) => {
    switch (event) {
      case 'auth.ok':
        setWsStatus('open');
        break;
      case 'auth.error':
        message.error(data?.message || 'WebSocket 鉴权失败');
        wsRef.current?.disconnect();
        break;
      case 'chat.message_start':
        streamingMsgUuidRef.current = data.message_uuid;
        setMessages((prev) =>
          prev.map((m) =>
            m.key === streamingKeyRef.current
              ? { ...m, message_uuid: data.message_uuid, model_name: data.model_name }
              : m,
          ),
        );
        break;
      case 'chat.token':
        setMessages((prev) =>
          prev.map((m) =>
            m.key === streamingKeyRef.current
              ? { ...m, content: m.content + (data.delta || '') }
              : m,
          ),
        );
        scrollToBottom();
        break;
      case 'chat.message_done':
        setMessages((prev) =>
          prev.map((m) =>
            m.key === streamingKeyRef.current
              ? {
                  ...m,
                  content: data.content ?? m.content,
                  streaming: false,
                  message_uuid: data.message_uuid,
                }
              : m,
          ),
        );
        setStreaming(false);
        streamingKeyRef.current = null;
        streamingMsgUuidRef.current = null;
        // 新消息后会话按最后消息时间倒序置顶，刷新第 1 页即可看到最新标题/计数
        loadSessions(1);
        break;
      case 'chat.error':
        message.error(data?.message || '生成失败');
        setMessages((prev) =>
          prev.map((m) =>
            m.key === streamingKeyRef.current
              ? {
                  ...m,
                  streaming: false,
                  content: m.content || `（生成失败）${data?.message ?? ''}`,
                }
              : m,
          ),
        );
        setStreaming(false);
        streamingKeyRef.current = null;
        streamingMsgUuidRef.current = null;
        // 失败时用户消息也已落库，刷新会话计数与排序
        loadSessions(1);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    loadModels();
    loadSessions(1);
    const token = cache.local.getJSON('token')?.state?.token;
    const ws = createAiWs(handleWsMessage, setWsStatus);
    wsRef.current = ws;
    if (token) ws.connect(token);
    return () => ws.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconnect = () => {
    const token = cache.local.getJSON('token')?.state?.token;
    if (token) wsRef.current?.connect(token);
  };

  const handleNewSession = async () => {
    const res = await createSession({});
    const uuid = res.data?.session_uuid;
    if (!uuid) return;
    await loadSessions(1);
    setActiveUuid(uuid);
    setActiveTitle('新对话');
    setMessages([]);
    setCurrentModelId(res.data?.default_model_id ?? null);
  };

  const handleSend = async (message?: string) => {
    const content = (message ?? input).trim();
    if (!content || streaming) return;
    let uuid = activeUuid;
    if (!uuid) {
      const res = await createSession({});
      uuid = res.data?.session_uuid ?? null;
      if (!uuid) return;
      await loadSessions(1);
      setActiveUuid(uuid);
      setActiveTitle('新对话');
      setCurrentModelId(res.data?.default_model_id ?? null);
    }
    setInput('');
    const userMsg: ChatMessage = { key: nextTempKey('u'), role: 'user', content };
    const assistantMsg: ChatMessage = {
      key: nextTempKey('a'),
      role: 'assistant',
      content: '',
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    streamingKeyRef.current = assistantMsg.key;
    setStreaming(true);
    wsRef.current?.send('chat.send', {
      session_uuid: uuid,
      content,
      model_id: currentModelId ?? undefined,
    });
    scrollToBottom();
  };

  const handleStop = () => {
    if (!activeUuid) return;
    wsRef.current?.send('chat.stop', {
      session_uuid: activeUuid,
      message_uuid: streamingMsgUuidRef.current ?? undefined,
    });
  };

  const handleRename = (s: Ai.SessionItem) => {
    let value = s.title;
    Modal.confirm({
      title: '重命名会话',
      icon: <EditOutlined />,
      content: (
        <Input defaultValue={s.title} maxLength={200} onChange={(e) => (value = e.target.value)} />
      ),
      onOk: async () => {
        if (!value.trim()) {
          message.warning('标题不能为空');
          return Promise.reject();
        }
        await updateSessionTitle(s.session_uuid, value.trim());
        message.success('重命名成功');
        loadSessions(sessionPage);
        if (activeUuid === s.session_uuid) setActiveTitle(value.trim());
      },
    });
  };

  const handleDelete = (s: Ai.SessionItem) => {
    Modal.confirm({
      title: '确认删除？',
      content: '删除后会话及其消息不可恢复',
      onOk: async () => {
        await deleteSession(s.session_uuid);
        message.success('删除成功');
        if (activeUuid === s.session_uuid) {
          setActiveUuid(null);
          setActiveTitle('');
          setMessages([]);
        }
        loadSessions(sessionPage);
      },
    });
  };

  const handleModelChange = async (modelId: string) => {
    setCurrentModelId(modelId);
    if (activeUuid) {
      await updateSessionModel(activeUuid, modelId);
    }
  };

  return (
    <Flex style={{ height: 'calc(100vh - 120px)', gap: 16 }}>
      {/* 左栏：会话列表 */}
      <div
        style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Button type="primary" block icon={<PlusOutlined />} onClick={handleNewSession}>
          新建对话
        </Button>
        <div style={{ flex: 1, overflow: 'auto', marginTop: 12 }}>
          {sessions.length === 0 ? (
            <Empty description="暂无会话" style={{ marginTop: 40 }} />
          ) : (
            sessions.map((s) => (
              <div
                key={s.session_uuid}
                onClick={() => selectSession(s)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginBottom: 8,
                  background: activeUuid === s.session_uuid ? '#e6f4ff' : '#fafafa',
                  border:
                    activeUuid === s.session_uuid ? '1px solid #1677ff' : '1px solid #f0f0f0',
                }}
              >
                <Flex justify="space-between" align="center">
                  <div
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title || '新对话'}
                  </div>
                  <Space size={4}>
                    <Tooltip title="重命名">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(s);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s);
                        }}
                      />
                    </Tooltip>
                  </Space>
                </Flex>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {s.message_count} 条消息
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination
          simple
          size="small"
          current={sessionPage}
          total={sessionTotal}
          pageSize={20}
          onChange={(p) => loadSessions(p)}
          style={{ marginTop: 8, textAlign: 'center' }}
        />
      </div>

      {/* 右栏：聊天窗口 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
        }}
      >
        {/* 顶栏 */}
        <Flex
          align="center"
          justify="space-between"
          style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}
        >
          <Space>
            <span style={{ fontWeight: 600 }}>{activeTitle || '请选择或新建会话'}</span>
            <Tag
              color={
                wsStatus === 'open'
                  ? 'success'
                  : wsStatus === 'connecting'
                    ? 'processing'
                    : 'error'
              }
            >
              {wsStatus === 'open' ? '已连接' : wsStatus === 'connecting' ? '连接中' : '已断开'}
            </Tag>
          </Space>
          <Select
            style={{ width: 260 }}
            placeholder="选择模型"
            value={currentModelId}
            options={models.map((m) => ({ label: m.name, value: m.id }))}
            onChange={handleModelChange}
            disabled={!activeUuid}
          />
        </Flex>

        {/* 消息区 */}
        <div ref={messageBoxRef} style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {messages.length === 0 ? (
            <Empty description="开始新的对话吧" style={{ marginTop: 80 }} />
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <Flex key={m.key} justify="flex-end" style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      maxWidth: '70%',
                      background: '#1677ff',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                </Flex>
              ) : (
                <Flex key={m.key} justify="flex-start" style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#e6f4ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <RobotOutlined style={{ color: '#1677ff' }} />
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    {m.model_name && (
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        {m.model_name}
                      </div>
                    )}
                    <div
                      style={{
                        background: '#f5f5f5',
                        padding: '8px 12px',
                        borderRadius: 8,
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.streaming ? (
                        m.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        ) : (
                          <Spin size="small" />
                        )
                      ) : m.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      ) : (
                        <span style={{ color: '#999' }}>（生成中断）</span>
                      )}
                    </div>
                  </div>
                </Flex>
              ),
            )
          )}
        </div>

        {/* 输入区 */}
        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
          {wsStatus === 'closed' && (
            <Flex justify="center" style={{ marginBottom: 8 }}>
              <Button size="small" onClick={reconnect}>
                重新连接
              </Button>
            </Flex>
          )}
          <Sender
            value={input}
            onChange={(v) => setInput(v)}
            onSubmit={handleSend}
            loading={streaming}
            onCancel={handleStop}
            disabled={wsStatus !== 'open'}
            placeholder={
              wsStatus === 'open'
                ? '输入消息，Enter 发送，Shift+Enter 换行'
                : '连接已断开，点击重新连接'
            }
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        </div>
      </div>
    </Flex>
  );
};
