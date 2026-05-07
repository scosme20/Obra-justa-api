import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { AiModule } from './ai/ai.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { FinanceModule } from './finance/finance.module';
import { LogisticsModule } from './logistics/logistics.module';
import { CatalogModule } from './catalog/catalog.module';
import { NotificationModule } from './notifications/notifications.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global: 60 req/minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    FinanceModule,
    InventoryModule,
    AiModule,
    MarketplaceModule,
    ScheduleModule,
    LogisticsModule,
    CatalogModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Throttle aplicado globalmente em todas as rotas
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
