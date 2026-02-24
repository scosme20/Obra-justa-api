import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { FinanceModule } from '../finance/finance.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    FinanceModule,
    forwardRef(() => AiModule), // Permite o uso do AiStockService no Controller
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
