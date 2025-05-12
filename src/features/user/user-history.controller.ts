import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserHistoryService } from './user-history.service';
import { RequestUser } from '../../common/decorators/user.decorator';
import { ActiveUserData } from '../../auth/interface/active-user-data.interface';

@Controller('api/user-history')
export class UserHistoryController {
  constructor(private readonly userHistoryService: UserHistoryService) {}

  @Post()
  addHistory(@RequestUser() user: ActiveUserData, @Body('recordId') recordId: string): void {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    this.userHistoryService.addHistory(user.sub.toString(), recordId);
  }

  @Get()
  getHistory(@RequestUser() user: ActiveUserData): string[] {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    return this.userHistoryService.getHistory(user.sub.toString());
  }
}
