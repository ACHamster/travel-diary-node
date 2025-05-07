import { ApiProperty } from '@nestjs/swagger';

export class CreateOSSArchiveDTO {
  @ApiProperty({ description: '文件名'})
  file_name: string;

  @ApiProperty({ description: 'sha1校验制'})
  sha1: string;

  @ApiProperty({ description: '链接'})
  file_path: string;

  @ApiProperty({ description: '文件大小'})
  size: string;
}
