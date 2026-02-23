import { Module, forwardRef } from '@nestjs/common'; // Importação do forwardRef
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [forwardRef(() => InventoryModule)],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
