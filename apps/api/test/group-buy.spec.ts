import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 购物拼拼 (M23)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let initiatorToken: string;
  let initiatorId: string;
  let responderToken: string;
  let responderId: string;
  let responder2Token: string;
  let responder2Id: string;
  let communityId: string;
  let seekGroupBuyId: string;
  let offerGroupBuyId: string;

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
      data: { name: '购物拼拼测试小区', city: '南京', district: '鼓楼区', address: '拼拼路1号' },
    });
    communityId = community.id;

    // 创建 3 个用户并认证
    const users = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/auth/wechat-login').send({ code: 'gb-initiator' }),
      request(app.getHttpServer()).post('/api/v1/auth/wechat-login').send({ code: 'gb-responder' }),
      request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'gb-responder2' }),
    ]);
    [initiatorToken, responderToken, responder2Token] = users.map((u) => u.body.data.token);
    [initiatorId, responderId, responder2Id] = users.map((u) => u.body.data.user.id);

    // 注意：verifyStatus 在 CommunityMember 表上，不在 User 表上
    for (const u of users) {
      const userId = u.body.data.user.id;
      // 先让用户加入小区（select 会创建 CommunityMember）
      await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${u.body.data.token}`)
        .send({ communityId });
      // 再认证
      await prisma.communityMember.update({
        where: { userId_communityId: { userId, communityId } },
        data: { verifyStatus: 'verified' },
      });
    }
  });

  afterAll(async () => {
    await prisma.groupBuyItem.deleteMany({});
    await prisma.groupBuy.deleteMany({ where: { communityId } });
    // Bug 4 修复后 deliver 会创建 contribution_records + notifications + RankingSnapshot，需清理避免 community/user FK 报错
    await prisma.contributionRecord.deleteMany({ where: { sourceType: 'group_buy' } });
    await prisma.notification.deleteMany({ where: { targetType: 'group_buy' } });
    await prisma.rankingSnapshot.deleteMany({ where: { communityId } });
    // rankingSnapshot 还有 user_id FK，删测试 user 创建的快照
    await prisma.rankingSnapshot.deleteMany({
      where: { userId: { in: [initiatorId, responderId, responder2Id] } },
    });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.delete({ where: { id: communityId } });
    await prisma.user.deleteMany({
      where: { id: { in: [initiatorId, responderId, responder2Id] } },
    });
    await app.close();
  });

  describe('创建 (M23.2)', () => {
    it('seek 创建成功（items≥1）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'seek',
          location: '山姆',
          deliveryMethod: 'self_pickup',
          items: [{ name: '咖啡', qty: 2 }],
        });
      expect(res.status).toBe(201);
      seekGroupBuyId = res.body.data.id;
      expect(res.body.data.status).toBe('open'); // AiReview 默认 pass
    });

    it('seek 无 items 返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'seek',
          location: '山姆',
          deliveryMethod: 'self_pickup',
          items: [],
        });
      expect(res.status).toBe(400);
    });

    it('offer 创建成功（quota+departAt+bidCloseAt）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: 'Costco',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 2,
          deliveryMethod: 'self_pickup',
        });
      expect(res.status).toBe(201);
      offerGroupBuyId = res.body.data.id;
    });

    it('offer 缺 quota 返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: 'Costco',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          deliveryMethod: 'self_pickup',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('响应 + 名额 (M23.4)', () => {
    it('响应成功创建 item', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/respond`)
        .set('Authorization', `Bearer ${responderToken}`)
        .send({ name: '牛奶', qty: 1 });
      expect(res.status).toBe(201);
    });

    it('同一用户重复响应失败', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/respond`)
        .set('Authorization', `Bearer ${responderToken}`)
        .send({ name: '面包', qty: 1 });
      expect(res.status).toBe(409);
    });

    it('名额满后响应返回 409', async () => {
      // offer quota=2，已响应 1 人，再 1 人即满
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/respond`)
        .set('Authorization', `Bearer ${responder2Token}`)
        .send({ name: '鸡蛋', qty: 1 });
      // 第 3 人应该被拒（initiator 响应自己）
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/respond`)
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({ name: '水', qty: 1 });
      expect(res.status).toBe(409);
    });
  });

  describe('主买人操作 (M23.3 + M23.5)', () => {
    it('非主买人 confirm 返回 403', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offerGroupBuyId}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items[0].id;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/items/${itemId}/confirm`)
        .set('Authorization', `Bearer ${responderToken}`);
      expect(res.status).toBe(403);
    });

    it('主买人 confirm item', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offerGroupBuyId}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items[0].id;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/items/${itemId}/confirm`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('主买人 reject item 释放名额', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offerGroupBuyId}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items.find((i: any) => i.status === 'pending').id;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/items/${itemId}/reject`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(200);
    });

    it('close-bid 状态流转', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/close-bid`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('closed_for_bid');
    });

    it('跳过状态返回 400（open 直接 purchased）', async () => {
      const newOffer = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: '测试',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 1,
          deliveryMethod: 'self_pickup',
        });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${newOffer.body.data.id}/purchased`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(400);
    });

    it('purchased 状态流转', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offerGroupBuyId}/purchased`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('purchased');
    });

    it('deliver 自动 completed', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offerGroupBuyId}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      for (const item of detail.body.data.items) {
        if (item.status === 'confirmed') {
          const res = await request(app.getHttpServer())
            .post(`/api/v1/group-buys/${offerGroupBuyId}/items/${item.id}/deliver`)
            .set('Authorization', `Bearer ${initiatorToken}`);
          expect(res.status).toBe(200);
        }
      }
      const finalDetail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offerGroupBuyId}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(finalDetail.body.data.status).toBe('completed');
    });
  });

  describe('状态机守卫 (N1)', () => {
    it('open 状态 deliver 返回 400', async () => {
      const offer = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: '守卫1',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 1,
          deliveryMethod: 'self_pickup',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/respond`)
        .set('Authorization', `Bearer ${responderToken}`)
        .send({ name: '商品', qty: 1 });
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offer.body.data.id}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items[0].id;
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/items/${itemId}/confirm`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      // open 状态不可交付（须先 close-bid -> purchased）
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/items/${itemId}/deliver`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(400);
    });

    it('closed_for_bid 状态 deliver 返回 400', async () => {
      const offer = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: '守卫2',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 1,
          deliveryMethod: 'self_pickup',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/respond`)
        .set('Authorization', `Bearer ${responder2Token}`)
        .send({ name: '商品', qty: 1 });
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offer.body.data.id}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items[0].id;
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/items/${itemId}/confirm`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/close-bid`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      // closed_for_bid 状态不可交付（须先 purchased）
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/items/${itemId}/deliver`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(400);
    });

    it('purchased 状态 confirm 返回 400', async () => {
      const offer = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: '守卫3',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 1,
          deliveryMethod: 'self_pickup',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/respond`)
        .set('Authorization', `Bearer ${responderToken}`)
        .send({ name: '商品', qty: 1 });
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/close-bid`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/purchased`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/group-buys/${offer.body.data.id}`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      const itemId = detail.body.data.items[0].id;
      // purchased 状态不可再 confirm（须在 open/closed_for_bid 阶段处理）
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${offer.body.data.id}/items/${itemId}/confirm`)
        .set('Authorization', `Bearer ${initiatorToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('取消响应 (M23.6)', () => {
    it('截止前取消成功', async () => {
      const newOffer = await request(app.getHttpServer())
        .post('/api/v1/group-buys')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .send({
          type: 'offer',
          location: '取消测试',
          departAt: '2026-08-01T10:00:00Z',
          bidCloseAt: '2026-07-31T20:00:00Z',
          quota: 1,
          deliveryMethod: 'self_pickup',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${newOffer.body.data.id}/respond`)
        .set('Authorization', `Bearer ${responderToken}`)
        .send({ name: '测试商品', qty: 1 });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/group-buys/${newOffer.body.data.id}/cancel-response`)
        .set('Authorization', `Bearer ${responderToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('社区隔离', () => {
    it('跨小区查询返回空', async () => {
      const otherCommunity = await prisma.community.create({
        data: { name: '其他小区', city: '上海', district: '浦东', address: '其他路' },
      });
      const otherUser = await request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'gb-other' });
      await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${otherUser.body.data.token}`)
        .send({ communityId: otherCommunity.id });

      const res = await request(app.getHttpServer())
        .get('/api/v1/group-buys')
        .set('Authorization', `Bearer ${otherUser.body.data.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(0);

      await prisma.communityMember.deleteMany({ where: { communityId: otherCommunity.id } });
      await prisma.community.delete({ where: { id: otherCommunity.id } });
      await prisma.user.delete({ where: { id: otherUser.body.data.user.id } });
    });
  });
});
