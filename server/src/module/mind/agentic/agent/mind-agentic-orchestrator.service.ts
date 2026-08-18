import { Injectable } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { MindAgentToolsService } from '../tools/agent-tools.service';
import { streamChatModelText } from '../../llm/mind-llm-stream.util';
import { tryExtractResponseJson } from './agent-json.util';

export type MindAgenticFrame = { type: 'think' | 'data'; payload: string };

export type MindAgenticCtx = {
  query: string;
  memory: string;
  pattern: string;
  llm: BaseChatModel;
};

type ToolAgentName = 'calculate' | 'weather' | 'stock' | 'search';

@Injectable()
export class MindAgenticOrchestratorService {
  constructor(private readonly agentTools: MindAgentToolsService) {}

  isAgenticPattern(pattern?: string) {
    return ['Supervisor', 'Collaboration', 'Hierarchical'].includes(String(pattern || '').trim());
  }

  /**
   * 运行多智能体编排，根据 pattern 分发到 Supervisor/Collaboration/Hierarchical 模式。
   * @param ctx - 包含 query、memory、pattern、llm 的上下文对象
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  async *run(ctx: MindAgenticCtx): AsyncGenerator<MindAgenticFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    const pattern = String(ctx.pattern || 'Supervisor').trim();
    if (pattern === 'Collaboration') {
      yield* this.runCollaboration(ctx);
      return;
    }
    if (pattern === 'Hierarchical') {
      yield* this.runHierarchical(ctx);
      return;
    }
    yield* this.runSupervisor(ctx);
  }

  /**
   * 执行 Supervisor（监督者）模式：由监督节点路由到子智能体，循环迭代直到完成。
   * @param ctx - 执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runSupervisor(ctx: MindAgenticCtx): AsyncGenerator<MindAgenticFrame> {
    const docs: string[] = [];
    for (let i = 0; i < 4; i++) {
      const agent = await this.route(ctx, docs.join('\n\n'));
      yield { type: 'think', payload: `Supervisor 节点路由输出：${agent}\n\n` };
      if (agent === 'finish') break;
      const result = await this.invokeToolAgent(agent, ctx.query);
      docs.push(`${agent}: ${result}`);
      yield { type: 'think', payload: `${agent} 节点执行结果：\n\n${result.slice(0, 800)}\n\n` };
      if (this.canFinish(ctx.query, result)) break;
    }
    yield* this.finalAnswer(ctx, docs);
  }

  /**
   * 执行 Collaboration（协作）模式：所有子智能体并行执行，汇总结果生成答案。
   * @param ctx - 执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runCollaboration(ctx: MindAgenticCtx): AsyncGenerator<MindAgenticFrame> {
    const agents: ToolAgentName[] = ['calculate', 'weather', 'stock', 'search'];
    const docs: string[] = [];
    for (const agent of agents) {
      if (!(await this.isUseful(ctx.llm, ctx.query, agent))) continue;
      const result = await this.invokeToolAgent(agent, ctx.query);
      docs.push(`${agent}: ${result}`);
      yield { type: 'think', payload: `Collaboration 调用 ${agent} 节点：\n\n${result.slice(0, 800)}\n\n` };
    }
    if (!docs.length) {
      const result = await this.invokeToolAgent('search', ctx.query);
      docs.push(`search: ${result}`);
      yield { type: 'think', payload: `Collaboration 默认调用 search 节点：\n\n${result.slice(0, 800)}\n\n` };
    }
    yield* this.finalAnswer(ctx, docs);
  }

  /**
   * 执行 Hierarchical（层级）模式：先规划任务步骤，再按层级顺序执行子智能体。
   * @param ctx - 执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runHierarchical(ctx: MindAgenticCtx): AsyncGenerator<MindAgenticFrame> {
    const plan = await this.llmText(
      ctx.llm,
      `你是任务规划专家，请将问题拆成不超过4个步骤，每步指定一个节点：calculate/weather/stock/search。只输出 JSON：{"steps":[{"agent":"search","task":"..."}]}\n问题：${ctx.query}`,
    );
    const steps = (tryExtractResponseJson(plan)?.steps || []) as Array<{ agent?: string; task?: string }>;
    const docs: string[] = [];
    for (const step of steps.slice(0, 4)) {
      const agent = this.normalizeAgent(step.agent);
      const task = step.task || ctx.query;
      const result = await this.invokeToolAgent(agent, task);
      docs.push(`${agent}(${task}): ${result}`);
      yield { type: 'think', payload: `Hierarchical 执行 ${agent} 子任务：${task}\n\n${result.slice(0, 800)}\n\n` };
    }
    if (!docs.length) {
      const result = await this.invokeToolAgent('search', ctx.query);
      docs.push(`search: ${result}`);
      yield { type: 'think', payload: `Hierarchical 默认执行 search 子任务：\n\n${result.slice(0, 800)}\n\n` };
    }
    yield* this.finalAnswer(ctx, docs);
  }

  /**
   * 路由函数：根据用户问题和当前答案，决定下一个调用的智能体节点或标记完成。
   * @param ctx - 执行上下文
   * @param answer - 当前已累积的答案文本
   * @returns 下一个智能体名称（calculate/weather/stock/search）或 'finish'
   */
  private async route(ctx: MindAgenticCtx, answer: string): Promise<ToolAgentName | 'finish'> {
    const raw = await this.llmText(
      ctx.llm,
      `你是一位精准的问题-答案分析专家。根据用户问题和当前答案，返回下列节点之一：calculate, weather, stock, search, finish。\n当前答案足够时返回 finish。\n只输出 JSON：{"agent":"search"}\n\n用户问题：${ctx.query}\n答案：${answer}\n历史记忆：${ctx.memory || '(empty)'}`,
    );
    const parsed = String(tryExtractResponseJson(raw)?.agent || raw).trim().toLowerCase();
    if (parsed.includes('finish')) return 'finish';
    return this.normalizeAgent(parsed);
  }

