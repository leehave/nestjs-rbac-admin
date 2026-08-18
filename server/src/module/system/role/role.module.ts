import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { SysRoleEntity } from './entities/role.entity';
import { SysRoleMenuEntity } from './entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from './entities/role-width-menu-filter.entity';
import { SysRoleDeptEntity } from './entities/role-width-dept.entity';
import { SysDeptEntity } from '../dept/entities/dept.entity';
import { MenuModule } from '../menu/menu.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SysRoleEntity, SysRoleMenuEntity, SysRoleMenuFilterEntity, SysRoleDeptEntity, SysDeptEntity]),
    forwardRef(() => MenuModule),
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
