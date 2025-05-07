import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../features/user/user.service';
import { USERGROUPS_KEY } from '../../common/decorators/user-group.decorator';
import { ActiveUserData } from '../interface/active-user-data.interface';
import { Request } from 'express';

@Injectable()
export class UserGroupGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredGroups = this.reflector.getAllAndOverride<string[]>(USERGROUPS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有设置用户组要求，默认通过
    if (!requiredGroups || requiredGroups.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUserData;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 获取完整的用户信息，包括用户组
    const userWithGroup = await this.userService.findUserById(user.sub);

    if (!userWithGroup || !userWithGroup.userGroup) {
      throw new ForbiddenException('用户不属于任何用户组');
    }

    // 检查用户组是否符合要求
    const hasRequiredGroup = requiredGroups.includes(userWithGroup.userGroup.name);

    if (!hasRequiredGroup) {
      throw new ForbiddenException('没有足够的权限访问此资源');
    }

    return true;
  }
}
