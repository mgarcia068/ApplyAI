import { Injectable } from '@nestjs/common';

@Injectable()
export class CvService {
  upload() {
    return { ok: true };
  }
}
