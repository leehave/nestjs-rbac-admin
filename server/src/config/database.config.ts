import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

// ponytail: legacy helper — app.module uses TypeOrmModule.forRootAsync with autoLoadEntities
export const createDatabaseConfig = (configService: ConfigService): DataSourceOptions => {
  const nodeEnv = configService.get<string>('app.env', 'development');
  const synchronize = configService.get<boolean>('database.synchronize', false);

  return {
    type: 'mysql',
    host: configService.get<string>('database.host', '127.0.0.1'),
    port: configService.get<number>('database.port', 3306),
    username: configService.get<string>('database.username', 'root'),
    password: configService.get<string>('database.password', ''),
    database: configService.get<string>('database.name', 'nestjs'),
    charset: 'utf8mb4',
    synchronize: nodeEnv === 'production' ? false : synchronize,
    logging: configService.get<boolean>('database.logging', false),
  } as DataSourceOptions;
};
