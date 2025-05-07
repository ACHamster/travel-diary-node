import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OssArchive } from '../../entity/oss-archive.entity';
import { Repository } from 'typeorm';
import { CreateOSSArchiveDTO } from './oss-archive.type';
import { BackblazeService } from '../backblaze/backblaze.service';

@Injectable()
export class OssArchiveService {
  constructor(
    @InjectRepository(OssArchive)
    private readonly  ossArchiveRepository: Repository<OssArchive>,
    @Inject(forwardRef(() => BackblazeService))
    private readonly backblazeService: BackblazeService,
  ) {
  }

  async getAllFiles() {
    const files = await this.ossArchiveRepository.find();

    // 计算所有文件大小的总和（单位：字节）
    const totalSize = files.reduce((sum: number, file) => {
      // 解析带单位的文件大小字符串
      if (!file.size) return sum;

      // 提取数字和单位部分
      const match = file.size.match(/^([\d.]+)\s*([KMGT]?B)$/i);
      if (!match) return sum;

      const [, sizeStr, unit] = match;
      const size = parseFloat(sizeStr);

      // 根据单位转换为字节
      let bytes = size;
      switch (unit.toUpperCase()) {
        case 'KB': bytes = size * 1024; break;
        case 'MB': bytes = size * 1024 * 1024; break;
        case 'GB': bytes = size * 1024 * 1024 * 1024; break;
        case 'TB': bytes = size * 1024 * 1024 * 1024 * 1024; break;
      }

      return sum + bytes;
    }, 0);

    return {
      files,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize)
    };
  }

// 添加一个辅助方法来格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
  }

  async isFileExist(sha1: string){
    return await this.ossArchiveRepository.findOne({ where: { sha1 } });
  }

  async creteFileArchive(file: CreateOSSArchiveDTO) {
    const newFile = this.ossArchiveRepository.create(file);
    return await this.ossArchiveRepository.save(newFile);
  }

  async deleteFile(id: number, fileName: string) {

    // 删除 OSS 中的实际文件
    await this.backblazeService.deleteFile(fileName);

    // 删除数据库记录
    await this.ossArchiveRepository.delete(id);

    return { success: true };
  }
}
