import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);

  app.useGlobalPipes(new ValidationPipe());
}
console.log('TESTE ENV:', process.env.GROQ_API_KEY);

bootstrap();
