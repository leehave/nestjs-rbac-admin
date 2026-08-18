import { Controller, Get } from '@nestjs/common';

import { NotRequireAuth } from '../../common/decorators/common.decorator';
import { DemoKitService } from '../demo-kit/demo-kit.service';

@Controller('api/demo-kit')
export class DemoKitTestController {
  constructor(private readonly demoKitService: DemoKitService) {}

  /** 演示 deferred 导入：消费 AppModule 中已配置的 DemoKitModule */
  @NotRequireAuth()
  @Get('test')
  test() {
    return {
      source: 'demo-kit-test module (imports DemoKitModule.deferred())',
      ...this.demoKitService.describe(),
    };
  }
}
