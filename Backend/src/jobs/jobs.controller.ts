import { Controller, Get, Param, Post, Body, UseGuards, ValidationPipe, UsePipes, Headers, UnauthorizedException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/get-user.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list() {
    return this.jobsService.findAll();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.COMPANY)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: any,
  ) {
    const companyId = user?.id;

    if (!companyId) {
      throw new UnauthorizedException('ID de la empresa no encontrado. El endpoint requiere autenticación.');
    }

    return this.jobsService.create(companyId, createJobDto);
  }
}
