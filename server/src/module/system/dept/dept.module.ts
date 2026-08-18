import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeptService } from './dept.service';
import { DeptController } from './dept.controller';
import { SysDeptEntity } from './entities/dept.entity';
import { UserEntity } from '../user/entities/sys-user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SysDeptEntity, UserEntity])],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
