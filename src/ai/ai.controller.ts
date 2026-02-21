import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { InventoryService } from '../inventory/inventory.service';
import { ParseBudgetDto } from './dto/parse.budget.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('parse-budget')
  async parse(@Body() parseBudgetDto: ParseBudgetDto) {
    const { text, userId } = parseBudgetDto;

    const result = await this.aiService.parseBudget(text);

    const itemsWithAnalysis = await Promise.all(
      result.items.map(async (item) => {
        const avg = await this.inventoryService.getProductAverage(
          userId,
          item.product,
        );

        let status = 'NA_MEDIA';
        let color = 'yellow';
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
          }
        }

        return {
          ...item,
          analysis: {
            status,
            color,
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
    );

    return {
      message: 'Orçamento processado e analisado com sucesso!',
      budget: savedBudget,
    };
  }
}
