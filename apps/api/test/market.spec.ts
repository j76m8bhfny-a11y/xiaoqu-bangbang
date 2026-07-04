/**
 * Feature: 闲置模块
 * BDD Tests for Market module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 闲置模块', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let token2: string;
  let userId2: string;
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
      data: { name: '闲置测试小区', city: '南京', district: '鼓楼区', address: '闲置路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'market-test-user' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });

    // VerifiedMemberGuard 拦截未认证成员的写操作，测试夹具直接升级。
    await prisma.communityMember.update({
      where: { userId_communityId: { userId, communityId } },
      data: { verifyStatus: 'verified' },
    });

    // 第二个用户：作为 reviewer 评价 userId
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'market-test-user-2' });
    token2 = res2.body.data.token;
    userId2 = res2.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token2}`)
      .send({ communityId });

    await prisma.communityMember.update({
      where: { userId_communityId: { userId: userId2, communityId } },
      data: { verifyStatus: 'verified' },
    });
  });

  afterAll(async () => {
    await prisma.marketReview.deleteMany({ where: { reviewerId: { in: [userId, userId2] } } });
    await prisma.marketComment.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.marketItem.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, userId2] } } });
    await app.close();
  });

  describe('Scenario: 发布闲置', () => {
    it('should create a market item', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/market/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'free',
          title: '赠送儿童绘本',
          description: '9成新，适合3-6岁',
          tradeType: 'free',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.category).toBe('free');
    });
  });

  describe('Scenario: 获取闲置列表', () => {
    it('should return items filtered by communityId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/market/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: 评论闲置', () => {
    let itemId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/market/items')
        .set('Authorization', `Bearer ${token}`);
      itemId = res.body.data.items[0]?.id;
    });

    it('should add a comment to market item', async () => {
      if (!itemId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/market/items/${itemId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '很有兴趣，请问还在吗？' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
    });
  });

  // P-238: 重复评价（同 reviewer+reviewee+item）应返回 409 而非 500
  describe('P-238: 重复评价返回 409', () => {
    let itemId: string;

    beforeAll(async () => {
      const item = await prisma.marketItem.create({
        data: {
          communityId,
          sellerId: userId,
          category: 'free',
          title: 'P-238 评价测试闲置',
          description: '测试重复评价',
          tradeType: 'free',
          conditionLevel: 'good',
          status: 'active',
        },
      });
      itemId = item.id;
    });

    afterAll(async () => {
      await prisma.marketReview.deleteMany({ where: { itemId } });
      await prisma.marketItem.delete({ where: { id: itemId } });
    });

    it('POST /market/items/:id/reviews 首次评价应返回 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/market/items/${itemId}/reviews`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ revieweeId: userId, rating: 5, content: '很好的交易' });

      expect(res.status).toBe(201);
    });

    it('POST /market/items/:id/reviews 重复评价应返回 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/market/items/${itemId}/reviews`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ revieweeId: userId, rating: 4, content: '再次评价' });

      expect(res.status).toBe(409);
    });
  });

  // P-235: 已售/已下架商品不可编辑，应返回 400
  describe('P-235: 编辑已售/已下架闲置返回 400', () => {
    let soldItemId: string;
    let closedItemId: string;
    let activeItemId: string;

    beforeAll(async () => {
      const base = {
        communityId,
        sellerId: userId,
        category: 'free',
        title: 'P-235 闲置',
        description: '测试编辑状态校验',
        tradeType: 'free',
        conditionLevel: 'good',
      };
      const [sold, closed, active] = await Promise.all([
        prisma.marketItem.create({ data: { ...base, title: 'P-235 已售', status: 'sold' } }),
        prisma.marketItem.create({ data: { ...base, title: 'P-235 已下架', status: 'closed' } }),
        prisma.marketItem.create({ data: { ...base, title: 'P-235 在售', status: 'active' } }),
      ]);
      soldItemId = sold.id;
      closedItemId = closed.id;
      activeItemId = active.id;
    });

    afterAll(async () => {
      await prisma.marketItem.deleteMany({
        where: { id: { in: [soldItemId, closedItemId, activeItemId] } },
      });
    });

    it('PATCH /market/items/:id 已售商品编辑应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/market/items/${soldItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '尝试改标题' });

      expect(res.status).toBe(400);
    });

    it('PATCH /market/items/:id 已下架商品编辑应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/market/items/${closedItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '尝试改标题' });

      expect(res.status).toBe(400);
    });

    it('PATCH /market/items/:id 在售商品编辑应返回 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/market/items/${activeItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '改后的标题' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('改后的标题');
    });
  });

  describe('Scenario: P-236 评论分页', () => {
    let itemId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/market/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'P-236 测试商品',
          description: '测试评论分页',
          category: 'other',
          price: 0,
        })
        .expect(201);
      itemId = res.body.data.id;

      // 直接用 prisma 创建 3 条评论
      for (let i = 0; i < 3; i++) {
        await prisma.marketComment.create({
          data: {
            itemId,
            userId,
            content: `评论 ${i + 1}`,
            status: 'visible',
          },
        });
      }
    });

    afterAll(async () => {
      await prisma.marketComment.deleteMany({ where: { itemId } });
      await prisma.marketItem.delete({ where: { id: itemId } }).catch(() => {});
    });

    it('GET /market/items/:id/comments 应支持分页', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/market/items/${itemId}/comments`)
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('pageSize', 2);
      expect(res.body.data).toHaveProperty('total', 3);
      expect(res.body.data.items).toHaveLength(2);
    });
  });
});
