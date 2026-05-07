import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

class RecordLaborDto {
  @ApiProperty({ example: 'João Pedreiro' })
  @IsString()
  workerName: string;

  @ApiProperty({ example: 'Pedreiro' })
  @IsString()
  role: string;

  @ApiProperty({ example: 350.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2026-05-10' })
  @IsString()
  date: string;

  @ApiProperty({
    required: false,
    example: 'Diária de assentamento de tijolos',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de gastos da obra por categoria' })
  async getSummary(@Request() req) {
    return this.financeService.getWorkSummary(req.user.userId);
  }

  @Post('expense')
  @ApiOperation({
    summary: 'Registra um gasto manual (material, ferramenta, etc)',
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

  @Post('labor')
  @ApiOperation({ summary: 'Registra pagamento de mão de obra' })
  async addLabor(@Request() req, @Body() body: RecordLaborDto) {
    return this.financeService.recordLabor(req.user.userId, body);
  }
}
