import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResultData } from '../../../common/utils/result';
import { initMindSse, writeMindSse, writeMindSseKeepalive } from '../stream/mind-sse.util';
import { MindChatDto, MindImageGenerateDto } from './dto';
import { MindModalService } from './mind-modal.service';

@Controller('api/mind')
export class MindModalController {
  constructor(private readonly modalService: MindModalService) {}

  @Post('llm/chat')
  /**
   * 处理 LLM 对话请求。
   * 建立 SSE 连接，每 15 秒发送心跳保活，流式消费聊天生成的帧数据并实时推送给客户端。
   * @param body - 聊天请求参数，包含查询文本、来源标识等
   * @param req - Express 请求对象，用于监听连接关闭事件
   * @param res - Express 响应对象，用于 SSE 推送
   */
  async chat(@Body() body: MindChatDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    const heartbeat = setInterval(() => {
      if (!abort.signal.aborted) writeMindSseKeepalive(res);
    }, 15000);
    try {
      for await (const frame of this.modalService.chat(body)) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }

  @Get('image/generate')
  async generate(@Query() query: MindImageGenerateDto) {
    const data = await this.modalService.generateImage(query);
    return ResultData.ok(data);
  }
}

