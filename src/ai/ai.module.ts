import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiStockService } from './ai-stock.service';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationModule } from '../notifications/notifications.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => InventoryModule),
    forwardRef(() => ScheduleModule),
    NotificationModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiStockService],
  exports: [AiService, AiStockService],
})
export class AiModule {}
