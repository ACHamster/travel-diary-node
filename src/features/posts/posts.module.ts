import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '../../entity/posts.entity';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity]), UserModule, ConfigModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
