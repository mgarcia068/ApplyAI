import { Controller, Get, Param, Post, Body, UseGuards, ValidationPipe, UsePipes, UnauthorizedException, Delete, Put } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @Get('me/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  findMyOffers(@CurrentUser() user: any) {
    const companyId = user?.sub || user?.id;
    return this.jobsService.findCompanyOffers(companyId);
  }

  @Get('me/recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CANDIDATE)
  recommendForMe(@CurrentUser() user: any) {
    const candidateId = user?.sub || user?.id;
    return this.jobsService.recommendForCandidate(candidateId);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: any,
  ) {
    const companyId = user?.sub || user?.id;

    if (!companyId) {
      throw new UnauthorizedException('ID de la empresa no encontrado. El endpoint requiere autenticación.');
    }

    return this.jobsService.create(companyId, createJobDto);
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  update(
    @Param('id') id: string,
    @Body() updateData: any,
    @CurrentUser() user: any,
  ) {
    const companyId = user?.sub || user?.id;
    return this.jobsService.update(id, updateData, companyId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const companyId = user?.sub || user?.id;
    return this.jobsService.remove(id, companyId);
  }
}
