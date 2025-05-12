import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from '../../entity/posts.entity';
import { Repository, Like, Raw } from 'typeorm';
import { CreatePostDTO, UpdatePostAuditDTO, PostResponse } from './posts.type';
import { ApprovedLine, PendingLine, RejectedLine, mergeLines, removeLine, includeSomeLine } from '../../common/lib/quick-tag';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
  ) {}

  async createPost(post: CreatePostDTO) {
    if (post.id) {
      const existingPost = await this.postsRepository.findOne({
        where: { id: post.id }
      });

      if (existingPost) {
        return this.postsRepository.update(post.id, {
          title: post.title,
          content: JSON.stringify(post.content),
          images: post.images ? JSON.stringify(post.images) : '[]',
          video: post.video,
          authorId: post.authorId,
          quick_tag: mergeLines(existingPost.quick_tag, PendingLine),
          coverImage: post.coverImage || '',
        });
      }
    }

    const obj = new PostEntity();
    obj.title = post.title;
    obj.content = JSON.stringify(post.content);
    obj.images = post.images ? JSON.stringify(post.images) : '[]';
    obj.video = post.video || '';
    obj.authorId = post.authorId;
    obj.quick_tag = PendingLine;
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
        quick_tag: true,
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
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }

  async getApprovedPosts(): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      where: {
        quick_tag: Raw(alias => `${alias} & ${ApprovedLine} = ${ApprovedLine}`)
      },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        created_time: true,
        images: true,
        video: true,
        quick_tag: true,
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
      coverImage: post.coverImage,
      quickTag: post.quick_tag,
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
        quick_tag: true,
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
      quickTag: post.quick_tag,
      video: post.video,
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
        quick_tag: true,
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

    if (!includeSomeLine(post.quick_tag, ApprovedLine) && post.authorId !== currentUserId) {
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

    if (includeSomeLine(auditData.auditStatus, RejectedLine) && !auditData.rejectReason) {
      throw new InternalServerErrorException("拒绝文章时必须提供拒绝原因");
    }

    let updatedQuickTag = post.quick_tag;
    if (includeSomeLine(updatedQuickTag, ApprovedLine)) {
      updatedQuickTag = removeLine(updatedQuickTag, ApprovedLine);
    }
    if (includeSomeLine(updatedQuickTag, PendingLine)) {
      updatedQuickTag = removeLine(updatedQuickTag, PendingLine);
    }
    if (includeSomeLine(updatedQuickTag, RejectedLine)) {
      updatedQuickTag = removeLine(updatedQuickTag, RejectedLine);
    }

    if (auditData.rejectReason) {
      updatedQuickTag = mergeLines(updatedQuickTag, RejectedLine);
    } else {
      updatedQuickTag = mergeLines(updatedQuickTag, ApprovedLine);
    }

    return await this.postsRepository.update(id, {
      quick_tag: updatedQuickTag,
      rejectReason: auditData.rejectReason,
    });
  }

  async getPostsByUsername(username: string): Promise<PostResponse[]> {
    const posts = await this.postsRepository.find({
      where: {
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
        quick_tag: true,
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
      author: {
        avatar: post.author.avatar,
        username: post.author.username
      }
    }));
  }
}
