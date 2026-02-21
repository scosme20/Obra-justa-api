import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Obra Justa API')
    .setDescription(
      'Gestão Financeira, Marketplace e Logística para Construção',
    )
    .setVersion('1.0')
    .addTag('inventory', 'Orçamentos e Inteligência de Gastos')
    .addTag('marketplace', 'Profissionais, Lojas e Entregadores')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 API rodando em: http://localhost:${port}`);
  console.log(`📝 Swagger disponível em: http://localhost:${port}/api\n`);
}

console.log(
  'TESTE ENV:',
  process.env.GROQ_API_KEY ? '✅ Chave carregada' : '❌ Chave não encontrada',
);

bootstrap();
