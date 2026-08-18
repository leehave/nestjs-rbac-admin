import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { SysMenuEntity } from './entities/menu.entity';
import { SysRoleMenuEntity } from '../role/entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from '../role/entities/role-width-menu-filter.entity';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SysMenuEntity, SysRoleMenuEntity, SysRoleMenuFilterEntity]),
    forwardRef(() => UserModule),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
