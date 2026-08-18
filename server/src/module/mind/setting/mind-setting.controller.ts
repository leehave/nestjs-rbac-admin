import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import { MindSettingListDto, MindSettingSaveDto } from './dto';
import { MindSettingService } from './mind-setting.service';

@Controller('api/mind/setting')
export class MindSettingController {
  constructor(private readonly settingService: MindSettingService) {}

  @Get('list')
  async list(@Query() query: MindSettingListDto) {
    return ResultData.ok(await this.settingService.list(query));
  }

  @Get('detail')
  async detail(@Query('source') source: string) {
    return ResultData.ok(await this.settingService.detail(source));
  }

  @Post('save')
  async save(@Body() body: MindSettingSaveDto) {
    return ResultData.ok(await this.settingService.save(body));
  }
}

