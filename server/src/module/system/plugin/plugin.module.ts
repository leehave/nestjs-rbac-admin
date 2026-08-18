import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginService } from './plugin.service';
import { PluginController } from './plugin.controller';
import { PluginEntity } from './entities/plugin.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PluginEntity])],
  controllers: [PluginController],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
