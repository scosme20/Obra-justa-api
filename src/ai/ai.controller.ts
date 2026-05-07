import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService, ParsedBudget } from './ai.service';
import { AiStockService } from './ai-stock.service';
import { InventoryService } from '../inventory/inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

// Endpoints de IA têm limite próprio: 10 req/min por IP
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiStockService: AiStockService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('parse-budget')
  @ApiOperation({ summary: 'Processa orçamento via IA e salva no banco' })
  @ApiBody({
    schema: { type: 'object', properties: { text: { type: 'string' } } },
  })
  async parseBudget(
    @Body() body: { text: string },
    @Request() req,
  ): Promise<any> {
    const result: ParsedBudget = await this.aiService.parseBudget(body.text);
    const savedBudget = await this.inventoryService.createBudget(
      result,
      req.user.userId,
    );
    return {
      message: 'Processamento completo!',
      analysis: result,
      budgetId: savedBudget.id,
    };
  }

  @Get('stock-health')
  @ApiOperation({ summary: 'Análise de saúde do estoque por IA' })
  async getStockHealth(@Request() req) {
    return this.aiStockService.analyzeStockHealth(req.user.userId);
  }
}
