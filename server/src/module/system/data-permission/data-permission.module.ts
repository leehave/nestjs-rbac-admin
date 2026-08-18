import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataPermissionService } from './data-permission.service';
import { UserEntity } from '../user/entities/sys-user.entity';
import { SysUserRoleEntity } from '../user/entities/user-width-role.entity';
import { SysRoleMenuEntity } from '../role/entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from '../role/entities/role-width-menu-filter.entity';
import { SysMenuEntity } from '../menu/entities/menu.entity';
import { SysDeptEntity } from '../dept/entities/dept.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      SysUserRoleEntity,
      SysRoleMenuEntity,
      SysRoleMenuFilterEntity,
      SysMenuEntity,
      SysDeptEntity,
    ]),
  ],
  providers: [DataPermissionService],
  exports: [DataPermissionService],
})
export class DataPermissionModule {}
