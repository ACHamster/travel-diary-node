import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserGroup } from '../../entity/usergroup.entity';
import { UserHistoryService } from './user-history.service';
import { UserHistoryController } from './user-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserGroup, User])],
  controllers: [UserController, UserHistoryController],
  providers: [UserService, UserHistoryService],
  exports: [UserService, UserHistoryService],
})
export class UserModule {}
