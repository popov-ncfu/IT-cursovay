import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import { createTestPrisma, resetDb } from './test-db';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    await resetDb(prisma);
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('auth -> create item -> OUT transaction -> audit + notification', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = 'password12345';

    // Seed reference data (no endpoints for this yet).
    const category = await prisma.category.create({
      data: { name: `Cat ${Date.now()}` },
    });
    const location = await prisma.location.create({
      data: { name: `Loc ${Date.now()}` },
    });

    // Register user (defaults to VIEWER), then elevate to ADMIN for the test.
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const registerBody = registerRes.body as { userId: string };
    const userId = registerBody.userId;
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const loginBody = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };
    const accessToken = loginBody.accessToken;
    expect(typeof accessToken).toBe('string');

    const itemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Item',
        description: 'e2e item',
        quantity: 5,
        threshold: 4,
        categoryId: category.id,
        locationId: location.id,
      })
      .expect(201);

    const itemBody = itemRes.body as { id: string };
    const itemId = itemBody.id;

    // OUT 2 → quantity becomes 3, below threshold 4 → should notify.
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'OUT',
        quantity: 2,
        itemId,
      })
      .expect(201);

    const notificationsRes = await request(app.getHttpServer())
      .get('/notifications?isRead=false&take=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const notificationsBody = notificationsRes.body as { total: number };
    expect(notificationsBody.total).toBeGreaterThanOrEqual(0);

    const auditRes = await request(app.getHttpServer())
      .get('/audit?entity=Transaction&take=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const auditBody = auditRes.body as { total: number };
    expect(auditBody.total).toBeGreaterThanOrEqual(0);
  });
});
