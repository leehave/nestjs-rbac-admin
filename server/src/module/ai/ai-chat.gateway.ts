import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';

import { UserService } from '../system/user/user.service';
import type { UserType } from '../system/user/dto/user';
import { ChatService } from './services/chat.service';
import { AiStreamStopService } from './services/ai-stream-stop.service';
import type {
  AiWsChatSendData,
  AiWsChatStopData,
  AiWsClientEvent,
  AiWsEnvelope,
  AiWsServerEvent,
} from './ai.types';

interface WsClientMeta {
  authed: boolean;
  session?: UserType;
}

@WebSocketGateway({ path: '/ws/ai', cors: { origin: true } })
export class AiChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(AiChatGateway.name);
  private readonly clients = new WeakMap<WebSocket, WsClientMeta>();

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly aiStreamStopService: AiStreamStopService,
  ) {}

  afterInit() {
    this.logger.log('AI WebSocket 已挂载 path=/ws/ai（与 HTTP 共用端口，无需单独启动）');
  }

  handleConnection(client: WebSocket) {
    this.clients.set(client, { authed: false });
    this.logger.debug(`客户端连接 remote=${(client as any)?._socket?.remoteAddress ?? 'unknown'}`);
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.debug('客户端断开');
  }

  /**
   * 处理 WebSocket 鉴权事件，校验用户 token 并建立认证会话
   *
   * @param client - WebSocket 客户端实例
   * @param data - 鉴权数据，包含可选的 token 字符串
   */
  @SubscribeMessage('auth')
  async handleAuth(client: WebSocket, data: { token?: string }) {
    const token = data?.token?.trim();
    if (!token) {
      this.send(client, 'auth.error', { message: '缺少 token' });
      client.close();
      return;
    }

    const authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const session = await this.userService.getSessionByAccessToken(authorization);
    if (!session?.userId) {
      this.send(client, 'auth.error', { message: '登录已过期，请重新登录' });
      client.close();
      return;
    }

    this.clients.set(client, { authed: true, session });
    this.logger.log(`WebSocket 鉴权成功 userId=${session.userId}`);
    this.send(client, 'auth.ok', { user_id: session.userId });
  }

  @SubscribeMessage('ping')
  handlePing(client: WebSocket) {
    if (!this.requireAuth(client)) return;
    this.send(client, 'pong', {});
  }

  /**
   * 处理聊天消息发送事件，驱动 LLM 流式生成并实时推送 token 至客户端
   *
   * @param client - WebSocket 客户端实例
   * @param data - 聊天发送数据，包含会话 UUID、消息内容、模型 ID、温度参数等
   */
  @SubscribeMessage('chat.send')
  async handleChatSend(client: WebSocket, data: AiWsChatSendData) {
    const meta = this.requireAuth(client);
    if (!meta?.session) return;

    const emit = (event: AiWsServerEvent, payload: unknown) => this.send(client, event, payload);

    try {
      await this.chatService.handleChatSend(meta.session, data, emit);
    } catch (err: any) {
      this.send(client, 'chat.error', {
        code: err?.status ?? 500,
        message: err?.message ?? '发送失败',
      });
    }
  }

  @SubscribeMessage('chat.stop')
  handleChatStop(client: WebSocket, data: AiWsChatStopData) {
    if (!this.requireAuth(client)) return;
    this.aiStreamStopService.publishStop(data?.message_uuid, data?.session_uuid);
  }

  /**
   * 校验客户端是否已通过鉴权，若未认证则发送错误事件并返回 null
   *
   * @param client - WebSocket 客户端实例
   * @returns 已认证客户端的元数据，若未认证则返回 null
   */
  private requireAuth(client: WebSocket): WsClientMeta | null {
    const meta = this.clients.get(client);
    if (!meta?.authed || !meta.session) {
      this.send(client, 'auth.error', { message: '请先发送 auth 事件' });
      return null;
    }
    return meta;
  }

  private send(client: WebSocket, event: AiWsServerEvent | 'auth.error', data: unknown) {
    if (client.readyState !== WebSocket.OPEN) return;
    const envelope: AiWsEnvelope = { event: event as AiWsClientEvent | AiWsServerEvent, data };
    client.send(JSON.stringify(envelope));
  }
}
