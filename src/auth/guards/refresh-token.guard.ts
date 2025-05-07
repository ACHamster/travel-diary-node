import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('刷新令牌不存在');
    }

    // 不再需要验证 JWT，因为 refreshToken 现在是存储在数据库中的
    request['refresh_token'] = token;
    return true;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    if (request.cookies && typeof request.cookies === 'object') {
      return request.cookies['refresh_token'];
    }
    return undefined;
  }
}
