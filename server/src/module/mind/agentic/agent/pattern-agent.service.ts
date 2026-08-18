import { Injectable, Logger } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MindPromptService } from '../prompt/mind-prompt.service';
import { MindAgentToolsService, type MindToolDef } from '../tools/agent-tools.service';
import { extractResponseJson, streamText, tryExtractResponseJson } from './agent-json.util';

export type PatternAgentFrame = { type: 'think' | 'data'; payload: string };

type PlanStep = {
  index?: number;
  detail?: string;
  function?: string;
  funcName?: string;
  param?: Record<string, string>;
  funcParams?: Record<string, string>;
  funcParam?: Record<string, string>;
};

const PATTERN_AGENTS = new Set(['ReAct', 'ReWOO', 'PlanExecute', 'Reflection', 'SelfDiscover', 'Reflexion']);

@Injectable()
export class MindPatternAgentService {
  private readonly logger = new Logger(MindPatternAgentService.name);

  constructor(
    private readonly promptService: MindPromptService,
    private readonly agentTools: MindAgentToolsService,
  ) {}

  isPatternAgent(pattern?: string) {
    return PATTERN_AGENTS.has(String(pattern || '').trim());
  }

  /**
   * 运行指定的模式智能体（Pattern Agent），根据 pattern 分发到不同的执行方法。
   * 支持 ReAct、ReWOO、PlanExecute、Reflection、SelfDiscover、Reflexion 六种模式。
   * @param args - 包含 pattern、query、memory、llm、maxStep 的参数对象
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  async *run(args: {
    pattern: string;
    query: string;
    memory: string;
    llm: BaseChatModel;
    maxStep?: number;
  }): AsyncGenerator<PatternAgentFrame> {
    const pattern = String(args.pattern || 'ReAct').trim();
    const tools = this.agentTools.getExecuteTools();
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };

    try {
      if (pattern === 'ReAct') {
        yield* this.runReAct(args.query, args.memory, args.llm, tools, args.maxStep ?? 3);
        return;
      }
      if (pattern === 'ReWOO') {
        yield* this.runReWOO(args.query, args.memory, args.llm, tools);
        return;
      }
      if (pattern === 'PlanExecute') {
        yield* this.runPlanExecute(args.query, args.memory, args.llm, tools);
        return;
      }
      if (pattern === 'Reflection') {
        yield* this.runReflection(args.query, args.memory, args.llm, tools);
        return;
      }
      if (pattern === 'SelfDiscover') {
        yield* this.runSelfDiscover(args.query, args.memory, args.llm, tools);
        return;
      }
      if (pattern === 'Reflexion') {
        yield* this.runReflexion(args.query, args.memory, args.llm, tools, args.maxStep ?? 2);
        return;
      }
    } catch (e: any) {
      this.logger.error(`Pattern agent ${pattern} failed: ${e?.message}`);
      throw e;
    }
  }

  private currentDate() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  private async llmText(llm: BaseChatModel, prompt: string) {
    const res: any = await llm.invoke([{ role: 'user', content: prompt } as any]);
    return typeof res?.content === 'string' ? res.content : String(res?.content ?? '');
  }

  /**
   * 生成计划步骤的 JSON Schema 示例字符串。
   * @returns 格式化的 JSON 示例
   */
  private planSchema() {
    return JSON.stringify(
      { plans: [{ index: 1, detail: '...', function: 'search_web', param: { query: '...' } }] },
      null,
      2,
    );
  }

  private observeSchema() {
    return JSON.stringify({ flag: 'yes', result: '...' }, null, 2);
  }

  /**
   * 标准化解析计划步骤 JSON，兼容多种字段命名风格（function/funcName，param/funcParams/funcParam 等）。
   * @param raw - 原始解析结果对象
   * @returns 标准化后的计划步骤数组
   */
  private normalizePlan(raw: any): PlanStep[] {
    const plans = raw?.plans || raw?.steps || [];
    if (!Array.isArray(plans)) return [];
    return plans.map((p: any, idx: number) => ({
      index: p.index ?? idx + 1,
      detail: p.detail,
      function: p.function || p.funcName,
      funcName: p.funcName || p.function,
      param: p.param || p.funcParams || p.funcParam || {},
      funcParams: p.funcParams || p.param || p.funcParam || {},
      funcParam: p.funcParam || p.param || p.funcParams || {},
    }));
  }

