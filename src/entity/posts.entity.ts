import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

// 审核状态枚举
export enum AuditStatus {
  PENDING = 'pending',   // 待审核
  APPROVED = 'approved', // 已通过
  REJECTED = 'rejected'  // 未通过
}

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  title: string;

  // 存储为JSON字符串
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  images: string; // 存储图片URL数组的JSON字符串

  // 添加视频字段
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  video: string; // 视频URL

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: false })
  content: string;  // 存储 JSON 数据

  // 添加审核状态字段
  @Column({
    type: 'nvarchar',
    length: 20,
    default: AuditStatus.PENDING
  })
  auditStatus: AuditStatus;

  // 添加拒绝原因字段
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  rejectReason: string;

  // 添加作者关联关系
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
