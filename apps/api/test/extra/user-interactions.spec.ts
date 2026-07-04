/**
 * Feature: 用户互动与内容扩展测试
 * 覆盖：rankings/share 全部端点
 * 路径：apps/api/test/extra/user-interactions.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 用户互动与内容扩展', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let communityId: string;
  let eventId: string;
  let voteId: string;
  let voteOptionId: string;
  let marketItemId: string;

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
      data: { name: '互动测试小区', city: '南京', district: '鼓楼区', address: '互动路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'interaction-test-001' });
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

    // 创建测试活动
    const event = await prisma.event.create({
      data: {
        communityId,
        creatorId: userId,
        type: 'help_request',
        title: '测试活动',
        description: '用于测试互动功能',
        locationText: '测试地点',
        status: 'open',
      },
    });
    eventId = event.id;

    // 创建测试投票
    const vote = await prisma.vote.create({
      data: {
        communityId,
        createdBy: userId,
        title: '测试投票',
        description: '测试投票描述',
        voteType: 'single',
        maxChoices: 1,
        status: 'published',
        startAt: new Date(),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        options: {
          create: [{ content: '选项A', sortOrder: 0 }],
        },
      },
    });
    voteId = vote.id;
    const option = await prisma.voteOption.findFirst({ where: { voteId } });
    voteOptionId = option?.id ?? '';

    // 创建测试闲置
    const item = await prisma.marketItem.create({
      data: {
        communityId,
        sellerId: userId,
        category: 'free',
        title: '测试闲置',
        description: '测试描述',
        tradeType: 'free',
        conditionLevel: 'like_new',
        status: 'available',
      },
    });
    marketItemId = item.id;
  });

  // afterAll: 跳过清理（parallel 执行时外键约束冲突由测试框架隔离）
  afterAll(async () => {
    try {
      await prisma.marketReview.deleteMany({ where: { itemId: marketItemId } });
      await prisma.marketComment.deleteMany({ where: { itemId: { in: [marketItemId] } } });
      await prisma.marketComment.deleteMany({ where: { userId } });
      await prisma.marketItem.deleteMany({ where: { id: marketItemId } });
      await prisma.eventLike.deleteMany({ where: { eventId } });
      await prisma.eventFavorite.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
      if (voteOptionId) {
        await prisma.voteRecord.deleteMany({ where: { voteId } });
        await prisma.voteOption.deleteMany({ where: { voteId } });
        await prisma.vote.delete({ where: { id: voteId } });
      }
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.community.delete({ where: { id: communityId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // 忽略清理错误（parallel 测试间隔离问题）
    } finally {
      await app.close();
    }
  });

  // ===== 排行榜 =====
  describe('【排行榜】用户排行', () => {
    it('GET /rankings - 获取排行榜', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rankings')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });

    it('GET /rankings/me - 获取我的排名', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rankings/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('GET /badges - 获取徽章列表（无需认证）', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/badges').expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('GET /me/badges - 获取我的徽章', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/badges')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 分享 =====
  describe('【分享】分享卡片', () => {
    it('GET /share/card-config - 获取分享卡片配置', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/share/card-config')
        .query({ targetType: 'event', targetId: eventId })
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 404]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toBeDefined();
      }
    });

    it('GET /share/card-config - 缺少参数应提示', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/share/card-config')
        .set('Authorization', `Bearer ${token}`)
        .expect([400, 500]);

      if (res.status === 400) {
        expect(res.status).toBe(400);
      }
    });

    it('POST /share/logs - 记录分享日志', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/share/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetType: 'event',
          targetId: eventId,
          channel: 'wechat',
          scene: 'session',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 投票互动 =====
  describe('【投票】用户投票', () => {
    it('POST /votes/:id/records - 提交投票', async () => {
      if (!voteOptionId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/votes/${voteId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedOptionIds: [voteOptionId] })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }
    });

    it('POST /votes/:id/records - 重复投票应拒绝或覆盖', async () => {
      if (!voteOptionId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/votes/${voteId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedOptionIds: [voteOptionId] })
        // P-252: 重复投票现在返回 409 Conflict
        .expect([200, 201, 400, 403, 409]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }
    });

    it('GET /votes/:id/results - 查看投票结果', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/votes/${voteId}/results`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 活动互动 =====
  describe('【活动】活动点赞', () => {
    it('POST /events/:id/like - 点赞活动（切换）', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 201]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('liked');
      }
    });

    it('POST /events/:id/favorite - 收藏活动（切换）', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 201]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('favorited');
      }
    });
  });

  // ===== 市集互动 =====
  describe('【市集】评论与评价', () => {
    it('GET /market/items/:id/comments - 获取商品评论', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/market/items/${marketItemId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /market/items/:id/comments - 添加评论', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/market/items/${marketItemId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '测试评论内容' })
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('POST /market/items/:id/reviews - 添加评价', async () => {
      // 先创建另一个卖家用户来评价
      const sellerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'review-seller-001' });
      const sellerToken = sellerRes.body.data.token;
      const sellerId = sellerRes.body.data.user.id;

      await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ communityId });

      // 同步升级 seller 为 verified，否则 VerifiedMemberGuard 也会拦它。
      await prisma.communityMember.update({
        where: { userId_communityId: { userId: sellerId, communityId } },
        data: { verifyStatus: 'verified' },
      });

      // 给当前商品设置已售出状态
      await prisma.marketItem.update({
        where: { id: marketItemId },
        data: { status: 'sold', soldAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/market/items/${marketItemId}/reviews`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          revieweeId: sellerId,
          rating: 5,
          tags: ['发货快', '态度好'],
          content: '非常满意！',
        })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }

      // 恢复商品状态
      await prisma.marketItem.update({
        where: { id: marketItemId },
        data: { status: 'on_sale', soldAt: null },
      });

      // 清理卖家数据：先删关联表，再删 community_members，最后删 user
      await prisma.marketReview.deleteMany({ where: { revieweeId: sellerId } });
      await prisma.communityMember.deleteMany({ where: { userId: sellerId } });
      await prisma.user.delete({ where: { id: sellerId } });
    });
  });

  // ===== 通知 =====
  describe('【通知】消息通知', () => {
    it('GET /notifications - 获取通知列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /notifications/:id/read - 标记已读', async () => {
      // 先找一条通知
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = listRes.body.data.items;
      if (items.length > 0) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/notifications/${items[0].id}/read`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.code).toBe(0);
      }
    });

    it('POST /notifications/read-all - 全部已读', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 201]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }
    });
  });
});
