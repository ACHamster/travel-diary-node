import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserGroup } from '../../entity/usergroup.entity';
import { UserHistoryService } from './user-history.service';
import { UserHistoryController } from './user-history.controller';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserGroup, User]),
    forwardRef(() => PostsModule), // 使用 forwardRef 解决循环依赖
  ],
  controllers: [UserController, UserHistoryController],
  providers: [UserService, UserHistoryService],
  exports: [UserService, UserHistoryService],
})
export class UserModule {}
