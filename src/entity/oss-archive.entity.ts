import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('oss_archive')
export class OssArchive  {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  file_name: string;

  @Column({ type: 'nvarchar', length: 255 })
  file_path: string;

  @Column({ type: 'nvarchar', length: 255 })
  sha1: string;

  @Column({ type: 'nvarchar', length: 25 })
  size: string;
}
