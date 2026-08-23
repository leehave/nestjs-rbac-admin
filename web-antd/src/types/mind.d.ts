declare namespace Mind {
  /** 索引阶段，与后端 document-index.types.ts 的 DocumentIndexStage 保持一致 */
  type IndexStage =
    | 'queued'
    | 'extract'
    | 'split'
    | 'vector'
    | 'graph'
    | 'done'
    | 'failed'
    | 'pending';

  /** 知识库文档行 */
  interface DocumentItem {
    id: string;
    tenant_id: number;
    document_name: string | null;
    document_type: string | null;
    /** 单位 MB，网页抓取的文档为 0 */
    document_size: number;
    library_number: string | null;
    document_summary: string | null;
    /** 分析状态：1 已完成，0 未完成 */
    status: number;
    upload_time: string | null;
    index_status: IndexStage;
    /** 0 ~ 100 */
    index_progress: number;
    index_message: string;
  }

  /** 单个文档的索引进度 */
  interface IndexState {
    documentId: string;
    status: IndexStage;
    progress: number;
    message: string;
    updatedAt: number;
  }

  /** 索引队列的控制状态 */
  interface QueueStatus {
    paused: boolean;
    has_login: boolean;
    require_login: boolean;
    running: boolean;
    queue_length: number;
    enqueued_count: number;
  }

  /**
   * 索引队列的健康状态。
   * 队列空闲时 worker 会主动退出，因此 worker_connected 为 false 是常态，不代表异常。
   */
  interface QueueHealth {
    worker_connected: boolean;
    worker_status: string;
    last_consumed_at: number | null;
    last_error_at: number | null;
    last_error_message: string | null;
  }

  /** 页面上合并展示的队列状态 */
  type QueueState = Partial<QueueStatus & QueueHealth>;

  /** 检索模式：文档检索 / 智能检索 */
  type RetrievalPattern = 'rag' | 'advance';

  /** 检索入参，对齐后端 MindInvokeBaseDto */
  interface RetrievalParams {
    query: string;
    library?: string;
    source_id?: string;
    source?: string;
    /** 检索策略，缺省时 rag 走 NativeRAG、advance 走 Corrective */
    pattern?: string;
    [key: string]: any;
  }

  /** SSE 帧类型 */
  type StreamFrameType = 'event' | 'think' | 'data';

  /** SSE 流式回调 */
  interface RetrievalHandlers {
    onEvent?: (payload: string) => void;
    onThink?: (payload: string) => void;
    onData?: (payload: string) => void;
    signal?: AbortSignal;
  }
}

declare namespace API {
  /** Result GET /api/mind/document/list（拦截器已将 data 展开到顶层） */
  type MindDocumentPageResult = Response & {
    total: number;
    pages: number;
    records: Mind.DocumentItem[];
  };

  /** Result POST /api/mind/document/upload | /website */
  type MindDocumentUploadResult = Response & {
    id: string;
    library_number: string;
    index_status: Mind.IndexStage;
  };

  /** Result POST /api/mind/document/reindex */
  type MindDocumentReindexResult = Response & {
    queued: number;
    ids: string[];
  };

  /** Result GET /api/mind/document/queue/status */
  type MindQueueStatusResult = Response & Mind.QueueStatus;

  /** Result GET /api/mind/document/queue/health */
  type MindQueueHealthResult = Response & Mind.QueueHealth;

  /** Result GET /api/mind/document/preview（data 是字符串，拦截器不展开） */
  type MindDocumentPreviewResult = Response & {
    data: string;
  };

  /** Result GET /api/mind/document/index-status（data 是数组，拦截器不展开） */
  type MindIndexStatusResult = Response & {
    data: Mind.IndexState[];
  };
}
