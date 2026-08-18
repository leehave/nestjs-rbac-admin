import { Injectable } from '@nestjs/common';
import { createNumeric } from '../../../common/utils/captcha';

@Injectable()
export class MindCommonService {
  getInfo() {
    return '你好，Mind-人工智能系统为你服务!';
  }

  generateCaptcha() {
    const captcha = createNumeric();
    const svgBase64 = Buffer.from(captcha.data, 'utf8').toString('base64');
    return {
      image_base64: svgBase64,
      image_text: captcha.text,
      image_type: 'svg',
    };
  }
}

