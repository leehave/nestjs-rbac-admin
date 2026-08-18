import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MindRetrievalInvokeDto } from './dto';
import { MindRetrievalService } from './mind-retrieval.service';
import { initMindSse, writeMindSse } from '../stream/mind-sse.util';

@Controller('api/mind')
export class MindRetrievalController {
  constructor(private readonly retrievalService: MindRetrievalService) {}

  /**
   * 流式写入 SSE 响应。
   * 初始化 SSE 连接，遍历异步生成器产生的帧数据，逐帧推送给客户端。
   * @param req - Express 请求对象，用于监听连接关闭
   * @param res - Express 响应对象，用于 SSE 推送
   * @param generator - 异步生成器，产出事件/思考/数据帧
   */
  private async writeStream(req: Request, res: Response, generator: AsyncGenerator<{ type: 'event' | 'think' | 'data'; payload: string }>) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of generator) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }

  @Post('retrieval/rag')
  async rag(@Body() body: MindRetrievalInvokeDto, @Req() req: Request, @Res() res: Response) {
    return this.writeStream(req, res, this.retrievalService.invokeRag(body));
  }

  @Post('retrieval/advance')
  async advance(@Body() body: MindRetrievalInvokeDto, @Req() req: Request, @Res() res: Response) {
    return this.writeStream(req, res, this.retrievalService.invokeAdvance(body));
  }

  @Post('special/rag')
  async special(@Body() body: MindRetrievalInvokeDto, @Req() req: Request, @Res() res: Response) {
    return this.writeStream(req, res, this.retrievalService.invokeSpecial(body));
  }

  @Post('program/retrieve')
  async program(@Body() body: MindRetrievalInvokeDto, @Req() req: Request, @Res() res: Response) {
    return this.writeStream(req, res, this.retrievalService.invokeProgram(body));
  }

  @Post('arxiv/retrieve')
  async arxiv(@Body() body: MindRetrievalInvokeDto, @Req() req: Request, @Res() res: Response) {
    return this.writeStream(req, res, this.retrievalService.invokeArxiv(body));
  }
}
