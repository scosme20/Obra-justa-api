import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { AiModule } from './ai/ai.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { FinanceModule } from './finance/finance.module'; 
import { LogisticsModule } from './logistics/logistics.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FinanceModule,
    InventoryModule,
    AiModule,
    MarketplaceModule,
    AuthModule,
    ScheduleModule,
    LogisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
