/** 规范化客户端 IP（::1 → 127.0.0.1，去 X-Forwarded-For 首段） */
export function normalizeClientIp(ip: unknown): string {
  const raw = String(ip ?? '').trim();
  if (!raw) return '';
  const first = raw.split(',')[0].trim();
  if (!first) return '';
  if (first === '::1') return '127.0.0.1';
  if (first.startsWith('::ffff:')) return first.slice('::ffff:'.length);
  return first;
}
