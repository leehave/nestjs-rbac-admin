import { Module } from '@nestjs/common';

import { DemoKitModule } from '../demo-kit/demo-kit.module';
import { DemoKitTestController } from './demo-kit-test.controller';

/**
 * 演示如何在任意子模块中复用已在 AppModule 配置过的动态模块。
 * 只需 imports: [DemoKitModule.deferred()]，无需重复 forRoot 配置。
 */
@Module({
  imports: [DemoKitModule.deferred()],
  controllers: [DemoKitTestController],
})
export class DemoKitTestModule {}
