import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Body,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Response } from 'express';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('budget')
  async createBudget(@Body() body: { items: any[]; userId: string }) {
    return await this.inventoryService.createBudget(body.items, body.userId);
  }

  @Post('limit/:userId')
  async setLimit(
    @Param('userId') userId: string,
    @Body('monthlyLimit') monthlyLimit: number,
  ) {
    return await this.inventoryService.setUserLimit(userId, monthlyLimit);
  }

  @Get('dashboard/:userId')
  async getDashboard(
    @Param('userId') userId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return await this.inventoryService.getUserDashboard(userId, month, year);
  }

  @Get('budgets/:userId')
  async listAll(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return await this.inventoryService.getAllBudgets(userId, limit, search);
  }

  @Get('report/:userId/:category')
  async getCategoryReport(
    @Param('userId') userId: string,
    @Param('category') category: string,
  ) {
    return await this.inventoryService.getCategoryReport(userId, category);
  }

  @Get('export/pdf/:id')
  async exportPDF(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.inventoryService.generateBudgetPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orcamento_${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export/excel/:id')
  async exportExcel(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.inventoryService.generateBudgetExcel(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=orcamento_${id}.xlsx`,
    });
    res.end(buffer);
  }

  @Get('export/whatsapp/:id')
  async exportWhatsApp(@Param('id') id: string) {
    const doc = await this.inventoryService.getBudgetById(id);
    let msg = `*Relatório de Compra* 🏗️\n\n`;
    doc.items.forEach((i: any) => {
      msg += `🔹 *${i.product.toUpperCase()}*: ${i.quantity}x R$${i.price.toFixed(2)} = *R$${i.subtotal.toFixed(2)}*\n`;
    });
    msg += `\n💰 *Total: R$ ${doc.totalValue.toFixed(2)}*`;
    return { message: msg };
  }

  @Delete('budget/:id')
  async deleteBudget(@Param('id') id: string) {
    return await this.inventoryService.deleteBudget(id);
  }
}
