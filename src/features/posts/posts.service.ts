import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity, AuditStatus } from '../../entity/posts.entity';
import { Repository, Like } from 'typeorm';
import { CreatePostDTO, UpdatePostAuditDTO, PostResponse } from './posts.type';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
  ) {}

  async createPost(post: CreatePostDTO) {
    // 检查是否存在相同ID的文章
    if (post.id) {
      const existingPost = await this.postsRepository.findOne({
        where: { id: post.id }
      });

      if (existingPost) {
        // 如果存在，执行更新操作
        return this.postsRepository.update(post.id, {
          title: post.title,
          content: JSON.stringify(post.content),
          images: post.images ? JSON.stringify(post.images) : '[]',
          video: post.video,
          authorId: post.authorId,
          auditStatus: AuditStatus.PENDING,
          coverImage: post.coverImage || '',
        });
      }
    }

    // 没有指定ID或ID不存在，创建新记录
    console.log(post);
    const obj = new PostEntity();
    obj.title = post.title;
    obj.content = JSON.stringify(post.content);
    obj.images = post.images ? JSON.stringify(post.images) : '[]';
    obj.video = post.video || '';
    obj.authorId = post.authorId;
    obj.auditStatus = AuditStatus.PENDING;
    obj.coverImage = post.coverImage || '';

    if (post.id) {
      obj.id = post.id;
    }

    return await this.postsRepository.save(obj);
  }

  async getAllPosts(): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        images: true,
        video: true,
        auditStatus: true,
        author: {
          id: true,
          username: true
        }
      },
      order: {
        created_time: 'DESC',
      },
    });

    return posts.map(post => ({
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }

  async getApprovedPosts(): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      where: { auditStatus: AuditStatus.APPROVED },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        images: true,
        video: true,
        auditStatus: true,
        coverImage: true,
        author: {
          avatar: true,
          username: true
        }
      },
      order: {
        created_time: 'DESC',
      },
    });

    return posts.map(post => ({
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      coverImage: post.coverImage,
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }

  async getUserPosts(userId: number): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      where: { authorId: userId },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        content: true,
        images: true,
        video: true,
        auditStatus: true,
        rejectReason: true,
        author: {
          id: true,
          username: true
        }
      },
      order: {
        created_time: 'DESC',
      },
    });

    return posts.map(post => ({
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      content: JSON.parse(post.content) as Record<string, unknown>,
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      rejectReason: post.rejectReason,
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }

  async getPostById(id: number, currentUserId?: number): Promise<PostResponse | null> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        content: true,
        images: true,
        video: true,
        auditStatus: true,
        rejectReason: true,
        authorId: true,
        author: {
          id: true,
          username: true
        }
      },
    });

    if (!post) {
      return null;
    }

    if (post.auditStatus !== AuditStatus.APPROVED && post.authorId !== currentUserId) {
      console.log(post.auditStatus);
      console.log('没有权限查看该文章');
      return null;
    }

    return {
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      content: JSON.parse(post.content) as Record<string, unknown>,
      images: post.images ? JSON.parse(post.images) as string[] : [],
      video: post.video,
      auditStatus: post.auditStatus,
      rejectReason: post.rejectReason,
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    };
  }

  async deletePost(id: number) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new InternalServerErrorException("没有找到该文章");
    }
    return await this.postsRepository.delete(id);
  }

  async updatePostAuditStatus(id: number, auditData: UpdatePostAuditDTO) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new InternalServerErrorException("没有找到该文章");
    }

    // 如果是拒绝状态，必须提供拒绝原因
    if (auditData.status === AuditStatus.REJECTED && !auditData.rejectReason) {
      throw new InternalServerErrorException("拒绝文章时必须提供拒绝原因");
    }

    console.log(auditData.rejectReason);

    const updateData: Partial<PostEntity> = {
      auditStatus: auditData.status,
      rejectReason: auditData.status === AuditStatus.REJECTED ? auditData.rejectReason : undefined
    };

    console.log(updateData);
    return await this.postsRepository.update(id, updateData);
  }

  async getPostsByUsername(username: string): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      where: {
        auditStatus: AuditStatus.APPROVED,
        author: {
          username: Like(`%${username}%`)
        }
      },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        images: true,
        video: true,
        auditStatus: true,
        author: {
          id: true,
          username: true
        }
      },
      order: {
        created_time: 'DESC',
      },
    });

    return posts.map(post => ({
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }
}

