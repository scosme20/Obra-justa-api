import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Obtém o resumo de gastos da obra por categoria' })
  async getSummary(@Request() req) {
    return this.financeService.getWorkSummary(req.user.userId);
  }

  @Post('expense')
  @ApiOperation({
    summary: 'Registra um gasto manual (Mão de obra, Ferramentas, etc)',
  })
  async addExpense(
    @Request() req,
    @Body()
    body: {
      amount: number;
      category: 'MATERIAL' | 'FREIGHT' | 'LABOR' | 'OTHER';
      description: string;
    },
  ) {
    return this.financeService.recordExpense(req.user.userId, body);
  }
}
