/**
 * Feature: 事件系统
 * BDD Tests for Events module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 事件系统', () => {
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
      data: { name: '事件测试小区', city: '南京', district: '鼓楼区', address: '事件路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'events-test-user' });
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

    // 第二个用户：用于验证匿名事件对「非本人」脱敏
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'events-test-user-2' });
    token2 = res2.body.data.token;
    userId2 = res2.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token2}`)
      .send({ communityId });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.eventFavorite.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.eventLike.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.eventThank.deleteMany({ where: { fromUserId: { in: [userId, userId2] } } });
    await prisma.eventComment.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.eventApplication.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.eventCompletionConfirmation.deleteMany({
      where: { userId: { in: [userId, userId2] } },
    });
    await prisma.report.deleteMany({ where: { reporterId: { in: [userId, userId2] } } });
    await prisma.contributionRecord.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.rankingSnapshot.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.event.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, userId2] } } });
    await app.close();
  });

  describe('Scenario: 发布事件', () => {
    it('should create an event and return it', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'help_request',
          title: '求助：搬运家具',
          description: '需要帮忙搬几张桌子',
          locationText: '3栋楼下',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.type).toBe('help_request');
      expect(res.body.data.title).toBe('求助：搬运家具');
    });
  });

  describe('Scenario: 获取事件列表', () => {
    it('should return events filtered by communityId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0]).toHaveProperty('type');
      expect(res.body.data.items[0]).toHaveProperty('title');
    });
  });

  describe('Scenario: 响应事件', () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`);
      eventId = res.body.data.items[0]?.id;
    });

    it('should create an application to respond to event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .send({ actionType: 'help', message: '我可以帮忙！' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.actionType).toBe('help');
    });
  });

  describe('Scenario: 点赞和收藏', () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`);
      eventId = res.body.data.items[0]?.id;
    });

    it('should toggle like on event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('should toggle favorite on event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });

  describe('Scenario: 匿名事件隐私脱敏', () => {
    let anonEventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'help_request',
          title: '匿名求助',
          description: '希望匿名发布',
          isAnonymous: true,
        });
      anonEventId = res.body.data.id;
    });

    it('should hide real creator identity from other users in detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${anonEventId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(res.body.data.isAnonymous).toBe(true);
      expect(res.body.data.creator).toBeNull();
      expect(res.body.data.creatorId).not.toBe(userId);
    });

    it('should hide real creator identity from other users in list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      const anon = res.body.data.items.find((e: any) => e.id === anonEventId);
      expect(anon).toBeDefined();
      expect(anon.creator).toBeNull();
      expect(anon.creatorId).not.toBe(userId);
    });

    it('should keep creatorId for the owner so edit button works', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${anonEventId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.creatorId).toBe(userId);
    });
  });

  // P-99: sendThanks 应能从不传 toUserId 的请求中自动推导
  describe('P-99: sendThanks 自动推导 toUserId', () => {
    let eventId: string;

    beforeAll(async () => {
      const event = await prisma.event.create({
        data: {
          communityId,
          creatorId: userId,
          type: 'help_request',
          title: 'P-99 测试事件',
          description: '测试 sendThanks',
          status: 'in_progress',
          selectedHelperId: userId2,
          rewardType: 'free',
        },
      });
      eventId = event.id;
    });

    afterAll(async () => {
      await prisma.eventThank.deleteMany({ where: { eventId } });
      await prisma.event.delete({ where: { id: eventId } });
    });

    it('POST /events/:id/thanks 不传 toUserId 时应自动从事件推导', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/thanks`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
    });
  });

  // P-223: confirmCompletion 重复确认应被拒绝（积分刷取漏洞）
  describe('P-223: confirmCompletion 防止重复确认', () => {
    let eventId: string;

    beforeAll(async () => {
      const event = await prisma.event.create({
        data: {
          communityId,
          creatorId: userId,
          type: 'help_request',
          title: 'P-223 测试事件',
          description: '测试重复确认',
          status: 'in_progress',
          selectedHelperId: userId2,
          rewardType: 'free',
        },
      });
      eventId = event.id;

      // 双方确认完成
      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/complete/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/complete/confirm`)
        .set('Authorization', `Bearer ${token2}`)
        .send({});
    });

    afterAll(async () => {
      await prisma.eventCompletionConfirmation.deleteMany({ where: { eventId } });
      await prisma.event.delete({ where: { id: eventId } });
    });

    it('POST /events/:id/complete/confirm 重复确认应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/complete/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
