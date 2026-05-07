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
  BadRequestException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { AiStockService } from '../ai/ai-stock.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsumeStockDto, CreateBudgetDto } from './dto/inventory.dto';

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
  async create(@Request() req, @Body() createBudgetDto: CreateBudgetDto) {
    return this.inventoryService.createBudget(createBudgetDto, req.user.userId);
  }

  @Post('stock/consume')
  @ApiOperation({ summary: 'Dá baixa em material utilizado na obra' })
  async consume(@Request() req, @Body() consumeDto: ConsumeStockDto) {
    // Validação defensiva para evitar o erro de 'undefined'
    if (!consumeDto || !consumeDto.product) {
      throw new BadRequestException('Dados de consumo inválidos.');
    }

    return this.inventoryService.consumeFromStock(
      req.user.userId,
      consumeDto.product,
      consumeDto.quantity,
    );
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Lista todos os orçamentos do usuário' })
  async findAll(@Request() req) {
    return this.inventoryService.getAllBudgets(req.user.userId);
  }

  @Post('budget/:id/confirm-purchase')
  @ApiOperation({
    summary: 'Confirma a compra e move itens para o estoque real',
  })
  async confirmPurchase(@Request() req, @Param('id') id: string) {
    return this.inventoryService.addToWorkStock(req.user.userId, id);
  }

  @Get('budget/:id/pdf')
  @ApiOperation({ summary: 'Gera e faz download do PDF do orçamento' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.inventoryService.generateBudgetPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orcamento_${id}.pdf`,
      'Content-Length': buffer.length,
    });

    return res.status(HttpStatus.OK).send(buffer);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Retorna métricas financeiras e de progresso' })
  async getDashboard(@Request() req) {
    return this.inventoryService.getUserDashboard(req.user.userId);
  }

  @Get('stock-advice')
  @ApiOperation({ summary: 'Consulta a IA para análise de saúde do estoque' })
  async getStockAdvice(@Request() req) {
    return await this.aiStockService.analyzeStockHealth(req.user.userId);
  }
}
