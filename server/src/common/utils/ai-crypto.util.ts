import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'enc:v1:';

/** 从 env 取 32 字节密钥；优先 AI_ENCRYPTION_KEY，否则 JWT_SECRET 派生 */
function getKey(): Buffer {
  const raw = process.env.AI_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  if (!raw) throw new Error('AI_ENCRYPTION_KEY or JWT_SECRET is required for API key encryption');
  return crypto.createHash('sha256').update(raw).digest();
}

/** AES-256-GCM 加密，存 DB 格式 enc:v1:{base64(iv+tag+ciphertext)} */
export function encryptAiSecret(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  return `${PREFIX}${payload}`;
}

/**
 * AES-256-GCM 解密，解析 enc:v1: 前缀的密文
 * @param cipherText - 加密字符串（enc:v1: 前缀 + base64(iv+tag+ciphertext)）；无前缀时按明文返回以兼容历史数据
 * @returns 解密后的明文
 */
export function decryptAiSecret(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith(PREFIX)) return cipherText; // ponytail: 兼容未加密历史数据
  const buf = Buffer.from(cipherText.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskAiSecret(plain: string): string {
  if (!plain) return '';
  if (plain.length <= 8) return '****';
  return `${plain.slice(0, 4)}****${plain.slice(-4)}`;
}

// ponytail: 最小自检，node -r ts-node/register src/common/utils/ai-crypto.util.ts
if (require.main === module) {
  process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-32-chars!!';
  const src = 'sk-test-api-key-12345';
  const enc = encryptAiSecret(src);
  const dec = decryptAiSecret(enc);
  if (dec !== src) throw new Error('ai-crypto roundtrip failed');
  console.log('ai-crypto ok', maskAiSecret(src));
}
