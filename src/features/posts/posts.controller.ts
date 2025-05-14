import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDTO, UpdatePostAuditDTO, PaginationQuery } from './posts.type';
import { AccessControl, AccessLevel } from '../../common/decorators/access-controll.decorator';
import { UserGroupGuard } from '../../auth/guards/user-group.guard';
import { UserGroups } from '../../common/decorators/user-group.decorator';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RequestUser } from '../../common/decorators/user.decorator';
import { ActiveUserData } from '../../auth/interface/active-user-data.interface';

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // 供管理员使用
  @Get('list')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  // @UseGuards(UserGroupGuard)
  // @UserGroups("admin")
  async getAllPosts(@Query() query: PaginationQuery) {
    const page = query.page ? parseInt(query.page.toString()) : 1;
    const limit = query.limit ? parseInt(query.limit.toString()) : 10;
    return await this.postsService.getAllPosts(page, limit);
  }

  @Get('list/approved')
  @AccessControl(AccessLevel.PUBLIC)
  async getApprovedPosts(@Query() query: PaginationQuery) {
    const page = query.page ? parseInt(query.page.toString()) : 1;
    const limit = query.limit ? parseInt(query.limit.toString()) : 10;
    return await this.postsService.getApprovedPosts(page, limit);
  }

  @Get('list/approved/search')
  @AccessControl(AccessLevel.PUBLIC)
  async searchApprovedPosts(@Query('keyword') keyword: string, @Query() query: PaginationQuery) {
    const page = query.page ? parseInt(query.page.toString()) : 1;
    const limit = query.limit ? parseInt(query.limit.toString()) : 10;
    return await this.postsService.searchApprovedPosts(keyword, page, limit);
  }

  @Get('list/rejected')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  async getRejectedPosts(@Query() query: PaginationQuery) {
    const page = query.page ? parseInt(query.page.toString()) : 1;
    const limit = query.limit ? parseInt(query.limit.toString()) : 10;
    return await this.postsService.getRejectedPosts(page, limit);
  }

  @Get('list/pending')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  async getPendingPosts(@Query() query: PaginationQuery) {
    const page = query.page ? parseInt(query.page.toString()) : 1;
    const limit = query.limit ? parseInt(query.limit.toString()) : 10;
    return await this.postsService.getPendingPosts(page, limit);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  async getUserPosts(@RequestUser() user: ActiveUserData) {
    return await this.postsService.getUserPosts(user.sub);
  }

  @Get('search/by-author/:username')
  async getPostsByUsername(@Param('username') username: string) {
    return await this.postsService.getPostsByUsername(username);
  }

  @Get(':id')
  @AccessControl(AccessLevel.OPTIONAL_AUTH)
  async getPostById(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser() user?: ActiveUserData,
  ) {
    return await this.postsService.getPostById(id, user?.sub);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createPost(
    @RequestUser() user: ActiveUserData,
    @Body() createPostDto: CreatePostDTO,
  ) {
    createPostDto.authorId = user.sub;
    return this.postsService.createPost(createPostDto);
  }

  @Delete(':id')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  @UseGuards(UserGroupGuard)
  @UserGroups("admin")
  async deletePostById(@Param('id', ParseIntPipe) id: number) {
    return await this.postsService.deletePost(id);
  }

  @Post(':id/audit')
  @AccessControl(AccessLevel.REQUIRED_AUTH)
  @UseGuards(UserGroupGuard)
  @UserGroups("admin", "reviewer")
  async updatePostAuditStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() auditData: UpdatePostAuditDTO
  ) {
    return await this.postsService.updatePostAuditStatus(id, auditData);
  }
}
