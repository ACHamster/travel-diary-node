import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UserGroups } from '../../common/decorators/user-group.decorator';
import { AccessControl, AccessLevel } from '../../common/decorators/access-controll.decorator';

@Controller('/api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @UserGroups('admin')
  async getAllUsers() {
    return await this.userService.findAllUsers();
  }

  @Get(':email')
  @UserGroups('admin')
  async getUser(@Param('email') email: string) {
    return await this.userService.findByEmail(email);
  }

  @Get('info/:id')
  @AccessControl(AccessLevel.OPTIONAL_AUTH)
  async getUserInfo(@Param('id') id: number) {
    return await this.userService.findUserBaseInfo(id);
  }

}
