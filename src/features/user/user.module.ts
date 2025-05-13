import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserGroup } from '../../entity/usergroup.entity';
import { UserHistoryService } from './user-history.service';
import { UserHistoryController } from './user-history.controller';
import { PostsModule } from '../posts/posts.module';
import { UserFavoritesService } from './user-favorites.service';
import { UserFavoritesController } from './user-favorites.controller';
import { UserFavoritesEntity } from '../../entity/user-favorites.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserGroup, User, UserFavoritesEntity]),
    forwardRef(() => PostsModule), // 使用 forwardRef 解决循环依赖
  ],
  controllers: [UserController, UserHistoryController, UserFavoritesController],
  providers: [UserService, UserHistoryService, UserFavoritesService],
  exports: [UserService, UserHistoryService, UserFavoritesService],
})
export class UserModule {}
