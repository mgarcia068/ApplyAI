import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id };
  }
}
