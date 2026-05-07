import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationModule } from 'src/notifications/notifications.module';

@Module({
  imports: [InventoryModule, ScheduleModule, FinanceModule, NotificationModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
