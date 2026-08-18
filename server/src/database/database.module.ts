import { Global, Module } from '@nestjs/common';

/**
 * DatabaseModule — 数据库模块。
 * TypeORM DataSource 由 TypeOrmModule.forRootAsync 在 AppModule 中创建，
 * 可通过直接注入 DataSource 使用。
 */
@Global()
@Module({})
export class DatabaseModule {}
