import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Obra Justa API')
    .setDescription(
      'Gestão Financeira, Marketplace e Logística para Construção',
    )
    .setVersion('1.0')
    .addTag('auth', 'Autenticação e sessões')
    .addTag('inventory', 'Orçamentos e estoque')
    .addTag('finance', 'Despesas e relatórios')
    .addTag('marketplace', 'Profissionais, lojas e avaliações')
    .addTag('logistics', 'Fretes e entregas')
    .addTag('schedule', 'Cronograma de obra')
    .addTag('notifications', 'Alertas e notificações')
    .addTag('catalog', 'Catálogo master de produtos')
    .addTag('ai', 'Análises por Inteligência Artificial')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 API rodando em: http://localhost:${port}`);
  console.log(`📝 Swagger disponível em: http://localhost:${port}/api\n`);
}

bootstrap();
