import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AiService, ParsedBudget } from './ai.service';
import { AiStockService } from './ai-stock.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiStockService: AiStockService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  @ApiOperation({
    summary: 'Processa orçamento completo via IA e salva no banco',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
    },
  })
  @Post('parse-budget')
  async parseBudget(
    @Body() body: { text: string },
    @Request() req,
  ): Promise<any> {
    const userId = req.user.userId;

    const result: ParsedBudget = await this.aiService.parseBudget(body.text);

    const savedBudget = await this.inventoryService.createBudget(
      result,
      userId,
    );

    return {
      message: 'Processamento completo realizado!',
      analysis: result,
      budgetId: savedBudget.id,
    };
  }

  @Get('stock-health')
  async getStockHealth(@Request() req) {
    return await this.aiStockService.analyzeStockHealth(req.user.userId);
  }
}
