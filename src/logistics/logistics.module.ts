import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [InventoryModule, ScheduleModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
