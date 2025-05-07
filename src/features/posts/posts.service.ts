import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity, AuditStatus } from '../../entity/posts.entity';
import { Repository } from 'typeorm';
import { CreatePostDTO, UpdatePostAuditDTO } from './posts.type';

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
          description: post.description,
          content: JSON.stringify(post.content),
          images: post.images ? JSON.stringify(post.images) : '[]',
          video: post.video,
          authorId: post.authorId,
          auditStatus: AuditStatus.PENDING,
        });
      }
    }

    // 没有指定ID或ID不存在，创建新记录
    const obj = new PostEntity();
    obj.title = post.title;
    obj.description = post.description;
    obj.content = JSON.stringify(post.content);
    obj.images = post.images ? JSON.stringify(post.images) : '[]';
    obj.video = post.video || '';
    obj.authorId = post.authorId;
    obj.auditStatus = AuditStatus.PENDING;

    if (post.id) {
      obj.id = post.id;
    }

    return await this.postsRepository.save(obj);
  }

  async getAllPosts() {
    const posts = await this.postsRepository.find({
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        description: true,
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
      description: post.description,
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      author: {
        id: post.author.id,
        username: post.author.username
      }
    }));
  }

  async getApprovedPosts() {
    const posts = await this.postsRepository.find({
      where: { auditStatus: AuditStatus.APPROVED },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        description: true,
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
      description: post.description,
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      author: {
        id: post.author.id,
        username: post.author.username
      }
    }));
  }

  async getUserPosts(userId: number) {
    const posts = await this.postsRepository.find({
      where: { authorId: userId },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        description: true,
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
      description: post.description,
      content: JSON.parse(post.content) as Record<string, unknown>,
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      rejectReason: post.rejectReason,
      author: {
        id: post.author.id,
        username: post.author.username
      }
    }));
  }

  async getPostById(id: number, currentUserId?: number) {
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

    // 只有作者本人或文章已审核通过才能查看
    if (post.auditStatus !== AuditStatus.APPROVED && post.authorId !== currentUserId) {
      return null;
    }

    return {
      id: post.id.toString(),
      title: post.title,
      date: post.created_time.toISOString(),
      content: JSON.parse(post.content) as Record<string, unknown>,
      images: post.images ? (JSON.parse(post.images) as string[]) : [],
      video: post.video,
      auditStatus: post.auditStatus,
      rejectReason: post.rejectReason,
      author: {
        id: post.author.id,
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
}