  /**
   * 依次执行计划中的每个步骤，调用对应的工具并收集结果。
   * @param steps - 计划步骤数组
   * @param tools - 可用工具映射表
   * @returns 执行结果和思考过程的汇总对象
   */
  private async execPlanSteps(steps: PlanStep[], tools: Record<string, MindToolDef>) {
    const results: string[] = [];
    const thinks: string[] = [];
    for (const step of steps) {
      const name = step.function || step.funcName || '';
      const params = step.param || step.funcParams || step.funcParam || {};
      if (name && tools[name]) {
        const result = await tools[name].invoke(params as Record<string, string>);
        results.push(result);
        thinks.push(`执行工具：${name}\n\n工具执行结果为：\n\n${result}\n\n`);
      } else if (step.detail) {
        results.push(step.detail);
      }
    }
    return { results, thinks: thinks.join('') };
  }

  /**
   * 以流式方式输出最终答案文本。
   * @param answer - 最终答案字符串
   * @yields { type: 'data', payload: string } 数据帧
   */
  private async *emitAnswer(answer: string): AsyncGenerator<PatternAgentFrame> {
    for await (const chunk of streamText(answer)) {
      yield { type: 'data' as const, payload: chunk };
    }
  }

  /** ponytail: loop mirrors Python LangGraph react_agent topology */
  private async *runReAct(
    query: string,
    memory: string,
    llm: BaseChatModel,
    tools: Record<string, MindToolDef>,
    maxStep: number,
  ): AsyncGenerator<PatternAgentFrame> {
    const promptBlock = this.promptService.selectPrompt('agent_pattern.yml', 'react_agent');
    const toolDescs = this.agentTools.buildToolsDescription(tools);

    let count = 0;
    let flag = 'no';
    let answer = '';
    while (count < maxStep && flag !== 'yes') {
      const reasonPrompt = this.promptService.formatTemplate(promptBlock?.reason || '', {
        current_date: this.currentDate(),
        input: query,
        tool_descs: toolDescs,
        format_instructions: this.planSchema(),
      });
      const reasonRaw = await this.llmText(llm, reasonPrompt);
      const steps = this.normalizePlan(extractResponseJson(reasonRaw));
      yield { type: 'think', payload: `ReAct 推理出共 ${steps.length} 步骤：\n\n${JSON.stringify(steps)}\n\n` };

      const { results, thinks } = await this.execPlanSteps(steps, tools);
      yield { type: 'think', payload: thinks };

      const observePrompt = this.promptService.formatTemplate(promptBlock?.observe || '', {
        current_date: this.currentDate(),
        query,
        results: JSON.stringify(results),
        memorys: memory,
        format_instructions: this.observeSchema(),
      });
      const observeRaw = await this.llmText(llm, observePrompt);
      const parsed = tryExtractResponseJson(observeRaw) || { flag: 'yes', result: observeRaw };
      flag = String(parsed.flag || 'yes');
      answer = String(parsed.result || parsed.answer || observeRaw);
      count += 1;
      yield { type: 'think', payload: `观察回答结果：\n\n${observeRaw}\n\n` };
    }
    yield* this.emitAnswer(answer);
  }

