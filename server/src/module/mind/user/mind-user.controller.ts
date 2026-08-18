import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import {
  MindUserCreateDto,
  MindUserDeleteDto,
  MindUserPageDto,
  MindUserSelectDto,
  MindUserUpdateDto,
} from './dto';
import { MindUserService } from './mind-user.service';

@Controller('api/mind/user')
export class MindUserController {
  constructor(private readonly userService: MindUserService) {}

  @Get('page')
  async page(@Query() query: MindUserPageDto) {
    return ResultData.ok(await this.userService.page(query));
  }

  @Post('add')
  async add(@Body() body: MindUserCreateDto & Partial<MindUserPageDto>) {
    await this.userService.create(body);
    return ResultData.ok(await this.userService.page(body));
  }

  @Post('update')
  async update(@Body() body: MindUserUpdateDto & Partial<MindUserPageDto>) {
    await this.userService.update(body);
    return ResultData.ok(await this.userService.page(body));
  }

  @Post('delete')
  async remove(@Body() body: MindUserDeleteDto & Partial<MindUserPageDto>) {
    await this.userService.remove(body);
    return ResultData.ok(await this.userService.page(body));
  }

  @Get('select')
  async select(@Query() query: MindUserSelectDto) {
    return ResultData.ok(await this.userService.select(query));
  }
}

