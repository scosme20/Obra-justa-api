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

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('budget')
  async create(@Request() req, @Body() body: { items: any[] }) {
    return this.inventoryService.createBudget(body.items, req.user.userId);
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
}
