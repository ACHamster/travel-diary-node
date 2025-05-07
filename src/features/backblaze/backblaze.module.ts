import { forwardRef, Module } from '@nestjs/common';
import { BackblazeService } from './backblaze.service';
import { BackblazeController } from './backblaze.controller';
import { OssArchiveModule } from '../oss-archive/oss-archive.module';

@Module({
  imports: [forwardRef(() => OssArchiveModule)],
  providers: [BackblazeService],
  controllers: [BackblazeController],
  exports: [BackblazeService],
})
export class BackblazeModule {}
