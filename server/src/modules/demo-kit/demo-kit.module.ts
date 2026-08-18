import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

import { DEMO_KIT_OPTIONS } from './demo-kit.constants';
import type { DemoKitModuleOptions } from './demo-kit.options';
import { DemoKitService } from './demo-kit.service';

/**
 * 基于 @golevelup/nestjs-modules 的可配置动态根模块。
 *
 * - AppModule 中调用 forRoot / forRootAsync 配置一次
 * - 其他模块通过 DemoKitModule.deferred() 复用同一份配置
 */
@Module({
  providers: [DemoKitService],
  exports: [DemoKitService],
})
export class DemoKitModule extends createConfigurableDynamicRootModule<
  DemoKitModule,
  DemoKitModuleOptions
>(DEMO_KIT_OPTIONS) {
  static deferred = () => DemoKitModule.externallyConfigured(DemoKitModule, 0);
}
