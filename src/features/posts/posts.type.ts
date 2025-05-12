import { ApiProperty } from '@nestjs/swagger';
// import { AuditStatus } from '../../entity/posts.entity';

export class CreatePostDTO {
  @ApiProperty({ description: '文章ID'})
  id?: number;

  @ApiProperty({ description: '文章标题'})
  title: string;

  @ApiProperty({ description: '文章内容'})
  content: string;

  @ApiProperty({ description: '文章封面图', required: false })
  coverImage?: string;

  @ApiProperty({ description: '图片数组', required: false })
  images?: string[];

  @ApiProperty({ description: '视频链接', required: false })
  video?: string;

  @ApiProperty({ description: '作者ID' })
  authorId: number;
}

export class UpdatePostAuditDTO {
  auditStatus: number;
  rejectReason?: string;
}

export interface PostResponse {
  id: string;
  title: string;
  date: string;
  content?: Record<string, unknown>;
  images: string[];
  video?: string;
  rejectReason?: string;
  author: {
    avatar: string | undefined,
    username: string;
  };
}
