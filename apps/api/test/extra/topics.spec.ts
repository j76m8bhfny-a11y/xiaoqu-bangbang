/**
 * Feature: 议事榜测试
 * 覆盖：topics 模块全部端点（CRUD / 赞踩 / 评分 / 评论 / 时间线）
 * 路径：apps/api/test/extra/topics.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 议事榜', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let userIdB: string;
  let communityId: string;
  let topicId: string;

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
      data: { name: '议事测试小区', city: '上海', district: '徐汇区', address: '议事路1号' },
    });
    communityId = community.id;

    // 用户 A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'topic-test-A' });
    tokenA = resA.body.data.token;
    userIdA = resA.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ communityId });

    // 用户 B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'topic-test-B' });
    tokenB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ communityId });

    // VerifiedMemberGuard 拦截未认证成员的写操作，测试夹具直接升级两个用户。
    await prisma.communityMember.updateMany({
      where: { communityId, userId: { in: [userIdA, userIdB] } },
      data: { verifyStatus: 'verified' },
    });
  });

  afterAll(async () => {
    try {
      await prisma.topicCommentLike.deleteMany({ where: { comment: { topic: { communityId } } } });
      await prisma.topicComment.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicLike.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicRating.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicMergeSuggestion.deleteMany({ where: { communityId } });
      await prisma.event.deleteMany({ where: { communityId } });
      await prisma.topic.deleteMany({ where: { communityId } });
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
      await prisma.community.delete({ where: { id: communityId } });
    } catch {
      // ignore
    } finally {
      await app.close();
    }
  });

  describe('议题 CRUD', () => {
    it('用户 A 创建议题应成功', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '三栋花坛修复', description: '花坛长期无人维护' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data.title).toBe('三栋花坛修复');
      expect(res.body.data.status).toBe('open');
      topicId = res.body.data.id;
    });

    it('GET /topics?status=open 应包含新建议题', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/topics?status=open')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.some((t: any) => t.id === topicId)).toBe(true);
    });

    it('GET /topics/:id 返回议题详情', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(topicId);
    });

    it('创建议题空标题应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('议题赞踩', () => {
    it('用户 B 点赞议题 → likeCount = 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/like`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ scope: 'open' });
      expect(res.status).toBe(201);
      expect(res.body.data.likeCount).toBe(1);
    });

    it('用户 B 切换为点踩 → likeCount=0, dislikeCount=1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/dislike`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ scope: 'open' });
      expect(res.status).toBe(201);
      expect(res.body.data.likeCount).toBe(0);
      expect(res.body.data.dislikeCount).toBe(1);
    });

    it('用户 B 取消踩 → dislikeCount=0', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/topics/${topicId}/like?scope=open`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      expect(res.body.data.dislikeCount).toBe(0);
    });

    it('未完结议题评分应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/rating`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ rating: 5 });
      expect(res.status).toBe(400);
    });
  });

  describe('议题评论', () => {
    let commentId: string;
    let replyId: string;

    it('用户 B 评论议题 → 200, commentCount +1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: '我也觉得花坛该修了', images: [] });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('我也觉得花坛该修了');
      commentId = res.body.data.id;

      const t = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(t.body.data.commentCount).toBe(1);
    });

    it('用户 A 回复评论 → 200, replyCount +1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '同意', parentId: commentId });
      expect(res.status).toBe(201);
      replyId = res.body.data.id;
    });

    it('回复回复（第 3 层）应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '反对', parentId: replyId });
      expect(res.status).toBe(400);
    });

    it('点赞评论 → likeCount +1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(201);
      expect(res.body.data.likeCount).toBe(1);
    });

    it('取消点赞 → likeCount -1', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/topics/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.likeCount).toBe(0);
    });

    it('评论列表按 hot 排序', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}/comments?sort=hot`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('议题完结后评分', () => {
    it('手动设置议题为 closed 后评分应成功', async () => {
      await prisma.topic.update({
        where: { id: topicId },
        data: {
          status: 'closed',
          closedSummary: '已完成修复',
          closedAt: new Date(),
          closedBy: userIdA,
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/rating`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ rating: 5 });
      expect(res.status).toBe(201);
      expect(res.body.data.ratingCount).toBe(1);
      expect(res.body.data.ratingSum).toBe(5);
    });

    it('重复评分应返回 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/topics/${topicId}/rating`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ rating: 4 });
      expect(res.status).toBe(409);
    });

    it('完结榜 GET /topics?status=closed 应返回该议题', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/topics?status=closed')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.some((t: any) => t.id === topicId)).toBe(true);
    });
  });

  describe('议题时间线', () => {
    it('议题下创建事件后，时间线返回该事件', async () => {
      // 先把议题改回 open，否则事件不显示
      await prisma.topic.update({ where: { id: topicId }, data: { status: 'open' } });

      // 通过 Prisma 直接创建事件挂到议题（避免依赖 Task 6 的端点）
      await prisma.event.create({
        data: {
          communityId,
          creatorId: userIdA,
          type: 'public_feedback',
          title: '三栋花坛照片',
          description: '附上现状照片',
          topicId,
          status: 'open',
          aiReviewStatus: 'pass',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicId}/timeline`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].type).toBe('event');
      expect(res.body.data.items[0].data.title).toBe('三栋花坛照片');
    });
  });

  describe('Events 议题挂载 & 推荐', () => {
    it('public_feedback 不传 topicId 应返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'public_feedback', title: '楼道灯坏了', description: '一楼楼道照明故障' });
      expect(res.status).toBe(400);
    });

    it('help_request 传 topicId 应返回 400（非议事类不能挂议题）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'help_request',
          title: '帮忙搬东西',
          description: '周末',
          topicId,
        });
      expect(res.status).toBe(400);
    });

    it('public_feedback 传合法 topicId 应成功并带 mock AI 点评', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'public_feedback',
          title: '三栋花坛又长草了',
          description: '需要绿化部门处理',
          topicId,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.topicId).toBe(topicId);
      // 命中「花坛/绿化」模板
      expect(res.body.data.aiComment).toContain('绿化');
    });

    it('GET /events/topic-suggestions 应返回相关议题', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events/topic-suggestions')
        .query({ title: '三栋花坛坏了', description: '想反馈花坛问题' })
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.some((s: any) => s.topicId === topicId)).toBe(true);
    });

    it('GET /events/topic-suggestions 不相关内容应返回空或低相似度', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events/topic-suggestions')
        .query({ title: '完全不相干内容', description: 'xyzqwerty' })
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.every((s: any) => s.similarity < 0.3)).toBe(true);
    });
  });

  // P-246: 议题标题长度校验（≤30 字）
  describe('P-246: 议题标题长度校验', () => {
    afterAll(async () => {
      await prisma.topic.deleteMany({
        where: { title: { startsWith: 'P-246' } },
      });
    });

    it('POST /topics 31 字标题应返回 400', async () => {
      const longTitle = 'P-246'.padEnd(31, '字');
      const res = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: longTitle, description: '超长测试' });

      expect(res.status).toBe(400);
    });

    it('POST /topics 30 字标题应返回 201', async () => {
      const okTitle = 'P-246'.padEnd(30, '字');
      const res = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: okTitle, description: '边界测试' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(okTitle);
    });
  });

  // P-247: findById 应返回 events 数组
  describe('P-247: 议题详情包含 events 数组', () => {
    let topicWithEventId: string;
    let eventId: string;

    beforeAll(async () => {
      const topic = await prisma.topic.create({
        data: {
          communityId,
          title: 'P-247 议题带事件',
          description: '测试详情返回 events',
          createdBy: userIdA,
          aiReviewStatus: 'pass',
        },
      });
      topicWithEventId = topic.id;

      const event = await prisma.event.create({
        data: {
          communityId,
          creatorId: userIdA,
          type: 'public_feedback',
          title: 'P-247 关联事件',
          description: '事件描述',
          status: 'open',
          topicId: topicWithEventId,
        },
      });
      eventId = event.id;
    });

    afterAll(async () => {
      await prisma.event.deleteMany({ where: { topicId: topicWithEventId } });
      await prisma.topic.delete({ where: { id: topicWithEventId } });
    });

    it('GET /topics/:id 应返回 events 数组且包含关联事件', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/topics/${topicWithEventId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.events)).toBe(true);
      expect(res.body.data.events.some((e: any) => e.id === eventId)).toBe(true);
    });
  });
});
