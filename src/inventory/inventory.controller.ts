import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { AiStockService } from '../ai/ai-stock.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly aiStockService: AiStockService,
  ) {}

  @Post('budget')
  @ApiOperation({ summary: 'Cria um novo orçamento completo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        requestedBy: { type: 'string', example: 'João Silva' },
        contractor: { type: 'string', example: 'Mestre de Obras' },
        storeName: { type: 'string', example: 'Loja Construir' },
        deliveryMan: { type: 'string', example: 'Carlos Entregas' },
        totalEconomy: { type: 'string', example: '15%' },
        economyValue: { type: 'string', example: 'R$ 150,00' },
        applicationNotes: { type: 'string', example: 'Material para reboco.' },
        logisticsInfo: {
          type: 'object',
          properties: {
            origin: { type: 'string' },
            destination: { type: 'string' },
            distance: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product: { type: 'string' },
              brand: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
              statusIa: { type: 'string' },
              variation: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async create(@Request() req, @Body() body: any) {
    return this.inventoryService.createBudget(body, req.user.userId);
  }

  @Get('budgets')
  async findAll(@Request() req) {
    return this.inventoryService.getAllBudgets(req.user.userId);
  }

  @Post('budget/:id/confirm-purchase')
  async confirmPurchase(@Request() req, @Param('id') id: string) {
    return this.inventoryService.addToWorkStock(req.user.userId, id);
  }

  @Get('budget/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.inventoryService.generateBudgetPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orcamento_${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('dashboard')
  async getDashboard(@Request() req) {
    return this.inventoryService.getUserDashboard(req.user.userId);
  }

  @Get('stock-advice')
  async getStockAdvice(@Request() req) {
    return await this.aiStockService.analyzeStockHealth(req.user.userId);
  }
}
