/** 对齐 Python common_utils.extract_response_json */
export function extractResponseJson(text: string): Record<string, any> {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fenced) return JSON.parse(fenced[1]);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error('No valid JSON found');
}

/**
 * 安全尝试从文本中提取 JSON 对象，失败时返回 null 而非抛出异常。
 * @param text - 可能包含 JSON 的文本
 * @returns 解析后的 JSON 对象，或 null
 */
export function tryExtractResponseJson(text: string): Record<string, any> | null {
  try {
    return extractResponseJson(text);
  } catch {
    return null;
  }
}

/**
 * 将文本按固定步长分块并以异步生成器方式流式输出，模拟流式效果。
 * @param text - 待输出的文本
 * @yields 文本分块
 */
export async function* streamText(text: string) {
  const s = String(text || '');
  if (!s) return;
  const step = Math.max(1, Math.floor(s.length / 80));
  for (let i = 0; i < s.length; i += step) {
    yield s.slice(i, i + step);
  }
}
