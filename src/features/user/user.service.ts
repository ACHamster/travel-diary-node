import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserGroup } from '../../entity/usergroup.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async findAllUsers() {
    const users = await this.userRepository.find({
      relations: ['userGroup'],
      select: ['id', 'username', 'email'],
    });

    // 转换返回结果，只保留需要的字段
    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      userGroup: user.userGroup ? user.userGroup.description : null
    }));
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userGroup'] // 添加这一行
    });
  }

  async findUserBaseInfo(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['email', 'username', 'avatar'] // 仅选择需要的字段
    });
  }

  async findUserGroupByName(name: string): Promise<UserGroup | null> {
    return this.userGroupRepository.findOne({ where: { name } });
  }

  async assignUserToGroup(userId: number, groupName: string): Promise<User> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const group = await this.userGroupRepository.findOne({ where: { name: groupName } });
    if (!group) {
      throw new Error('用户组不存在');
    }

    user.userGroup = group;
    user.userGroupId = group.id;

    return this.userRepository.save(user);
  }

// 添加用户组相关方法
  async createUserGroup(name: string, description?: string): Promise<UserGroup> {
    const group = this.userGroupRepository.create({
      name,
      description
    });

    return this.userGroupRepository.save(group);
  }
}
