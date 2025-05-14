import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../features/user/user.service';
import { SignInDTO, SignUpDTO } from '../features/user/user.type';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { HashingService } from './hashing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ActiveUserData } from './interface/active-user-data.interface';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { RefreshToken } from '../entity/refresh-tokens.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
  ) {}

  async signUp(user: SignUpDTO) {
    const { email, username, password, avatar } = user;

    const emailValue = email ?? '';
    const usernameValue = username ?? '';
    const existingEmail = await this.usersService.findByEmail(emailValue);
    const existingUsername = await this.usersService.findByUsername(usernameValue);
    if(existingEmail || existingUsername) {
      throw new UnauthorizedException({
        message: '该用户已经被注册',
        errorCode: 'USER_ALREADY_REGISTERED',
      }
      );
    }

    // 获取用户组实体
    const groupName = user.userGroup || 'common';
    const userGroup = await this.usersService.findUserGroupByName(groupName);

    if (!userGroup) {
      throw new UnauthorizedException(`用户组 '${groupName}' 不存在`);
    }

    const hashedPassword = await this.hashingService.hash(password);

    // 创建用户时指定用户组实体
    const newUser = this.userRepository.create({
      email,
      username,
      avatar,
      password: hashedPassword,
      userGroup: userGroup,
      userGroupId: userGroup.id,
    });

    return this.userRepository.save(newUser);
  }

  async signIn(user: SignInDTO) {
    const { email, username, password } = user;
    const emailValue = email ?? '';
    const usernameValue = username ?? '';
    const existingUser = await this.usersService.findUserByEmailOrUsername(emailValue, usernameValue);

    if (!existingUser) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isEqual = await this.hashingService.compare(password, existingUser.password);
    if (!isEqual) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const userWithGroup = await this.usersService.findUserById(existingUser.id);
    if (!userWithGroup) {
      throw new UnauthorizedException('用户组信息未找到');
    }

    const { access_token, refresh_token } = await this.generateTokens(existingUser);

    return {
      message: '登录成功',
      data: {
        token: access_token,           // 改为直接返回token
        refreshToken: refresh_token,   // 改为直接返回refresh token
        userInfo: {
          id: userWithGroup.id,
          username: userWithGroup.username,
          email: userWithGroup.email,
          userGroup: userWithGroup.userGroup?.name || '未分组' // 返回用户组信息
        }
      }
    };
  }

  async generateJwtTokens(user: User) {
    const userData: Partial<ActiveUserData> = {
      name: user.username
    };

    // 如果用户有用户组，添加到 token 中
    if (user.userGroup) {
      userData.userGroup = user.userGroup.name;
    }

    return await
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        userData,
        this.jwtConfiguration.accessTokenTtl,
      );
  }

  async generateRefreshToken(user: User, userAgent: string) {
    const refreshToken = new RefreshToken();
    refreshToken.token = crypto.randomUUID();
    refreshToken.user = user;
    refreshToken.expiresAt = new Date(Date.now() + this.jwtConfiguration.refreshTokenTtl * 1000)
    refreshToken.deviceInfo = userAgent;

    return await this.refreshTokenRepository.save(refreshToken);
  }

  private async signToken<T>(userId: number, payload?: T, expiresIn?: number) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        expiresIn: expiresIn,
      },
    )
  }

  async refreshTokens(refreshToken: string) {
    try {
      // 验证刷新令牌
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken },
        relations: ['user']
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('无效或过期的刷新令牌');
      }

      const { access_token, refresh_token } = await this.generateTokens(storedToken.user);

      // 删除旧的刷新令牌
      await this.refreshTokenRepository.remove(storedToken);

      // response.cookie('access_token', access_token, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   expires: new Date(Date.now() + this.jwtConfiguration.accessTokenTtl * 1000)
      // });
      //
      // response.cookie('refresh_token', refresh_token, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   expires: new Date(Date.now() + this.jwtConfiguration.refreshTokenTtl * 1000)
      // });

      return {
        message: '令牌刷新成功',
        user: {
          id: storedToken.user.id,
          username: storedToken.user.username,
          email: storedToken.user.email
        },
        token: access_token,
        refreshToken: refresh_token,
      };
    } catch (_error) {
      console.log(_error);
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  async generateTokensForUser(userId: number) {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { access_token, refresh_token } = await this.generateTokens(user);

    return {
      message: '令牌生成成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        userGroup: user.userGroup?.name || '未分组' // 返回用户组信息
      },
      token: access_token,
      refreshToken: refresh_token,
    };
  }

  // 新增 generateTokens 方法
  private async generateTokens(user: User) {
    const [access_token, refreshToken] = await Promise.all([
      this.generateJwtTokens(user),
      this.generateRefreshToken(user, 'default-user-agent') // 这里可以根据需要传入实际的 userAgent
    ]);

    return {
      access_token,
      refresh_token: refreshToken.token
    };
  }

}
