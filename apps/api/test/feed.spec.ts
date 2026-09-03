import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: Feed 聚合端点 (M23)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let communityId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const community = await prisma.community.create({
      data: { name: 'Feed测试小区', city: '南京', district: '鼓楼区', address: '聚合路1号' },
    });
    communityId = community.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'feed-user' });
    token = loginRes.body.data.token;
    userId = loginRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });
    await prisma.communityMember.update({
      where: { userId_communityId: { userId, communityId } },
      data: { verifyStatus: 'verified' },
    });
  });

  afterAll(async () => {
    // 清理可能创建的 events/group_buys
    await prisma.groupBuyItem.deleteMany({});
    await prisma.groupBuy.deleteMany({ where: { communityId } });
    await prisma.event.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.delete({ where: { id: communityId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('GET /feed/all 返回 200 + items 数组', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/feed/all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });
});
