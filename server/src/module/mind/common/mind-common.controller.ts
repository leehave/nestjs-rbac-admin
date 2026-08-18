import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators/auth.decorator';
import { ResultData } from '../../../common/utils/result';
import { MindCommonService } from './mind-common.service';

@Controller('api/mind')
export class MindCommonController {
  constructor(private readonly commonService: MindCommonService) {}

  @Public()
  @Get('common/info')
  info() {
    return this.commonService.getInfo();
  }

  @Public()
  @Get('common/code')
  generateCaptcha() {
    return ResultData.ok(this.commonService.generateCaptcha());
  }
}

