import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PhotoStorageService } from './photo-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, PhotoStorageService],
  exports: [UsersService],
})
export class UsersModule {}
