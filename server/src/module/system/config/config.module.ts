import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigController, ConfigGroupController, SystemWebConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { SysConfigEntity } from './entities/config.entity';
import { SysConfigGroupEntity } from './entities/config-group.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SysConfigEntity, SysConfigGroupEntity])],
  controllers: [ConfigController, ConfigGroupController, SystemWebConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class SysConfigModule {}
