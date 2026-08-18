import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MainController } from './main.controller';
import { MainService } from './main.service';
import { UserEntity } from '../system/user/entities/sys-user.entity';
import { UploadEntity } from '../upload/entities/upload.entity';
import { LoginLogEntity } from '../monitor/loginlog/entities/loginlog.entity';
import { OperLogEntity } from '../monitor/operlog/entities/operlog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UploadEntity, LoginLogEntity, OperLogEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('jwt.secret') || config.get('jwt.secretkey'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MainController],
  providers: [MainService],
})
export class MainModule {}
