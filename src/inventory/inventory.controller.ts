import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('budgets/:userId')
  async listAll(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return await this.inventoryService.getAllBudgets(userId, limit, search);
  }

  @Get('dashboard/:userId')
  async getDashboard(@Param('userId') userId: string) {
    return await this.inventoryService.getUserDashboard(userId);
  }

  @Get('analysis/:userId')
  async getAnalysis(@Param('userId') userId: string) {
    return await this.inventoryService.getPriceComparison(userId);
  }

  @Get('report/:userId/:category')
  async getCategoryReport(
    @Param('userId') userId: string,
    @Param('category') category: string,
  ) {
    return await this.inventoryService.getCategoryReport(userId, category);
  }

  @Delete('budget/:id')
  async deleteBudget(@Param('id') id: string) {
    return await this.inventoryService.deleteBudget(id);
  }
}
