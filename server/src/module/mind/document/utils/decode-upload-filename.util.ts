import * as iconv from 'iconv-lite';

/** Multer 默认 latin1；与 upload.service 一致解码为 UTF-8 */
export function decodeUploadFilename(originalname: string) {
  return iconv.decode(Buffer.from(originalname || '', 'binary'), 'utf8');
}
