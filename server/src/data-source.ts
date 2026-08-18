import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// 手动加载 .env 文件（与 ConfigModule 加载顺序一致）
const nodeEnv = process.env.NODE_ENV ?? 'development';

loadEnv({ path: join(process.cwd(), `.env.${nodeEnv}`) });
loadEnv({ path: join(process.cwd(), '.env') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'nestjs',
  charset: 'utf8mb4',
  entities: [join(process.cwd(), 'src', 'module', '**', '*.entity.{ts,js}')],
  migrations: [join(process.cwd(), 'migrations')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
