export type ChunkPiece = { text: string; chunkIndex: number };

const DEFAULT_SEPARATORS = ['\n\n', '\n', '。', '. ', ' ', ''];

function splitBySeparator(text: string, separator: string): string[] {
  if (!separator) return [...text];
  const parts = text.split(separator);
  return parts.map((p, i) => (i < parts.length - 1 ? p + separator : p)).filter((p) => p.length > 0);
}

/** ponytail: mirrors RecursiveCharacterTextSplitter without extra dep */
function recursiveSplit(text: string, chunkSize: number, chunkOverlap: number, separators = DEFAULT_SEPARATORS): string[] {
  if (text.length <= chunkSize) return text ? [text] : [];
  const sep = separators[0];
  const nextSeps = separators.slice(1);
  const splits = sep ? splitBySeparator(text, sep) : [text];
  const out: string[] = [];
  let buf = '';

  const flush = () => {
    if (!buf) return;
    out.push(buf);
    buf = buf.slice(Math.max(0, buf.length - chunkOverlap));
  };

  for (const part of splits) {
    const candidate = buf ? buf + part : part;
    if (candidate.length <= chunkSize) {
      buf = candidate;
      continue;
    }
    if (buf) flush();
    if (part.length <= chunkSize) {
      buf = part;
      continue;
    }
    if (nextSeps.length) {
      out.push(...recursiveSplit(part, chunkSize, chunkOverlap, nextSeps));
      buf = '';
    } else {
      for (let i = 0; i < part.length; i += chunkSize - chunkOverlap) {
        out.push(part.slice(i, i + chunkSize));
      }
    }
  }
  if (buf) out.push(buf.length > chunkSize ? buf.slice(0, chunkSize) : buf);
  return out.filter(Boolean);
}

/** 对齐 Python VectorStore：chunk_size=768 overlap=50，可被 rag 设置覆盖 */
export async function splitDocumentText(
  content: string,
  opts?: { chunkSize?: number; chunkOverlap?: number },
): Promise<ChunkPiece[]> {
  const text = String(content || '').trim();
  if (!text) return [];
  const chunkSize = Math.max(200, Number(opts?.chunkSize) || 768);
  const chunkOverlap = Math.max(0, Math.min(chunkSize - 1, Number(opts?.chunkOverlap) || 50));
  const parts = recursiveSplit(text, chunkSize, chunkOverlap);
  return parts.map((t, idx) => ({ text: t, chunkIndex: idx }));
}

/**
 * 将文本分块并仅返回文本字符串数组（不含索引信息）。
 * @param content - 输入文本
 * @param opts - 可选的分块大小和重叠大小
 * @returns 文本块数组
 */
export async function splitTextStrings(
  content: string,
  opts?: { chunkSize?: number; chunkOverlap?: number },
): Promise<string[]> {
  const chunks = await splitDocumentText(content, opts);
  return chunks.map((c) => c.text);
}

/** ponytail: fails if splitter drops non-empty input */
export async function splitDocumentTextSelfCheck() {
  const chunks = await splitDocumentText('a\n\nb\n\nc', { chunkSize: 2, chunkOverlap: 0 });
  if (!chunks.length) throw new Error('splitDocumentText produced no chunks');
}
