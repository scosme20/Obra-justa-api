import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Logistics Flow (e2e)', () => {
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
      email: 'logistics@test.com',
      password: 'password123',
      name: 'Logistics Tester',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'logistics@test.com',
        password: 'password123',
      });

    authToken = loginRes.body.access_token;
  });

  it('/logistics/request (POST) - Deve criar um pedido de frete', () => {
    return request(app.getHttpServer())
      .post('/logistics/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        originCoords: { lat: -23.1, lng: -46.2 },
        destinationCoords: { lat: -23.2, lng: -46.3 },
        totalWeight: 1200,
        budgetId: 'mock-budget-id',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('WAITING_DRIVER');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
