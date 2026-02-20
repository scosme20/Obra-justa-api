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
    const savedBudget = await this.inventoryService.createBudget(
      result.items,
      userId,
    );

    return {
      message: 'Orçamento processado e salvo!',
      budget: savedBudget,
    };
  }
}
