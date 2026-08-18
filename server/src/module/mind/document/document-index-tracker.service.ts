import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import {
  DOC_INDEX_STATUS_PREFIX,
  type DocumentIndexStage,
  type DocumentIndexState,
} from './document-index.types';

/** ponytail: all Redis ops wrapped; degrades to null/empty when Redis is unavailable */
@Injectable()
export class MindDocumentIndexTracker {
  private readonly logger = new Logger(MindDocumentIndexTracker.name);

  constructor(private readonly redisService: RedisService) {}

  private statusKey(documentId: string) {
    return `${DOC_INDEX_STATUS_PREFIX}${documentId}`;
  }

  /**
   * 记录文档索引开始，状态设为「排队中」。
   * @param documentId - 文档 ID
   */
  async start(documentId: string) {
    await this.save(documentId, {
      documentId,
      status: 'queued',
      progress: 0,
      message: '排队中',
      updatedAt: Date.now(),
    });
  }

  async update(documentId: string, patch: Partial<Omit<DocumentIndexState, 'documentId'>>) {
    const cur = await this.get(documentId);
    if (!cur) return;
    await this.save(documentId, { ...cur, ...patch, updatedAt: Date.now() });
  }

  /**
   * 标记文档索引完成，状态设为「索引完成」。
   * @param documentId - 文档 ID
   */
  async finish(documentId: string) {
    await this.save(documentId, {
      documentId,
      status: 'done',
      progress: 100,
      message: '索引完成',
      updatedAt: Date.now(),
    });
  }

  /**
   * 标记文档索引失败，记录失败消息。
   * @param documentId - 文档 ID
   * @param message - 失败原因
   */
  async fail(documentId: string, message: string) {
    await this.save(documentId, {
      documentId,
      status: 'failed',
      progress: 100,
      message,
      updatedAt: Date.now(),
    });
  }

  /**
   * 清除指定文档的索引跟踪记录。
   * @param documentId - 文档 ID
   */
  async clear(documentId: string) {
    try {
      await this.redisService.del(this.statusKey(documentId));
    } catch (e: any) {
      this.logger.warn(`clear tracker failed: ${e?.message}`);
    }
  }

  /**
   * 获取指定文档的索引状态。
   * @param documentId - 文档 ID
   * @returns 索引状态对象，失败或不存在时返回 null
   */
  async get(documentId: string): Promise<DocumentIndexState | null> {
    try {
      const raw = await this.redisService.get(this.statusKey(documentId));
      if (!raw || typeof raw !== 'object') return null;
      return raw as DocumentIndexState;
    } catch (e: any) {
      this.logger.warn(`tracker get failed (${documentId}): ${e?.message}`);
      return null;
    }
  }

  async getMany(ids: string[]): Promise<DocumentIndexState[]> {
    if (!ids.length) return [];
    const rows = await Promise.all(ids.map((id) => this.get(id)));
    return rows.filter(Boolean) as DocumentIndexState[];
  }

  isActive(status?: DocumentIndexStage | string) {
    return ['queued', 'extract', 'split', 'vector', 'graph'].includes(String(status || ''));
  }

  /**
   * 将索引状态保存到 Redis，根据状态设置不同的过期时间。
   * @param documentId - 文档 ID
   * @param state - 索引状态对象
   */
  private async save(documentId: string, state: DocumentIndexState) {
    const ttlMs =
      state.status === 'failed'
        ? 7 * 24 * 3600_000
        : state.status === 'done'
          ? 24 * 3600_000
          : 3 * 24 * 3600_000;
    try {
      await this.redisService.set(this.statusKey(documentId), state, ttlMs);
    } catch (e: any) {
      this.logger.warn(`tracker save failed (${documentId}): ${e?.message}`);
    }
  }
}
