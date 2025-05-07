import { forwardRef, Module } from '@nestjs/common';
import { OssArchiveController } from './oss-archive.controller';
import { OssArchiveService } from './oss-archive.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OssArchive } from '../../entity/oss-archive.entity';
import { BackblazeModule } from '../backblaze/backblaze.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OssArchive]),
    forwardRef(()=> BackblazeModule),
  ],
  controllers: [
    OssArchiveController,
  ],
  providers: [OssArchiveService],
  exports: [OssArchiveService],
})
export class OssArchiveModule {}
