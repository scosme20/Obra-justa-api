import { Module, forwardRef } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AiModule } from '../ai/ai.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module'; // Importando o AuthModule corrigido
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AuthModule, // Agora o ScheduleModule "enxerga" como validar o JWT
    ConfigModule,
    forwardRef(() => AiModule),
    forwardRef(() => InventoryModule),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
