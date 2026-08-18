import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserEntity } from './entities/sys-user.entity';
import { SysUserPostEntity } from './entities/user-width-post.entity';
import { SysUserRoleEntity } from './entities/user-width-role.entity';
import { SysDeptEntity } from '../dept/entities/dept.entity';
import { SysRoleEntity } from '../role/entities/role.entity';
import { SysPostEntity } from '../post/entities/post.entity';
import { SysUserTenantEntity } from './entities/user-tenant.entity';
import { SysUserMenuEntity } from './entities/user-menu.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { RoleModule } from '../role/role.module';
import { MenuModule } from '../menu/menu.module';
import { DeptModule } from '../dept/dept.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SysDeptEntity, SysRoleEntity, SysPostEntity, SysUserPostEntity, SysUserRoleEntity, SysUserMenuEntity, SysUserTenantEntity, TenantEntity]),
    forwardRef(() => RoleModule),
    forwardRef(() => MenuModule),
    forwardRef(() => DeptModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
