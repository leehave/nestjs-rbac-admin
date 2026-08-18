import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantEntity } from './entities/tenant.entity';
import { SysUserTenantEntity } from '../user/entities/user-tenant.entity';
import { UserEntity } from '../user/entities/sys-user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity, SysUserTenantEntity, UserEntity])],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
