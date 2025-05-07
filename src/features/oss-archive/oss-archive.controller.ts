import { Body, Controller, Get, Post } from '@nestjs/common';
import { OssArchiveService } from './oss-archive.service';
import { AccessControl, AccessLevel } from '../../common/decorators/access-controll.decorator';

@Controller('api/oss-archive')
export class OssArchiveController {
  constructor(
    private readonly ossArchiveService: OssArchiveService,
  ) {}

  @AccessControl(AccessLevel.PUBLIC)
  @Get('files')
  async getAllFiles() {
    return await this.ossArchiveService.getAllFiles();
  }

  @AccessControl(AccessLevel.PUBLIC)
  @Post('delete')
  async deleteFile(@Body('data') body: { id: number; fileName: string }) {
    const id = body.id;
    const fileName =body.fileName;
    return await this.ossArchiveService.deleteFile(id, fileName);
  }
}
