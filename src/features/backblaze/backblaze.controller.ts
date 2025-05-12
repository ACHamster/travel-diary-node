import { Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackblazeService, B2FileInfo } from './backblaze.service';
import { Public } from '../../common/decorators/public.decorator';
import { AccessControl, AccessLevel } from '../../common/decorators/access-controll.decorator';

// 定义上传文件的接口
interface UploadedFileData {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Public()
@Controller('/api/storage')
export class BackblazeController {
  constructor(private readonly b2Service: BackblazeService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @AccessControl(AccessLevel.PUBLIC)
  async uploadFile(@UploadedFile() file: UploadedFileData): Promise<B2FileInfo | { video: B2FileInfo; thumbnail: B2FileInfo }> {
    const fileName = `travel/${file.originalname}`;

    // 判断是否为视频文件
    const videoMimeTypes = ['video/mp4', 'video/mkv', 'video/avi', 'video/mov'];
    if (videoMimeTypes.includes(file.mimetype)) {
      return await this.b2Service.uploadVideo(fileName, file.buffer, file.mimetype);
    }

    // 根据文件大小选择普通上传或大文件上传
    if (file.buffer.length > 5 * 1024 * 1024) { // 5MB
      return await this.b2Service.uploadLargeFile(
        fileName,
        file.buffer,
        file.mimetype,
      );
    } else {
      return await this.b2Service.uploadFile(
        fileName,
        file.buffer,
        file.mimetype,
      );
    }
  }

  @Public()
  @Get('files')
  async listFiles(): Promise<unknown[]> {
    return await this.b2Service.listFiles();
  }

  @Public()
  @Get('files/:fileName')
  async downloadFile(@Param('fileName') fileName: string): Promise<Buffer> {
    return await this.b2Service.downloadFile(fileName);
  }

  @Delete('files/:fileName')
  async deleteFile(@Param('fileName') fileName: string): Promise<{success: boolean}> {
    await this.b2Service.deleteFile(fileName);
    return { success: true };
  }
}

