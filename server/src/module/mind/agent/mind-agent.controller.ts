import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { initMindSse, writeMindSse } from '../stream/mind-sse.util';
import { MindAgentInvokeDto, MindTravelInvokeDto } from './dto';
import { MindAgentService } from './mind-agent.service';

@Controller('api/mind')
export class MindAgentController {
  constructor(private readonly agentService: MindAgentService) {}

  /**
   * 处理智能体（Agent）模式调用请求，通过 SSE 流式返回结果。
   * @param body - 包含查询、来源ID、模型参数等的请求体
   * @param req - Express 请求对象，用于初始化 SSE 连接
   * @param res - Express 响应对象，用于流式输出
   */
  @Post('agent/invoke')
  async agent(@Body() body: MindAgentInvokeDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of this.agentService.invoke(body, 'agent')) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }

  /**
   * 处理 Agentic 模式调用请求，通过 SSE 流式返回结果。
   * @param body - 包含查询、来源ID、模型参数等的请求体
   * @param req - Express 请求对象，用于初始化 SSE 连接
   * @param res - Express 响应对象，用于流式输出
   */
  @Post('agentic/invoke')
  async agentic(@Body() body: MindAgentInvokeDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of this.agentService.invoke(body, 'agentic')) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }

  /**
   * 处理搜索（Search）模式调用请求，通过 SSE 流式返回结果。
   * @param body - 包含查询、来源ID、模型参数等的请求体
   * @param req - Express 请求对象，用于初始化 SSE 连接
   * @param res - Express 响应对象，用于流式输出
   */
  @Post('search/invoke')
  async search(@Body() body: MindAgentInvokeDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of this.agentService.invoke(body, 'search')) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }

  /**
   * 处理主题（Topic）模式调用请求，通过 SSE 流式返回结果。
   * @param body - 包含查询、来源ID、模型参数等的请求体
   * @param req - Express 请求对象，用于初始化 SSE 连接
   * @param res - Express 响应对象，用于流式输出
   */
  @Post('topic/invoke')
  async topic(@Body() body: MindAgentInvokeDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of this.agentService.invoke(body, 'topic')) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }

  /**
   * 处理旅游规划（Travel）模式调用请求，通过 SSE 流式返回结果。
   * @param body - 包含旅游规划参数（出发地、目的地、时间等）的请求体
   * @param req - Express 请求对象，用于初始化 SSE 连接
   * @param res - Express 响应对象，用于流式输出
   */
  @Post('travel/invoke')
  async travel(@Body() body: MindTravelInvokeDto, @Req() req: Request, @Res() res: Response) {
    const abort = initMindSse(req, res);
    try {
      for await (const frame of this.agentService.invokeTravel(body)) {
        if (abort.signal.aborted) break;
        writeMindSse(res, frame.type, frame.payload);
      }
    } finally {
      res.end();
    }
  }
}
