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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly aiStockService: AiStockService,
  ) {}

  @ApiOperation({ summary: 'Cria um novo orçamento manualmente' })
  @Post('budget')
  async create(@Request() req, @Body() body: { items: any[] }) {
    return this.inventoryService.createBudget(body.items, req.user.userId);
  }

  @ApiOperation({ summary: 'Lista todos os orçamentos do usuário' })
  @Get('budgets')
  async findAll(@Request() req) {
    return this.inventoryService.getAllBudgets(req.user.userId);
  }

  @ApiOperation({ summary: 'Confirma compra e move itens para o estoque' })
  @Post('budget/:id/confirm-purchase')
  async confirmPurchase(@Request() req, @Param('id') id: string) {
    return this.inventoryService.addToWorkStock(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Gera PDF de um orçamento específico' })
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

  @ApiOperation({ summary: 'Obtém dados consolidados do dashboard' })
  @Get('dashboard')
  async getDashboard(@Request() req) {
    return this.inventoryService.getUserDashboard(req.user.userId);
  }

  @ApiOperation({ summary: 'Análise de saúde do estoque via IA' })
  @Get('stock-advice')
  async getStockAdvice(@Request() req) {
    return await this.aiStockService.analyzeStockHealth(req.user.userId);
  }
}
