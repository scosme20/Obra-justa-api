import { Controller, Get, Delete, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('budgets/:userId')
  async listAll(@Param('userId') userId: string) {
    return await this.inventoryService.getAllBudgets(userId);
  }

  @Get('dashboard/:userId')
  async getDashboard(@Param('userId') userId: string) {
    return await this.inventoryService.getUserDashboard(userId);
  }
  @Delete('budget/:id')
  async remove(@Param('id') id: string) {
    return await this.inventoryService.deleteBudget(id);
  }
}
