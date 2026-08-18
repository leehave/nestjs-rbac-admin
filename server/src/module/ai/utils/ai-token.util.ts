/** ponytail: 粗估 token；中文为主约 1.6 字/token，升级路径 = tiktoken */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 1.6);
}

export function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
  // 每条消息约 +4 token 角色/格式开销
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}
