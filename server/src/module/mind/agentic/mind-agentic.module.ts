import { Module } from '@nestjs/common';
import { MindHistoryModule } from '../history/mind-history.module';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindSearchMemoryService } from './memory/search-memory.service';
import { MindAgentToolsService } from './tools/agent-tools.service';
import { MindMcpClientService } from './tools/mcp-client.service';
import { MindPromptService } from './prompt/mind-prompt.service';
import { MindPatternAgentService } from './agent/pattern-agent.service';
import { MindProgramAgentsService } from './agent/mind-program-agents.service';
import { MindAgenticOrchestratorService } from './agent/mind-agentic-orchestrator.service';

@Module({
  imports: [MindHistoryModule, MindLlmModule],
  providers: [
    MindSearchMemoryService,
    MindAgentToolsService,
    MindMcpClientService,
    MindPromptService,
    MindPatternAgentService,
    MindProgramAgentsService,
    MindAgenticOrchestratorService,
  ],
  exports: [
    MindSearchMemoryService,
    MindAgentToolsService,
    MindMcpClientService,
    MindPromptService,
    MindPatternAgentService,
    MindProgramAgentsService,
    MindAgenticOrchestratorService,
  ],
})
export class MindAgenticModule {}
