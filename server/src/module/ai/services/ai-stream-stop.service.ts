import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { RedisService } from '../../../redis/redis.service';
import { AI_CHAT_STOP_CHANNEL } from '../ai.constants';
import { ChatService } from './chat.service';

@Injectable()
export class AiStreamStopService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiStreamStopService.name);
  private subscriber: Redis | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * 模块初始化时创建 Redis 订阅者，订阅停止流通道（AI_CHAT_STOP_CHANNEL）。
   * 收到消息后解析 payload 并调用 chatService.abortLocalStream 中止对应流。
   */
  onModuleInit() {
    this.subscriber = this.redisService.getClient().duplicate();
    this.subscriber.subscribe(AI_CHAT_STOP_CHANNEL).catch((err) => {
      this.logger.error(`订阅 ${AI_CHAT_STOP_CHANNEL} 失败: ${err?.message}`);
    });
    this.subscriber.on('message', (_channel, payload) => {
      try {
        const data = JSON.parse(payload);
        this.chatService.abortLocalStream(data?.message_uuid, data?.session_uuid);
      } catch {
        // ignore malformed
      }
    });
  }

  /**
   * 模块销毁时优雅关闭 Redis 订阅连接，释放资源。
   */
  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }

  /** 广播停止信号到所有 worker */
  async publishStop(messageUuid?: string, sessionUuid?: string) {
    if (!messageUuid && !sessionUuid) return;
    this.chatService.abortLocalStream(messageUuid, sessionUuid);
    await this.redisService.getClient().publish(
      AI_CHAT_STOP_CHANNEL,
      JSON.stringify({ message_uuid: messageUuid, session_uuid: sessionUuid }),
    );
  }
}
