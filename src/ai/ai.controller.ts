import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { InventoryService } from '../inventory/inventory.service';
import { ParseBudgetDto } from './dto/parse.budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('parse-budget')
  @ApiOperation({
    summary: 'Processa texto de orçamento com análise de preços e logística',
    description:
      'Extrai itens, fornecedor, solicitante e executor, comparando com histórico.',
  })
  @ApiResponse({
    status: 201,
    description: 'Orçamento processado e analisado.',
  })
  async parse(@Body() parseBudgetDto: ParseBudgetDto, @Request() req) {
    const userId = req.user.userId;
    const { text } = parseBudgetDto;

    const result = await this.aiService.parseBudget(text);

    const itemsWithAnalysis = await Promise.all(
      result.items.map(async (item) => {
        const avg = await this.inventoryService.getProductAverage(
          userId,
          item.product,
        );

        let status = 'PREÇO JUSTO';
        let color = 'green';
        let percentageDiff = 0;
        let valueDiff = 0;

        if (avg > 0) {
          valueDiff = item.price - avg;
          percentageDiff = (valueDiff / avg) * 100;

          if (percentageDiff <= -5) {
            status = 'BARATO';
            color = 'green';
          } else if (percentageDiff >= 10) {
            status = 'CARO';
            color = 'red';
          } else if (percentageDiff > 0) {
            status = 'ACIMA DA MÉDIA';
            color = 'yellow';
          }
        }

        return {
          ...item,
          status,
          color,
          analysis: {
            avgPriceAtTime: avg.toFixed(2),
            diffValue: valueDiff.toFixed(2),
            diffPercentage: `${percentageDiff > 0 ? '+' : ''}${percentageDiff.toFixed(1)}%`,
          },
        };
      }),
    );

    const savedBudget = await this.inventoryService.createBudget(
      itemsWithAnalysis,
      userId,
      {
        requestedBy: result.requestedBy || req.user.name || 'Sebastiao',
        contractor: result.contractor || 'Equipe Geral de Obra',
        storeName: result.storeName || 'Fornecedor Local',
        deliveryMan: result.deliveryMan || 'Transportadora Própria',
      },
    );

    return {
      message: 'Orçamento analisado e registrado com sucesso!',
      budget: savedBudget,
    };
  }
}
