import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { UserFavoritesService } from './user-favorites.service';
import { RequestUser } from '../../common/decorators/user.decorator';
import { ActiveUserData } from '../../auth/interface/active-user-data.interface';

@Controller('api/user-favorites')
export class UserFavoritesController {
  constructor(private readonly userFavoritesService: UserFavoritesService) {}

  @Post('toggle')
  async toggleFavorite(
    @RequestUser() user: ActiveUserData,
    @Body('data') data: { postId: string },
  ) {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    return await this.userFavoritesService.toggleFavorite(user.sub.toString(), data.postId);
  }

  @Get()
  async getFavorites(@RequestUser() user: ActiveUserData) {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    return this.userFavoritesService.getFavorites(user.sub.toString());
  }

  @Delete()
  async removeFavorite(
    @RequestUser() user: ActiveUserData,
    @Body('postId') postId: string,
  ): Promise<void> {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    await this.userFavoritesService.removeFavorite(user.sub.toString(), postId);
  }

  @Get('is-favorited')
  async isPostFavorited(
    @RequestUser() user: ActiveUserData,
    @Body('postId') postId: string,
  ): Promise<{ isFavorited: boolean }> {
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    const isFavorited = await this.userFavoritesService.isPostFavorited(user.sub.toString(), postId);
    return { isFavorited };
  }

  @Get('detailed')
  async getFavoritesWithDetails(@RequestUser() user: ActiveUserData) {
    console.log(user);
    if (!user?.sub) {
      throw new Error('User ID not found in request');
    }
    return this.userFavoritesService.getFavoritesWithDetails(user.sub.toString());
  }
}
