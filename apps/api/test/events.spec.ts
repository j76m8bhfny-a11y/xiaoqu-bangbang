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
    await prisma.userBadge.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.contributionRecord.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.rankingSnapshot.deleteMany({ where: { userId: { in: [userId, userId2] } } });
    await prisma.topic.deleteMany({ where: { communityId } });
    await prisma.aiReviewLog.deleteMany({ where: { targetId: { in: [] } } });
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

  // P-222: 重复响应（同 actionType）应返回 409 而非 500
  describe('P-222: 重复响应返回 409', () => {
    let eventId: string;

    beforeAll(async () => {
      const event = await prisma.event.create({
        data: {
          communityId,
          creatorId: userId,
          type: 'help_request',
          title: 'P-222 测试事件',
          description: '测试重复响应',
          status: 'open',
          rewardType: 'free',
        },
      });
      eventId = event.id;
    });

    afterAll(async () => {
      await prisma.eventApplication.deleteMany({ where: { eventId } });
      await prisma.notification.deleteMany({ where: { targetType: 'event', targetId: eventId } });
      await prisma.event.delete({ where: { id: eventId } });
    });

    it('POST /events/:id/applications 首次响应应返回 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ actionType: 'help', message: '我可以帮忙' });

      expect(res.status).toBe(201);
    });

    it('POST /events/:id/applications 重复响应应返回 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ actionType: 'help', message: '再次帮忙' });

      expect(res.status).toBe(409);
    });
  });

  // P-273: public_welfare 创建者应得 5 朵花（Standard M10.5: 各5朵）
  // 互助类走 confirmCompletion 双方确认完成 → handleEventCompletion
  describe('P-273: 互助类事件创建者积分', () => {
    let welfareEventId: string;

    afterAll(async () => {
      if (welfareEventId) {
        await prisma.contributionRecord.deleteMany({
          where: { sourceType: 'event', sourceId: welfareEventId },
        });
        await prisma.notification.deleteMany({
          where: { targetType: 'event', targetId: welfareEventId },
        });
        await prisma.eventCompletionConfirmation.deleteMany({
          where: { eventId: welfareEventId },
        });
        await prisma.event.deleteMany({ where: { id: welfareEventId } });
      }
    });

    it('public_welfare 完成后创建者和帮手各得 5 朵花 (P-273)', async () => {
      const event = await prisma.event.create({
        data: {
          communityId,
          creatorId: userId,
          type: 'public_welfare',
          title: 'P-273 公益活动',
          description: '社区清洁',
          status: 'in_progress',
          selectedHelperId: userId2,
          rewardType: 'free',
        },
      });
      welfareEventId = event.id;

      // 双方确认完成
      await request(app.getHttpServer())
        .post(`/api/v1/events/${welfareEventId}/complete/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      await request(app.getHttpServer())
        .post(`/api/v1/events/${welfareEventId}/complete/confirm`)
        .set('Authorization', `Bearer ${token2}`)
        .send({});

      // 验证创建者得 5 朵花
      const creatorCr = await prisma.contributionRecord.findFirst({
        where: { sourceType: 'event', sourceId: welfareEventId, userId },
      });
      expect(creatorCr).toBeTruthy();
      expect(creatorCr?.flowerCount).toBe(5);

      // 验证帮手得 5 朵花
      const helperCr = await prisma.contributionRecord.findFirst({
        where: { sourceType: 'event', sourceId: welfareEventId, userId: userId2 },
      });
      expect(helperCr).toBeTruthy();
      expect(helperCr?.flowerCount).toBe(5);
    });
  });

  // P-274+P-283: 议事类事件审核通过即发激励（Map.md §3.4: pending_review → open 即发激励）
  // 议事类不走 confirmCompletion，不走 handleEventCompletion
  describe('P-274+P-283: 议事类事件审核通过触发激励', () => {
    let topicId: string;
    let feedbackEventId: string;

    beforeAll(async () => {
      // 议事类事件必须挂议题
      const topic = await prisma.topic.create({
        data: {
          communityId,
          createdBy: userId,
          title: 'P-274 议题',
          description: '楼道灯问题讨论',
          aiReviewStatus: 'pass',
          status: 'open',
        },
      });
      topicId = topic.id;
    });

    afterAll(async () => {
      if (feedbackEventId) {
        await prisma.contributionRecord.deleteMany({
          where: { sourceType: 'event', sourceId: feedbackEventId },
        });
        await prisma.notification.deleteMany({
          where: { targetType: 'event', targetId: feedbackEventId },
        });
        await prisma.event.deleteMany({ where: { id: feedbackEventId } });
      }
      if (topicId) {
        await prisma.topic.delete({ where: { id: topicId } }).catch(() => {});
      }
    });

    it('public_feedback 审核通过后创建者得 1 朵花 + type=feedback 通知 (P-274+P-283)', async () => {
      // 通过 API 创建议事类事件 → AI 审核通过 → status='open' → 触发激励
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'public_feedback',
          title: 'P-274 议事反馈',
          description: '楼道灯问题',
          topicId,
        })
        .expect(201);

      feedbackEventId = res.body.data.id;
      expect(res.body.data.status).toBe('open');

      // 验证创建者得 1 朵花
      const creatorCr = await prisma.contributionRecord.findFirst({
        where: { sourceType: 'event', sourceId: feedbackEventId, userId },
      });
      expect(creatorCr).toBeTruthy();
      expect(creatorCr?.flowerCount).toBe(1);
      expect(creatorCr?.action).toBe('feedback');

      // 验证无 helper 贡献记录（议事类无帮手）
      const helperCr = await prisma.contributionRecord.findFirst({
        where: { sourceType: 'event', sourceId: feedbackEventId, userId: userId2 },
      });
      expect(helperCr).toBeNull();

      // 验证创建者收到 type='feedback' 通知
      const feedbackNotification = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'feedback',
          targetType: 'event',
          targetId: feedbackEventId,
        },
      });
      expect(feedbackNotification).toBeTruthy();
    });
  });

  describe('Scenario: P-225 ai_topic_suggest 开关', () => {
    let topicId: string;

    beforeAll(async () => {
      const topic = await prisma.topic.create({
        data: {
          communityId,
          title: '小区绿化问题讨论',
          description: '讨论小区绿化改善方案',
          createdBy: userId,
          aiReviewStatus: 'pass',
        },
      });
      topicId = topic.id;
    });

    afterAll(async () => {
      await prisma.topic.delete({ where: { id: topicId } }).catch(() => {});
    });

    it('开关关闭时应返回空数组', async () => {
      await prisma.systemSetting.upsert({
        where: { key: 'ai_topic_suggest' },
        update: { value: 'false' },
        create: { key: 'ai_topic_suggest', value: 'false' },
      });

      try {
        const res = await request(app.getHttpServer())
          .get('/api/v1/events/topic-suggestions')
          .query({ title: '绿化' })
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toHaveLength(0);
      } finally {
        await prisma.systemSetting.delete({ where: { key: 'ai_topic_suggest' } });
      }
    });

    it('开关开启时应返回推荐议题', async () => {
      await prisma.systemSetting.upsert({
        where: { key: 'ai_topic_suggest' },
        update: { value: 'true' },
        create: { key: 'ai_topic_suggest', value: 'true' },
      });

      try {
        const res = await request(app.getHttpServer())
          .get('/api/v1/events/topic-suggestions')
          .query({ title: '绿化' })
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.code).toBe(0);
        expect(res.body.data.items.length).toBeGreaterThan(0);
      } finally {
        await prisma.systemSetting.delete({ where: { key: 'ai_topic_suggest' } });
      }
    });
  });

  describe('Scenario: P-295 事件图片 AI 审核', () => {
    it('创建带图片的事件应调用 reviewImage', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'help_request',
          title: 'P-295 测试事件',
          description: '测试图片审核',
          images: ['https://example.com/p295-img.jpg'],
        })
        .expect(201);

      const eventId = res.body.data.id;

      try {
        const logs = await prisma.aiReviewLog.findMany({
          where: { targetType: 'event', targetId: eventId },
        });
        // 1 条文本审核 + 1 条图片审核 = 2 条
        expect(logs.length).toBeGreaterThanOrEqual(2);
      } finally {
        await prisma.aiReviewLog.deleteMany({ where: { targetId: eventId } });
        await prisma.notification.deleteMany({ where: { targetId: eventId } });
        await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
      }
    });
  });

  describe('Scenario: P-43-1 EventApplicationDto 扁平化', () => {
    let eventId: string;

    beforeAll(async () => {
      await prisma.communityMember.update({
        where: { userId_communityId: { userId: userId2, communityId } },
        data: { verifyStatus: 'verified' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'help_request',
          title: 'P-43-1 测试事件',
          description: '测试申请 DTO 扁平化',
        })
        .expect(201);
      eventId = res.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ actionType: 'join', message: '我来帮忙' })
        .expect(201);
    });

    afterAll(async () => {
      await prisma.eventApplication.deleteMany({ where: { eventId } });
      await prisma.notification.deleteMany({ where: { targetId: eventId } });
      await prisma.aiReviewLog.deleteMany({ where: { targetId: eventId } });
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
    });

    it('GET /events/:id/applications 应返回扁平 userNickname', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toHaveLength(1);
      const application = res.body.data.items[0];
      expect(application).toHaveProperty('userNickname');
      expect(application.userNickname).toBeTruthy();
      expect(application).toHaveProperty('userAvatarUrl');
      expect(application).not.toHaveProperty('user');
    });
  });
});