  /**
   * 执行 ReWOO（Reasoning Without Observation）模式智能体。
   * 先规划步骤并依次执行工具，最后汇总结果生成答案。
   * @param query - 用户问题
   * @param memory - 历史记忆文本
   * @param llm - 语言模型实例
   * @param tools - 可用工具映射表
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runReWOO(query: string, memory: string, llm: BaseChatModel, tools: Record<string, MindToolDef>): AsyncGenerator<PatternAgentFrame> {
    const block = this.promptService.selectPrompt('agent_pattern.yml', 'rewoo_agent');
    const toolDescs = this.agentTools.buildToolsDescription(tools);
    const planPrompt = this.promptService.formatTemplate(block?.plan || '', {
      current_date: this.currentDate(),
      tool_descs: toolDescs,
      task: query,
    });
    const steps = this.normalizePlan(tryExtractResponseJson(await this.llmText(llm, planPrompt)) || { plans: [] });
    yield { type: 'think', payload: `ReWOO 推理出共 ${steps.length} 步骤\n\n` };

    let planStr = '';
    for (const step of steps) {
      const name = step.funcName || step.function || '';
      const params = step.funcParams || step.param || {};
      if (name && tools[name]) {
        const result = await tools[name].invoke(params as Record<string, string>);
        planStr += `Plan: ${step.index} ${step.detail} = ${name}[${JSON.stringify(params)}]\n`;
        yield { type: 'think', payload: `执行工具 ${name}：\n\n${result}\n\n` };
      }
    }

    const answer = await this.llmText(
      llm,
      this.promptService.formatTemplate(block?.solve || '', {
        current_date: this.currentDate(),
        plan: planStr,
        task: query,
        memorys: memory,
      }),
    );
    yield* this.emitAnswer(answer);
  }

  /**
   * 执行 PlanExecute（规划-执行）模式智能体。
   * 先生成计划、逐步执行，然后根据执行结果重新规划，最多迭代 4 轮。
   * @param query - 用户问题
   * @param memory - 历史记忆文本
   * @param llm - 语言模型实例
   * @param tools - 可用工具映射表
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runPlanExecute(query: string, memory: string, llm: BaseChatModel, tools: Record<string, MindToolDef>): AsyncGenerator<PatternAgentFrame> {
    const block = this.promptService.selectPrompt('agent_pattern.yml', 'plan_execute_agent');
    const toolDescs = this.agentTools.buildToolsDescription(tools);
    let plans = this.normalizePlan(
      tryExtractResponseJson(
        await this.llmText(
          llm,
          this.promptService.formatTemplate(block?.plan || '', {
            current_date: this.currentDate(),
            tool_descs: toolDescs,
            task: query,
          }),
        ),
      ) || { plans: [] },
    );
    yield { type: 'think', payload: `PlanExecute 推理出共 ${plans.length} 步骤\n\n` };

    let answer = '';
    for (let loop = 0; loop < 4 && !answer; loop++) {
      const step = plans[0];
      if (!step) break;
      let response = '';
      const name = step.funcName || step.function || '';
      const params = step.funcParams || step.param || {};
      if (name && tools[name]) response = await tools[name].invoke(params as Record<string, string>);
      else {
        response = await this.llmText(
          llm,
          this.promptService.formatTemplate(block?.execute || '', {
            plan_str: plans.map((p, i) => `${i + 1}.${p.detail}`).join('\n'),
            step: JSON.stringify(step),
          }),
        );
      }
      yield { type: 'think', payload: `PlanExecute 执行：\n\n${response}\n\n` };

      const replanRaw = await this.llmText(
        llm,
        this.promptService.formatTemplate(block?.replan || '', {
          query,
          plans: JSON.stringify(plans),
          past_steps: JSON.stringify([[step, response]]),
          memorys: memory,
        }),
      );
      const replan = tryExtractResponseJson(replanRaw);
      if (replan?.answer) answer = String(replan.answer);
      else if (replan?.plans) {
        plans = this.normalizePlan(replan);
        yield { type: 'think', payload: `PlanExecute 再次推理\n\n` };
      } else answer = replanRaw;
    }
    yield* this.emitAnswer(answer || '未能生成答案');
  }

  /**
   * 执行 Reflection（反思）模式智能体。
   * 在两轮迭代中生成回答并对结果进行反思改进。
   * @param query - 用户问题
   * @param memory - 历史记忆文本
   * @param llm - 语言模型实例
   * @param tools - 可用工具映射表
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runReflection(query: string, memory: string, llm: BaseChatModel, tools: Record<string, MindToolDef>): AsyncGenerator<PatternAgentFrame> {
    const block = this.promptService.selectPrompt('agent_pattern.yml', 'reflection_agent');
    const documents: string[] = [];
    let answer = '';
    for (let i = 0; i < 2; i++) {
      const routeRaw = await this.llmText(
        llm,
        this.promptService.formatTemplate(block?.generate || '', {
          current_date: this.currentDate(),
          question: query,
          documents: documents.join('\n'),
          memorys: memory,
        }),
      );
      const route = tryExtractResponseJson(routeRaw);
      const agent = route?.agent || 'search';
      if (agent === 'calculate') {
        answer = await tools.calculate_number.invoke({ expression: '1+1' });
      } else if (agent === 'weather') {
        answer = await tools.search_weather.invoke({ city: query });
      } else {
        answer = await tools.search_web.invoke({ query });
      }
      const reflect = await this.llmText(
        llm,
        this.promptService.formatTemplate(block?.reflect || '', {
          current_date: this.currentDate(),
          question: query,
          answer,
        }),
      );
      documents.push(reflect);
      yield { type: 'think', payload: `Reflection 分析：\n\n${reflect}\n\n` };
    }
    yield* this.emitAnswer(answer);
  }

  /**
   * 执行 SelfDiscover（自我发现）模式智能体。
   * 经过选择（select）、适配（adapt）、规划（plan）、执行（solve）四个阶段。
   * @param query - 用户问题
   * @param memory - 历史记忆文本
   * @param llm - 语言模型实例
   * @param tools - 可用工具映射表
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runSelfDiscover(query: string, memory: string, llm: BaseChatModel, tools: Record<string, MindToolDef>): AsyncGenerator<PatternAgentFrame> {
    const block = this.promptService.selectPrompt('agent_pattern.yml', 'self_dicover_agent');
    const toolDescs = this.agentTools.buildToolsDescription(tools);
    const modules = await this.llmText(llm, this.promptService.formatTemplate(block?.select || '', { question: query }));
    yield { type: 'think', payload: `SelfDiscover 选择：\n\n${modules}\n\n` };
    const instructions = await this.llmText(
      llm,
      this.promptService.formatTemplate(block?.adapt || '', { question: query, modules }),
    );
    yield { type: 'think', payload: `SelfDiscover 适配：\n\n${instructions}\n\n` };
    const planRaw = await this.llmText(
      llm,
      `${this.promptService.formatTemplate(block?.plan || '', { instructions, tool_descs: toolDescs, question: query })}\n输出 JSON plans`,
    );
    const plans = this.normalizePlan(tryExtractResponseJson(planRaw) || { plans: [] });
    const { results } = await this.execPlanSteps(plans, tools);
    const answer = await this.llmText(
      llm,
      this.promptService.formatTemplate(block?.solve || '', {
        context: results.join('\n'),
        question: query,
        structured_plan: plans.map((p) => p.detail).join('\n'),
        memorys: memory,
      }),
    );
    yield* this.emitAnswer(answer);
  }

  /**
   * 执行 Reflexion（反思-优化）模式智能体。
   * 在多次迭代中生成计划、执行工具、生成答案，然后反思修订计划，不断优化结果。
   * @param query - 用户问题
   * @param memory - 历史记忆文本
   * @param llm - 语言模型实例
   * @param tools - 可用工具映射表
   * @param maxIter - 最大迭代次数
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  private async *runReflexion(
    query: string,
    memory: string,
    llm: BaseChatModel,
    tools: Record<string, MindToolDef>,
    maxIter: number,
  ): AsyncGenerator<PatternAgentFrame> {
    const block = this.promptService.selectPrompt('agent_pattern.yml', 'reflexion_agent');
    const toolDescs = this.agentTools.buildToolsDescription(tools);
    let planRaw = await this.llmText(
      llm,
      this.promptService.formatTemplate(block?.response || '', {
        current_date: this.currentDate(),
        question: query,
        tool_descs: toolDescs,
      }),
    );
    let plan = this.normalizePlan(tryExtractResponseJson(planRaw) || { plans: [] })[0] || {};
    yield { type: 'think', payload: `Reflexion 计划：\n\n${planRaw}\n\n` };

    let answer = '';
    for (let i = 0; i < maxIter; i++) {
      let content: string | undefined;
      const name = plan.funcName || plan.function || '';
      const params = plan.funcParam || plan.param || plan.funcParams || {};
      if (name && tools[name]) content = await tools[name].invoke(params as Record<string, string>);
      answer = await this.llmText(
        llm,
        this.promptService.formatTemplate(block?.execute || '', {
          current_date: this.currentDate(),
          context: content || '',
          question: query,
          memorys: memory,
        }),
      );
      planRaw = await this.llmText(
        llm,
        this.promptService.formatTemplate(block?.revise || '', {
          current_date: this.currentDate(),
          question: query,
          order_plan: JSON.stringify(plan),
          tool_descs: toolDescs,
          answer,
        }),
      );
      plan = this.normalizePlan(tryExtractResponseJson(planRaw) || { plans: [] })[0] || plan;
      yield { type: 'think', payload: `Reflexion 优化：\n\n${planRaw}\n\n` };
    }
    yield* this.emitAnswer(answer);
  }
}
