import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  Patch,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { InventoryService } from '../inventory/inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('schedule')
@Controller('schedule')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('task/:id/confirm-receipt')
  @ApiOperation({
    summary: 'Confirma recebimento de materiais e finaliza etapa',
  })
  async confirmReceipt(
    @Request() req,
    @Param('id') taskId: string,
    @Body() body: { items: any[] },
  ) {
    await this.scheduleService.updateTaskStatus(
      req.user.userId,
      taskId,
      'COMPLETED',
    );
    return await this.inventoryService.updateWorkStock(
      req.user.userId,
      body.items,
    );
  }

  @Patch('task/:id/delay')
  @ApiOperation({ summary: 'Reporta atraso e empurra cronograma' })
  async reportDelay(
    @Request() req,
    @Param('id') taskId: string,
    @Body('days') days: number,
  ) {
    return await this.scheduleService.handleDelay(
      req.user.userId,
      taskId,
      days,
    );
  }

  @Post('auto-generate')
  async autoGenerate(@Request() req, @Body('description') desc: string) {
    return await this.scheduleService.generateAutoSchedule(
      req.user.userId,
      desc,
    );
  }

  @Get()
  async findAll(@Request() req) {
    return await this.scheduleService.getMySchedule(req.user.userId);
  }
}
