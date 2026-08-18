export type MindLlmStreamFrame = { type: 'think' | 'data'; payload: string };

const THINK_START = ['\u003cthink\u003e', '<think>'] as const;
const THINK_END = ['\u003c/think\u003e', '</think>'] as const;
const THINK_FLUSH_MIN_CHARS = 40;
const THINK_FLUSH_MAX_CHARS = 160;

/** ponytail: single-pass tag scan; upgrade to a real streaming tokenizer if nested tags appear */
export class MindLlmStreamParser {
  private inThink = false;

  /**
   * 处理输入的流式 token，解析其中的 think 标签，返回结构化帧数组。
   * @param token - 输入的文本 token
   * @returns 解析后的帧数组（think/data 类型）
   */
  feed(token: string): MindLlmStreamFrame[] {
    const frames: MindLlmStreamFrame[] = [];
    let text = token;

    while (text.length > 0) {
      if (this.inThink) {
        const hit = findEarliest(text, THINK_END);
        if (hit.index < 0) {
          frames.push({ type: 'think', payload: text });
          break;
        }
        if (hit.index > 0) frames.push({ type: 'think', payload: text.slice(0, hit.index) });
        text = text.slice(hit.index + hit.marker.length);
        this.inThink = false;
        continue;
      }

      const hit = findEarliest(text, THINK_START);
      if (hit.index < 0) {
        if (text) frames.push({ type: 'data', payload: text });
        break;
      }
      if (hit.index > 0) frames.push({ type: 'data', payload: text.slice(0, hit.index) });
      text = text.slice(hit.index + hit.marker.length);
      this.inThink = true;
    }

    return frames.filter((f) => f.payload);
  }
}

class MindThinkFrameBuffer {
  private buffer = '';

  /**
   * 处理输入的流式帧，对 think 类型帧进行缓冲合并，非 think 帧立即刷新缓冲后返回。
   * @param frame - 输入的帧
   * @returns 达到刷新条件时输出的帧数组
   */
  feed(frame: MindLlmStreamFrame): MindLlmStreamFrame[] {
    if (frame.type !== 'think') {
      return [...this.flush(), frame];
    }

    this.buffer += frame.payload;
    if (!this.shouldFlush()) return [];
    return this.flush();
  }

  flush(): MindLlmStreamFrame[] {
    const payload = this.buffer;
    this.buffer = '';
    return payload ? [{ type: 'think', payload }] : [];
  }

  private shouldFlush() {
    if (this.buffer.length >= THINK_FLUSH_MAX_CHARS) return true;
    if (this.buffer.includes('\n')) return true;
    if (this.buffer.length < THINK_FLUSH_MIN_CHARS) return false;
    return /[。！？!?；;：:]$/.test(this.buffer.trim());
  }
}

/**
 * 在文本中查找最早出现的标记（支持多个候选项）。
 * @param text - 待搜索文本
 * @param markers - 要查找的标记列表
 * @returns 最早出现的索引和对应的标记
 */
function findEarliest(text: string, markers: readonly string[]) {
  let index = -1;
  let marker = '';
  for (const m of markers) {
    if (!m) continue;
    const i = text.indexOf(m);
    if (i !== -1 && (index === -1 || i < index)) {
      index = i;
      marker = m;
    }
  }
  return { index, marker };
}

/**
 * 从 LLM 响应数据块中提取文本内容。支持字符串内容和数组格式。
 * @param chunk - LLM 响应数据块
 * @returns 提取的文本字符串
 */
export function extractLlmChunkText(chunk: any): string {
  const content = chunk?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block?.type === 'thinking' || block?.type === 'reasoning') {
          return String(block.thinking || block.text || block.content || '');
        }
        return String(block?.text ?? block?.content ?? '');
      })
      .join('');
  }
  return content == null ? '' : String(content);
}

/**
 * 从 LLM 响应数据块中提取推理（reasoning）文本。
 * @param chunk - LLM 响应数据块
 * @returns 推理文本字符串
 */
