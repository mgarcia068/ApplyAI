import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.CANDIDATE)
  create(@CurrentUser() user: JwtPayload, @Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(user, createApplicationDto);
  }

  @Get()
  listMine(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.listMine(user);
  }

  @Post(':id/evaluate')
  @Roles(Role.COMPANY)
  evaluateMatch(@Param('id') applicationId: string, @CurrentUser() user: JwtPayload) {
    return this.applicationsService.evaluateMatch(applicationId, user);
  }
}