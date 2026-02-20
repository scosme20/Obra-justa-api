import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('update')
  async update(
    @Body() body: { storeId: string; productId: string; price: number },
  ) {
    return this.inventoryService.updatePrice(
      body.storeId,
      body.productId,
      body.price,
    );
  }

  @Get('ranking/:productId')
  async getRanking(@Param('productId') productId: string) {
    return this.inventoryService.getRankingByProduct(productId);
  }
}
