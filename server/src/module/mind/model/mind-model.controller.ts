import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import { MindModelCreateDto, MindModelDeleteDto, MindModelPageDto, MindModelUpdateDto } from './dto';
import { getMindModelMeta } from './model.constants';
import { MindModelService } from './mind-model.service';

@Controller('api/mind/model')
export class MindModelController {
  constructor(private readonly modelService: MindModelService) {}

  @Get('meta')
  meta() {
    return ResultData.ok(getMindModelMeta());
  }

  @Get('page')
  async page(@Query() query: MindModelPageDto) {
    return ResultData.ok(await this.modelService.page(query));
  }

  @Post('add')
  async add(@Body() body: MindModelCreateDto & Partial<MindModelPageDto>) {
    await this.modelService.create(body);
    return ResultData.ok(await this.modelService.page(body));
  }

  @Post('update')
  async update(@Body() body: MindModelUpdateDto & Partial<MindModelPageDto>) {
    await this.modelService.update(body);
    return ResultData.ok(await this.modelService.page(body));
  }

  @Post('delete')
  async remove(@Body() body: MindModelDeleteDto & Partial<MindModelPageDto>) {
    await this.modelService.remove(body);
    return ResultData.ok(await this.modelService.page(body));
  }

  @Get('list')
  async list(@Query() query: MindModelPageDto) {
    return ResultData.ok(await this.modelService.list(query));
  }
}
