import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginlogService } from './loginlog.service';
import { LoginlogController } from './loginlog.controller';
import { LoginLogEntity } from './entities/loginlog.entity';
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LoginLogEntity])],
  controllers: [LoginlogController],
  providers: [LoginlogService],
  exports: [LoginlogService],
})
export class LoginlogModule {}
