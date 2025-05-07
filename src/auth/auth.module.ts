import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../features/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entity/user.entity';
import { HashingService } from './hashing.service';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from '../config/jwt.config';
import { APP_GUARD } from '@nestjs/core';
import { AccessControlGuard } from './guards/access-controll.guard';
import { RefreshToken } from '../entity/refresh-tokens.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User,RefreshToken]),
    UserModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    HashingService,
    {
      provide: APP_GUARD,
      useClass: AccessControlGuard,
    }
  ],
  exports: [JwtModule],
})
export class AuthModule {}
