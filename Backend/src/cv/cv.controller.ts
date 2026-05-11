import { Controller, Post } from '@nestjs/common';

import { CvService } from './cv.service';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  upload() {
    return this.cvService.upload();
  }
}
