import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  findAll() {
    // MVP: placeholder
    return [];
  }

  findOne(id: string) {
    // MVP: placeholder
    return { id };
  }
}
