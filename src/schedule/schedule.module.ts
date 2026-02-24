import { Module, forwardRef } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AiModule } from '../ai/ai.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [forwardRef(() => AiModule), forwardRef(() => InventoryModule)],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService], // CERTIFIQUE-SE DE QUE ESTÁ EXPORTADO AQUI
})
export class ScheduleModule {}
