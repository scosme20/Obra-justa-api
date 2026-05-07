import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Fluxo de Cronograma (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'admin@obrajusta.com',
      password: '123456',
      name: 'Admin Teste',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@obrajusta.com',
        password: '123456',
      });

    if (loginRes.status === 201 || loginRes.status === 200) {
      authToken = loginRes.body.access_token;
    } else {
      console.error(
        '❌ Erro Crítico no E2E: Não foi possível obter token de acesso.',
        loginRes.body,
      );
    }
  });

  it('/schedule/auto-generate (POST) - Deve gerar cronograma via IA', async () => {
    expect(authToken).toBeDefined();

    return request(app.getHttpServer())
      .post('/schedule/generate-ai')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Reforma de banheiro completa de 5m2',
      })
      .expect((res) => {
        if (res.status === 401)
          throw new Error('Falha de Autenticação no Firebase');
        if (res.status === 404)
          throw new Error('Rota não encontrada no Controller');
      })
      .expect(201);
  });

  it('/schedule (GET) - Deve listar o cronograma', () => {
    expect(authToken).toBeDefined();

    return request(app.getHttpServer())
      .get('/schedule')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
