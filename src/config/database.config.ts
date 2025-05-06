import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

// 读取 `.env` 文件（根据 `NODE_ENV` 读取不同的环境文件）
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

const isProd = (process.env.NODE_ENV || 'dev') === 'prod';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mssql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 1433,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  schema: 'diary',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  options: {
    encrypt: isProd, // 关闭强制 SSL 加密
    trustServerCertificate: !isProd, // 允许自签名证书
  },
};
