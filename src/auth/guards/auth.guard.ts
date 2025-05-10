import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { REQUEST_USER_KEY } from '../../constants';
import { ConfigService } from '@nestjs/config';
import { ActiveUserData } from '../interface/active-user-data.interface';

interface JwtConfig {
  secret: string;
  audience: string;
  issuer: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 尝试从多种来源获取token
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('认证失败，请重新登录');
    }

    try {
      const jwtConfig = this.configService.get<JwtConfig>('jwt');
      if (!jwtConfig?.secret) {
        console.error('JWT configuration is missing');
        throw new UnauthorizedException('系统配置错误');
      }

      const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, {
        secret: jwtConfig.secret,
      });

      // 将用户信息附加到请求中
      request[REQUEST_USER_KEY] = payload;
      return true;
    } catch (error) {
      console.error('Token 验证失败:', error);
      throw new UnauthorizedException('认证已过期，请重新登录');
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // 尝试从Authorization头获取token
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // 移除"Bearer "前缀
    }

    // 尝试从cookie获取token
    const cookies = request.cookies as Record<string, string>;
    if (cookies && typeof cookies === 'object') {
      return cookies['access_token'];
    }

    return undefined;
  }
}
