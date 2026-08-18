export type DocumentIndexStage = 'queued' | 'extract' | 'split' | 'vector' | 'graph' | 'done' | 'failed' | 'pending';

export type DocumentIndexState = {
  documentId: string;
  status: DocumentIndexStage;
  progress: number;
  message: string;
  updatedAt: number;
};

export type DocumentIndexJob = {
  documentId: string;
  tenantId: number;
  libraryNumber: string;
  ext: string;
  documentName: string;
};

export const DOC_INDEX_QUEUE_KEY = 'mind:doc:index:queue';
export const DOC_INDEX_ENQUEUED_SET = 'mind:doc:index:enqueued';
export const DOC_INDEX_STATUS_PREFIX = 'mind:doc:index:status:';
export const DOC_INDEX_PAUSED_KEY = 'mind:doc:index:paused';
