import { Module } from '@nestjs/common';

import { CvController } from './cv.controller';
import { CvStorageService } from './cv-storage.service';
import { CvService } from './cv.service';

@Module({
  controllers: [CvController],
  providers: [CvService, CvStorageService],
  exports: [CvService],
})
export class CvModule {}