export function extractLlmReasoningText(chunk: any): string {
  const reasoning =
    chunk?.additional_kwargs?.reasoning_content ??
    chunk?.additional_kwargs?.reasoning ??
    chunk?.message?.additional_kwargs?.reasoning_content ??
    chunk?.message?.additional_kwargs?.reasoning;
  return reasoning == null ? '' : String(reasoning);
}

/**
 * 解析 LLM 流式响应数据块，生成结构化的帧序列（think/data）。
 * @param chunk - LLM 响应数据块
 * @param parser - 流解析器实例
 * @yields 解析后的帧（think 或 data 类型）
 */
export function* parseLlmStreamChunk(chunk: any, parser: MindLlmStreamParser): Generator<MindLlmStreamFrame> {
  const reasoning = extractLlmReasoningText(chunk);
  if (reasoning) yield { type: 'think', payload: reasoning };

  const content = chunk?.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block === 'string') {
        yield* parser.feed(block);
        continue;
      }
      if (block?.type === 'thinking' || block?.type === 'reasoning') {
        const text = String(block.thinking || block.text || block.content || '');
        if (text) yield { type: 'think', payload: text };
        continue;
      }
      const text = String(block?.text ?? block?.content ?? '');
      if (text) yield* parser.feed(text);
    }
    return;
  }

  const token = extractLlmChunkText(chunk);
  if (!token) return;
  yield* parser.feed(token);
}

/** 流式输出 LLM 回复；兼容 doubao-seed 等 reasoning chunk（数组 content / additional_kwargs） */
export async function* streamChatModelText(llm: any, messages: any[]): AsyncGenerator<MindLlmStreamFrame> {
  const parser = new MindLlmStreamParser();
  const thinkBuffer = new MindThinkFrameBuffer();
  let hasData = false;
  try {
    const stream = await llm.stream(messages);
    for await (const chunk of stream as any) {
      for (const frame of parseLlmStreamChunk(chunk, parser)) {
        if (frame.type === 'data' && frame.payload) hasData = true;
        for (const out of thinkBuffer.feed(frame)) yield out;
      }
    }
  } catch {
    for (const out of thinkBuffer.flush()) yield out;
    const text = extractLlmChunkText(await llm.invoke(messages));
    if (text.trim()) yield { type: 'data', payload: text };
    return;
  }
  for (const out of thinkBuffer.flush()) yield out;
  if (hasData) return;
  const text = extractLlmChunkText(await llm.invoke(messages));
  if (!text.trim()) return;
  const fb = new MindLlmStreamParser();
  const fbThinkBuffer = new MindThinkFrameBuffer();
  let emitted = false;
  for (const frame of fb.feed(text)) {
    emitted = true;
    for (const out of fbThinkBuffer.feed(frame)) yield out;
  }
  for (const out of fbThinkBuffer.flush()) yield out;
  if (!emitted) yield { type: 'data', payload: text };
}

/** ponytail: fails if plain-text streaming regresses into think-only mode */
export function mindLlmStreamSelfCheck() {
  const plain = new MindLlmStreamParser().feed('hello world');
  if (plain.length !== 1 || plain[0].type !== 'data') throw new Error('plain text must be data');

  const tagged = new MindLlmStreamParser();
  const frames = [
    ...tagged.feed('\u003cthink\u003eabc'),
    ...tagged.feed('\u003c/think\u003e'),
    ...tagged.feed('answer'),
  ];
  const think = frames.filter((f) => f.type === 'think').map((f) => f.payload).join('');
  const data = frames.filter((f) => f.type === 'data').map((f) => f.payload).join('');
  if (think !== 'abc' || data !== 'answer') throw new Error('think tag split failed');

  const buffer = new MindThinkFrameBuffer();
  const buffered = [...buffer.feed({ type: 'think', payload: 'a' }), ...buffer.feed({ type: 'think', payload: 'b' }), ...buffer.flush()];
  if (buffered.length !== 1 || buffered[0].payload !== 'ab') throw new Error('think token buffering failed');
}