  /**
   * 标准化智能体名称，将各种输入映射到受支持的 ToolAgentName。
   * @param agent - 原始智能体名称字符串
   * @returns 标准化的智能体名称
   */
  private normalizeAgent(agent?: string): ToolAgentName {
    const s = String(agent || '').toLowerCase();
    if (s.includes('calculate')) return 'calculate';
    if (s.includes('weather')) return 'weather';
    if (s.includes('stock')) return 'stock';
    return 'search';
  }

  /**
   * 判断指定节点是否有助于回答用户问题。
   * @param llm - 语言模型实例
   * @param query - 用户问题
   * @param agent - 待判断的智能体名称
   * @returns 是否有帮助
   */
  private async isUseful(llm: BaseChatModel, query: string, agent: ToolAgentName) {
    const raw = await this.llmText(
      llm,
      `判断节点 ${agent} 是否有助于回答问题，只输出 yes 或 no。\n问题：${query}`,
    );
    return /yes|是|true|有助/.test(raw.toLowerCase());
  }

  /**
   * 调用指定智能体工具执行任务。
   * @param agent - 智能体名称
   * @param query - 查询参数
   * @returns 工具执行结果字符串
   */
  private async invokeToolAgent(agent: ToolAgentName, query: string) {
    try {
      if (agent === 'calculate') return this.agentTools.invokeTool('calculate_number', { expression: this.extractExpression(query) });
      if (agent === 'weather') return this.agentTools.invokeTool('search_weather', { city: query });
      if (agent === 'stock') return this.agentTools.invokeTool('snatch_stock_price', { symbol: query, query_date: '' });
      return this.agentTools.invokeTool('search_web', { query });
    } catch (e: any) {
      return `${agent} 节点执行失败：${e?.message || 'unknown'}`;
    }
  }

  private extractExpression(query: string) {
    return query.match(/[0-9+\-*/().%\s]+/)?.[0]?.trim() || query;
  }

  private canFinish(query: string, result: string) {
    const q = query.replace(/\s+/g, '');
    const r = result.replace(/\s+/g, '');
    return r.length > 20 && (q.length < 4 || [...q.slice(0, 12)].some((ch) => r.includes(ch)));
  }

  /**
   * 根据多智能体执行结果生成最终答案并以流式输出。
   * @param ctx - 执行上下文
   * @param docs - 各智能体的执行结果文档数组
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *finalAnswer(ctx: MindAgenticCtx, docs: string[]): AsyncGenerator<MindAgenticFrame> {
    const prompt = `你是一位问题答疑专家，请根据多智能体执行结果用中文详尽回答问题。\n\n问题：${ctx.query}\n\n历史记忆：${ctx.memory || '(empty)'}\n\n执行结果：\n${docs.join('\n\n') || '(empty)'}`;
    for await (const frame of streamChatModelText(ctx.llm, [new HumanMessage(prompt)])) {
      yield frame;
    }
  }

  /**
   * 调用 LLM 获取文本响应，统一处理多种 content 格式（字符串、数组等）。
   * @param llm - 语言模型实例
   * @param prompt - 提示词文本
   * @returns 模型返回的文本内容
   */
  private async llmText(llm: BaseChatModel, prompt: string) {
    const res: any = await llm.invoke([new HumanMessage(prompt)]);
    const content = res?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((v) => (typeof v === 'string' ? v : String(v?.text ?? v?.content ?? ''))).join('');
    return content == null ? '' : String(content);
  }
}
