import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { TenantContext } from '../../../common/tenant/tenant.context';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MindLlmRuntimeService } from '../llm/mind-llm-runtime.service';
import { MindGraphService } from '../graph/mind-graph.service';
import { MindVectorService } from '../vector/mind-vector.service';
import { MindSystemDocumentEntity } from './entities/mind-system-document.entity';
import { MindDocumentIndexTracker } from './document-index-tracker.service';
import { extractTextByType } from './utils/document-extractor';
import { splitDocumentText } from './utils/document-chunk.util';
import type { DocumentIndexJob, DocumentIndexState } from './document-index.types';

@Injectable()
export class MindDocumentIndexProcessorService {
  private readonly logger = new Logger(MindDocumentIndexProcessorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorService: MindVectorService,
    private readonly graphService: MindGraphService,
    private readonly llmRuntime: MindLlmRuntimeService,
    private readonly indexTracker: MindDocumentIndexTracker,
    @InjectRepository(MindSystemDocumentEntity)
    private readonly documentRepo: Repository<MindSystemDocumentEntity>,
  ) {}

  /**
   * 获取租户文档存储目录。
   * @param tenantId - 租户 ID
   * @returns 文档保存路径
   */
  private getSaveDir(tenantId: number) {
    const configured = this.configService.get<string>('mind.documents.saveDir') || '';
    const base = configured
      ? path.resolve(process.cwd(), configured)
      : path.resolve(process.cwd(), '../upload/mind/documents');
    return path.join(base, String(tenantId));
  }

  private extractSummary(content: string) {
    const trimmed = String(content || '').replace(/\s+/g, ' ').trim();
    return trimmed ? trimmed.slice(0, 180) : null;
  }

  /**
   * 根据任务信息加载文档缓冲区。支持 HTTP 链接的 HTML 和本地文件。
   * @param job - 索引任务
   * @returns 文件缓冲区
   */
  private async loadBuffer(job: DocumentIndexJob) {
    if (job.ext === 'html' && /^https?:\/\//i.test(job.documentName)) {
      const res = await axios.get(job.documentName, { timeout: 15000, responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    }
    const filePath = path.join(this.getSaveDir(job.tenantId), job.documentName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${job.documentName}`);
    }
    return fs.readFileSync(filePath);
  }

  async run(job: DocumentIndexJob) {
    // Background worker has no HTTP context; inject tenant so requireTenantId() works
    return TenantContext.run({ tenantId: job.tenantId, ignoreTenant: false }, () => this.runInContext(job));
  }

  /**
   * 在租户上下文中执行索引任务。依次执行：文档解析、文本分块、向量库写入、图谱写入、实体关系抽取。
   * @param job - 索引任务
   */
  private async runInContext(job: DocumentIndexJob) {
    const { documentId, tenantId, libraryNumber, ext } = job;
    const track = (status: DocumentIndexState['status'], progress: number, message: string) =>
      this.indexTracker.update(documentId, { status, progress, message });

    await this.documentRepo.update({ id: documentId, tenantId } as any, { status: 0 });

    track('extract', 5, '解析文档…');
    const buffer = await this.loadBuffer(job);
    const content = await extractTextByType(buffer, ext);
    if (!String(content || '').trim()) {
      throw new Error('未能从文档提取有效文本');
    }

    track('split', 15, '分块…');
    const ragSetting = await this.llmRuntime.resolveRagSettingContent();
    const chunkSize = Number(ragSetting.chunkSize) || 768;
    const chunkOverlap = Number(ragSetting.chunkOverlap) || 50;
    const chunks = await splitDocumentText(content, { chunkSize, chunkOverlap });
    if (!chunks.length) throw new Error('分块结果为空');

    track('vector', 25, `写入向量库 0/${chunks.length}`);
    // 复用同一 store/embeddings，顺序大批量写入（批量大小见 mind.qdrant.embedBatch）
    await this.vectorService.upsertDocumentChunks(tenantId, libraryNumber, chunks, {
      rag: ragSetting,
      onProgress: (done, total) => {
        const pct = 25 + Math.floor((done / total) * 60);
        track('vector', pct, `写入向量库 ${done}/${total}`);
      },
    });

    track('graph', 90, '写入图谱…');
    await this.graphService.upsertChunkNodes(
      tenantId,
      libraryNumber,
      chunks.map((c) => ({ chunkIndex: c.chunkIndex, text: c.text })),
    );

    // LLM 实体关系图：由 .env 总开关控制；写入 Neo4j，不写入 Qdrant 向量库
    const envGraphEnabled = this.configService.get<boolean>('mind.graph.enabled') === true;
    if (envGraphEnabled) {
      track('graph', 95, '抽取实体关系图…');
      try {
        // 图谱抽取用对话 LLM（t_system_setting source=llm），非 rag embedding 模型
        const llm = await this.llmRuntime.newChatModel({});
        // 用更粗的分块降低 LLM 调用次数；向量分块仍用 rag.chunkSize
        const graphChunkSize = Math.max(
          chunkSize,
          Number(this.configService.get<number>('mind.graph.chunkSize') ?? 2400),
        );
        const graphChunks = await splitDocumentText(content, { chunkSize: graphChunkSize, chunkOverlap });
        const concurrency = Number(this.configService.get<number>('mind.graph.concurrency') ?? 5);
        this.logger.log(
          `entity graph extraction start (${documentId}): chunks=${graphChunks.length}, concurrency=${concurrency}, chunkSize=${graphChunkSize}`,
        );
        await this.graphService.addDocumentGraph(
          tenantId,
          libraryNumber,
          graphChunks.map((c) => c.text),
          llm,
          { concurrency },
        );
        this.logger.log(`entity graph extraction completed (${documentId})`);
      } catch (e: any) {
        // 实体图抽取失败不影响向量检索可用性
        this.logger.warn(`entity graph extraction skipped (${documentId}): ${e?.message ?? e}`);
      }
    } else {
      this.logger.log(`entity graph extraction disabled (${documentId}): MIND_GRAPH_ENABLED=false`);
    }

    await this.documentRepo.update(
      { id: documentId, tenantId } as any,
      { documentSummary: this.extractSummary(content), status: 1 },
    );
    await this.indexTracker.finish(documentId);
  }
}
