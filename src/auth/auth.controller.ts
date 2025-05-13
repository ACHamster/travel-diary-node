import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDTO, SignUpDTO } from '../features/user/user.type';
import { Request, Response } from 'express';
import { UserGroups } from '../common/decorators/user-group.decorator';
import { UserGroupGuard } from './guards/user-group.guard';
import { AccessControl, AccessLevel } from '../common/decorators/access-controll.decorator';
import { REQUEST_USER_KEY } from '../constants';


interface RequestWithUser extends Request {
  [REQUEST_USER_KEY]?: {
    userGroup?: string;
    sub?: number;
  };
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly  authService: AuthService,
  ) {}

  @AccessControl(AccessLevel.PUBLIC)
  @Post('signup')
  async signUp(@Body() user: SignUpDTO) {
    return await this.authService.signUp(user);
  }

  @AccessControl(AccessLevel.PUBLIC)
  @Post('signin')
  async signIn(@Body() user: SignInDTO) {
    return await this.authService.signIn(user);
  }

  @Post('refresh')
  @AccessControl(AccessLevel.PUBLIC)
  // @UseGuards(RefreshTokenGuard)
  async refreshTokens(
    @Body() body: { refreshToken: string },
  ) {
    const refreshToken = body.refreshToken;
    return this.authService.refreshTokens(refreshToken);
  }

  @Get('verifyAdmin')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  @UseGuards(UserGroupGuard)
  @UserGroups('admin')
  // @UseGuards(JwtAuthGuard)
  verifyToken() {
    return { authenticated: true };
  }

  @Post('signout')
  signOut(@Res({ passthrough: true }) response: Response) {
    // 清除所有认证cookie
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return { message: '已退出登录' };
  }

  @Get('status')
  @AccessControl(AccessLevel.OPTIONAL_AUTH)
  checkAuth(@Req() request: RequestWithUser) {
    // 从请求中获取用户信息（由AccessControlGuard设置）
    const user = request[REQUEST_USER_KEY];

    if (user) {
      return {
        userId: request[REQUEST_USER_KEY]?.sub,
      };
    }

    return {
      userId: 0,
    };
  }
}
