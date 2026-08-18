import { Inject, Injectable } from '@nestjs/common';

import { DEMO_KIT_OPTIONS } from './demo-kit.constants';
import type { DemoKitModuleOptions } from './demo-kit.options';

@Injectable()
export class DemoKitService {
  constructor(@Inject(DEMO_KIT_OPTIONS) private readonly options: DemoKitModuleOptions) {}

  describe() {
    return {
      prefix: this.options.prefix,
      enabled: this.options.enabled,
      message: `[${this.options.prefix}] demo-kit ${this.options.enabled ? 'enabled' : 'disabled'}`,
    };
  }
}
