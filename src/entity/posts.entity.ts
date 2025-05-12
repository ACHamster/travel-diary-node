import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  title: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  images: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  video: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  coverImage: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: false })
  content: string;

  @Column({ type: 'bigint', nullable: false, default: 0 })
  quick_tag: number;

  // 移除 auditStatus 字段
  // 保留拒绝原因字段，因为这是文本信息
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  rejectReason: string;

  @Column({ type: 'int', nullable: false, default: 0 })
  viewCount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ nullable: false })
  authorId: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_time: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  edited_time: Date;
}
