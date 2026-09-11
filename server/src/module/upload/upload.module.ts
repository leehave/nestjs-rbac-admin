import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CoreUploadController,
  AttachmentController,
  AttachmentCategoryController,
} from './upload.controller';
import { UploadService } from './upload.service';
import { UploadEntity } from './entities/upload.entity';
import { AttachmentCategoryEntity } from './entities/attachment-category.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UploadEntity, AttachmentCategoryEntity])],
  controllers: [CoreUploadController, AttachmentController, AttachmentCategoryController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
