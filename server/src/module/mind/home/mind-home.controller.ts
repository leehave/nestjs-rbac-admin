import { Controller, Get, Query } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import { MindHomeService } from './mind-home.service';

@Controller('api/mind/home')
export class MindHomeController {
  constructor(private readonly homeService: MindHomeService) {}

  @Get('current_weather')
  async currentWeather(@Query('cityCode') cityCode: string) {
    return ResultData.ok(await this.homeService.snatchCurrentWeather(cityCode));
  }

  @Get('refresh_statistics')
  async refreshStatistics() {
    return ResultData.ok(await this.homeService.refreshStatistics());
  }
}

