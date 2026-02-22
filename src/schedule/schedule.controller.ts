import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('schedule')
@Controller('schedule')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('auto-generate')
  @ApiOperation({ summary: 'IA planeia a obra e salva no banco' })
  async autoGenerate(@Request() req, @Body('description') desc: string) {
    return await this.scheduleService.generateAutoSchedule(
      req.user.userId,
      desc,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Ver meu cronograma' })
  async findAll(@Request() req) {
    return await this.scheduleService.getMySchedule(req.user.userId);
  }

  @Get('task/:id/resources')
  @ApiOperation({
    summary: 'IA sugere materiais e profissionais para esta etapa',
  })
  async getResources(@Request() req, @Param('id') taskId: string) {
    return await this.scheduleService.getTaskResources(req.user.userId, taskId);
  }
}
