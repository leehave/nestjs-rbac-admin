import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../system/user/entities/sys-user.entity';
import { SysUserTenantEntity } from '../../system/user/entities/user-tenant.entity';
import { MindUserController } from './mind-user.controller';
import { MindUserService } from './mind-user.service';
import { MindUserProfileEntity } from './entities/mind-user-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, SysUserTenantEntity, MindUserProfileEntity])],
  controllers: [MindUserController],
  providers: [MindUserService],
  exports: [MindUserService],
})
export class MindUserModule {}
