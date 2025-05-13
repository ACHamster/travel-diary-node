import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavoritesEntity } from '../../entity/user-favorites.entity';
import { PostsService } from '../posts/posts.service';
import { PostResponse } from '../posts/posts.type';

@Injectable()
export class UserFavoritesService {
  constructor(
    @InjectRepository(UserFavoritesEntity)
    private readonly favoritesRepository: Repository<UserFavoritesEntity>,
    private readonly postsService: PostsService,
  ) {}

  async toggleFavorite(userId: string, postId: string): Promise<{ isFavorited: boolean }> {
    // 查找是否已存在该收藏
    const existingFavorite = await this.favoritesRepository.findOne({
      where: { userId, postId }
    });

    if (existingFavorite) {
      // 如果已存在，则删除收藏
      await this.favoritesRepository.remove(existingFavorite);
      return { isFavorited: false };
    } else {
      // 如果不存在，则添加收藏
      const favorite = this.favoritesRepository.create({ userId, postId });
      await this.favoritesRepository.save(favorite);
      return { isFavorited: true };
    }
  }

  async getFavorites(userId: string): Promise<UserFavoritesEntity[]> {
    return this.favoritesRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async removeFavorite(userId: string, postId: string): Promise<void> {
    await this.favoritesRepository.delete({ userId, postId });
  }

  async isPostFavorited(userId: string, postId: string): Promise<boolean> {
    const count = await this.favoritesRepository.count({ where: { userId, postId } });
    return count > 0;
  }

  async getFavoritesWithDetails(userId: string): Promise<PostResponse[]> {
    const favorites = await this.favoritesRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const detailedFavorites = await Promise.all(
      favorites.map(async (favorite) => {
        const post = await this.postsService.getPostById(parseInt(favorite.postId),parseInt(userId));
        return post;
      })
    );
    return detailedFavorites.filter((post) => post !== null);
  }
}
