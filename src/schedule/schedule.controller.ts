import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('schedule')
@Controller('schedule')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Cronograma ativo do usuário' })
  async getMySchedule(@Request() req) {
    return await this.scheduleService.getMySchedule(req.user.userId);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Fluxo de caixa projetado com Marketplace' })
  async getCashFlow(@Request() req) {
    return await this.scheduleService.getCashFlow(req.user.userId);
  }

  @Get('budget-comparison')
  @ApiOperation({ summary: 'Realizado vs. Orçado' })
  async getComparison(@Request() req) {
    return await this.scheduleService.getBudgetComparison(req.user.userId);
  }

  @Get('saving-suggestions')
  @ApiOperation({ summary: 'Sugestões de economia da IA' })
  async getSavings(@Request() req) {
    return await this.scheduleService.getAISavingSuggestions(req.user.userId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alertas de estoque para os próximos 15 dias' })
  async getAlerts(@Request() req) {
    return await this.scheduleService.getStockAlerts(req.user.userId);
  }

  @Post('generate-ai')
  @ApiOperation({ summary: 'Gera cronograma via IA' })
  async generateAuto(@Request() req, @Body('description') description: string) {
    return await this.scheduleService.generateAutoSchedule(
      req.user.userId,
      description,
    );
  }

  @Post('task/:id/expense')
  @ApiOperation({ summary: 'Registra gasto real na tarefa' })
  async addExpense(
    @Request() req,
    @Param('id') taskId: string,
    @Body() body: { amount: number; description: string },
  ) {
    return await this.scheduleService.addRealExpense(
      req.user.userId,
      taskId,
      body.amount,
      body.description,
    );
  }

  @Post('task/:id/confirm-receipt')
  @ApiOperation({ summary: 'Conclui etapa e abastece estoque' })
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
  @ApiOperation({ summary: 'Reporta atraso e propaga impacto' })
  async reportDelay(
    @Request() req,
    @Param('id') taskId: string,
    @Body('days', ParseIntPipe) days: number,
  ) {
    return await this.scheduleService.handleDelay(
      req.user.userId,
      taskId,
      days,
    );
  }

  @Patch('task/:id/status')
  @ApiOperation({ summary: 'Atualiza status manualmente' })
  async updateStatus(
    @Request() req,
    @Param('id') taskId: string,
    @Body('status') status: string,
  ) {
    return await this.scheduleService.updateTaskStatus(
      req.user.userId,
      taskId,
      status,
    );
  }
}
