import { Module, forwardRef } from '@nestjs/common';
import { AiStockService } from './ai-stock.service';
import { AiService } from './ai.service'; // Importe o AiService
import { AiController } from './ai.controller'; // Importe o AiController
import { InventoryModule } from '../inventory/inventory.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    forwardRef(() => InventoryModule),
    forwardRef(() => ScheduleModule),
  ],
  controllers: [AiController],
  providers: [AiStockService, AiService],
  exports: [AiStockService, AiService],
})
export class AiModule {}
