import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserHistoryService } from './user-history.service';
import { RequestUser } from '../../common/decorators/user.decorator';
import { ActiveUserData } from '../../auth/interface/active-user-data.interface';
import { PostsService } from '../posts/posts.service';

@Controller('api/user-history')
export class UserHistoryController {
  constructor(
    private readonly userHistoryService: UserHistoryService,
    private readonly postsService: PostsService // 添加对 PostsService 的依赖注入
  ) {}

  @Post()
  addHistory(@RequestUser() user: ActiveUserData, @Body('data') data: {
    recordId: string }): void {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    this.userHistoryService.addHistory(user.sub.toString(), data.recordId);
  }

  @Get()
  getHistory(@RequestUser() user: ActiveUserData): string[] {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    return this.userHistoryService.getHistory(user.sub.toString());
  }

  @Post('clear')
  clearHistory(@RequestUser() user: ActiveUserData): void {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    this.userHistoryService.clearHistory(user.sub.toString());
  }

  @Get('detailed')
  async getDetailedHistory(@RequestUser() user: ActiveUserData) {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }

    const historyIds = this.userHistoryService.getHistory(user.sub.toString());
    const detailedHistory = await Promise.all(
      historyIds.map(async (id) => {
        const post = await this.postsService.getPostById(parseInt(id));
        if (!post) return null;

        return {
          id: post.id,
          title: post.title,
          date: post.date,
          coverImage: post.coverImage || '', // 确保安全赋值
          quickTag: post.quick_tag || 0,    // 确保安全赋值
          author: {
            avatar: post.author?.avatar || '',
            username: post.author?.username || '',
          },
        };
      })
    );

    return detailedHistory.filter((item) => item !== null);
  }
}
