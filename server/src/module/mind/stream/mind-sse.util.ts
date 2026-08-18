import type { Request, Response } from 'express';

export type MindSseEventType = 'event' | 'think' | 'data';

/**
 * 初始化 SSE（Server-Sent Events）连接。
 * 设置响应头为事件流格式，注册请求关闭/中止时的 AbortController 信号。
 * @param req - Express 请求对象，用于监听关闭事件
 * @param res - Express 响应对象，用于设置 SSE 头信息
 * @returns AbortController，用于检测客户端是否断开连接
 */
export function initMindSse(req: Request, res: Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as any).flushHeaders?.();

  const abort = new AbortController();
  req.on('close', () => abort.abort());
  req.on('aborted', () => abort.abort());
  return abort;
}

/**
 * 写入 SSE 数据帧。
 * 将多行负载按行拆分为 SSE 兼容的字段行，逐行写入响应流。
 * @param res - Express 响应对象
 * @param type - 事件类型（event/think/data）
 * @param payload - 负载内容
 */
export function writeMindSse(res: Response, type: MindSseEventType, payload: string) {
  // ponytail: split multiline payload into SSE-compliant field lines
  const normalized = String(payload ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = normalized
    .split('\n')
    .map((line) => `${type}: ${line}`)
    .join('\n');
  res.write(`${body}\n\n`);
  (res as any).flush?.();
}

export function writeMindSseKeepalive(res: Response) {
  res.write(': keepalive\n\n');
  (res as any).flush?.();
}

export function writeMindSseEvent(res: Response, payload: string) {
  writeMindSse(res, 'event', payload);
}

export function writeMindSseThink(res: Response, payload: string) {
  writeMindSse(res, 'think', payload);
}

export function writeMindSseData(res: Response, payload: string) {
  writeMindSse(res, 'data', payload);
}

