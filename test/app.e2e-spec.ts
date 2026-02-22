import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Fluxo de Cronograma (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // IMPORTANTE: Manter os mesmos pipes do main.ts para o teste ser realista
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();

    // 1. Simula o Login para pegar o token que usaremos nos outros testes
    // Ajuste o payload conforme seu AuthService/Controller de Auth
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ze@obrajusta.com', password: 'senha_segura_123' });

    accessToken = loginRes.body.access_token;
  });

  it('/schedule (GET) - Deve falhar sem token', () => {
    return request(app.getHttpServer()).get('/schedule').expect(401);
  });

  it('/schedule/task (POST) - Deve criar tarefa com sucesso quando autenticado', () => {
    return request(app.getHttpServer())
      .post('/schedule/task')
      .set('Authorization', `Bearer ${accessToken}`) // 🔑 Aqui passamos o token
      .send({
        title: 'Instalação Hidráulica',
        description: 'Tubulação do banheiro principal',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
      })
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('PENDING');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
