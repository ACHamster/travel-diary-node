import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_LEVEL_KEY, AccessLevel } from '../../common/decorators/access-controll.decorator';
import { REQUEST_USER_KEY } from '../../constants';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessLevel = this.reflector.getAllAndOverride<AccessLevel>(
      ACCESS_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    ) || AccessLevel.REQUIRED_AUTH; // 默认需要认证

    const request = context.switchToHttp().getRequest<Request>();

    // 尝试提取和验证token
    try {
      const token = this.extractToken(request);
      if (token) {
        const jwtConfig = this.configService.get('jwt');
        const payload = await this.jwtService.verifyAsync(token, {
          secret: jwtConfig.secret,
          audience: jwtConfig.audience,
          issuer: jwtConfig.issuer,
        });

        // 验证成功，设置用户信息
        request[REQUEST_USER_KEY] = payload;
      } else if (accessLevel === AccessLevel.REQUIRED_AUTH) {
        // 如果需要认证但没有token，拒绝请求
        throw new UnauthorizedException('需要登录');
      }
    } catch (error) {
      // 验证失败
      if (accessLevel === AccessLevel.REQUIRED_AUTH) {
        throw new UnauthorizedException('无效的认证');
      }
    }

    // 对于PUBLIC和OPTIONAL_AUTH，即使没有token或验证失败也允许访问
    return true;
  }

  private extractToken(request: Request): string | null {
    // 从Cookie中提取Token
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    // 从Authorization头中提取Bearer Token
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7); // 去掉"Bearer "前缀
    }

    return null;
  }
}
