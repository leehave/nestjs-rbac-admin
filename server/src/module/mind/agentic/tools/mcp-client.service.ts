import { Injectable, Logger } from '@nestjs/common';

/** ponytail: MCP skeleton — upgrade path: @modelcontextprotocol/sdk ClientSession */
@Injectable()
export class MindMcpClientService {
  private readonly logger = new Logger(MindMcpClientService.name);

  async listTools(_serverUrl?: string): Promise<Array<{ name: string; description?: string }>> {
    this.logger.debug('MCP listTools not wired yet');
    return [];
  }

  async callTool(_serverUrl: string, _toolName: string, _args: Record<string, unknown>): Promise<string> {
    throw new Error('MCP client not configured');
  }
}
