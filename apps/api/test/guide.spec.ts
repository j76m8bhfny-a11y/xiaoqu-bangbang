/**
 * Feature: 图文教程模块
 * 覆盖：Guide CRUD / 点赞收藏 / 评论 / 小区隔离
 * 路径：apps/api/test/guide.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 图文教程', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let userIdB: string;
  let communityId: string;
  let communityId2: string;
  let guideId: string;
  let publishedGuideId: string;

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
      data: { name: '教程测试小区', city: '上海', district: '浦东', address: '教程路1号' },
    });
    communityId = community.id;

    const community2 = await prisma.community.create({
      data: { name: '教程测试小区B', city: '上海', district: '徐汇', address: '教程路2号' },
    });
    communityId2 = community2.id;

    // 用户 A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'guide-test-A' });
    tokenA = resA.body.data.token;
    userIdA = resA.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ communityId });

    // 用户 B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'guide-test-B' });
    tokenB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ communityId });

    // VerifiedMemberGuard 拦截未认证成员的写操作
    await prisma.communityMember.updateMany({
      where: { communityId, userId: { in: [userIdA, userIdB] } },
      data: { verifyStatus: 'verified' },
    });
  });

  afterAll(async () => {
    try {
      await prisma.guideCommentLike.deleteMany({ where: { comment: { guide: { communityId } } } });
      await prisma.guideComment.deleteMany({ where: { guide: { communityId } } });
      await prisma.guideLike.deleteMany({ where: { guide: { communityId } } });
      await prisma.guideFavorite.deleteMany({ where: { guide: { communityId } } });
      await prisma.guide.deleteMany({ where: { communityId } });
      await prisma.guide.deleteMany({ where: { communityId: communityId2 } });
      await prisma.communityMember.deleteMany({
        where: { communityId: { in: [communityId, communityId2] } },
      });
      await prisma.community.deleteMany({ where: { id: { in: [communityId, communityId2] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    } catch (e) {
      // ignore cleanup errors
    }
    await app.close();
  });

  describe('创建教程', () => {
    it('创建成功，状态为 pending_review', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/guides')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '地暖使用指南',
          description: '冬季地暖使用注意事项...',
          images: ['https://example.com/img1.jpg'],
          category: 'usage_guide',
        });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('pending_review');
      expect(res.body.data.title).toBe('地暖使用指南');
      expect(res.body.data.authorId).toBe(userIdA);
      guideId = res.body.data.id;
    });

    it('标题超过50字 -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/guides')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'a'.repeat(51),
          description: '描述',
          category: 'other',
        });
      expect(res.status).toBe(400);
    });

    it('图片超过9张 -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/guides')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '测试',
          description: '描述',
          images: Array(10).fill('https://example.com/img.jpg'),
          category: 'other',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('编辑教程', () => {
    it('作者编辑 pending -> 成功', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/guides/${guideId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '地暖使用指南（修订）' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('地暖使用指南（修订）');
    });

    it('非作者编辑 -> 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/guides/${guideId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: '篡改' });
      expect(res.status).toBe(403);
    });

    it('published 状态不可编辑 -> 400', async () => {
      // 直接用 prisma 修改状态为 published
      const g = await prisma.guide.create({
        data: {
          communityId,
          authorId: userIdA,
          title: '已发布教程',
          description: '描述',
          images: [],
          category: 'repair',
          status: 'published',
        },
      });
      publishedGuideId = g.id;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/guides/${publishedGuideId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '修改已发布' });
      expect(res.status).toBe(400);
    });
  });

  describe('列表与详情', () => {
    it('列表只展示 published', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/guides')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const statuses = res.body.data.items.map((g: any) => g.status);
      expect(statuses.every((s: string) => s === 'published')).toBe(true);
      expect(statuses).toContain('published');
    });

    it('authorId 过滤可看 pending', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/guides?authorId=${userIdA}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const statuses = res.body.data.items.map((g: any) => g.status);
      expect(statuses).toContain('pending_review');
    });

    it('详情返回 isLiked/isFavorited + viewCount increment', async () => {
      const res1 = await request(app.getHttpServer())
        .get(`/api/v1/guides/${publishedGuideId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.viewCount).toBeGreaterThanOrEqual(1);
      expect(res1.body.data).toHaveProperty('isLiked');
      expect(res1.body.data).toHaveProperty('isFavorited');

      const res2 = await request(app.getHttpServer())
        .get(`/api/v1/guides/${publishedGuideId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res2.body.data.viewCount).toBe(res1.body.data.viewCount + 1);
    });

    it('pending 状态非作者不可见 -> 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/guides/${guideId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });
  });

  describe('软删除', () => {
    it('作者软删除 -> success', async () => {
      const g = await prisma.guide.create({
        data: {
          communityId,
          authorId: userIdA,
          title: '待删除',
          description: '描述',
          images: [],
          category: 'other',
          status: 'pending_review',
        },
      });
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/guides/${g.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      const check = await prisma.guide.findUnique({ where: { id: g.id } });
      expect(check?.deletedAt).not.toBeNull();
    });
  });

  describe('点赞与收藏', () => {
    it('点赞 toggle -> count 正确', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/like`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res1.status).toBe(201);
      expect(res1.body.data.liked).toBe(true);
      expect(res1.body.data.likeCount).toBeGreaterThanOrEqual(1);

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/like`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res2.body.data.liked).toBe(false);
      expect(res2.body.data.likeCount).toBe(res1.body.data.likeCount - 1);
    });

    it('收藏 toggle -> count 正确', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/favorite`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res1.status).toBe(201);
      expect(res1.body.data.favorited).toBe(true);

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/favorite`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res2.body.data.favorited).toBe(false);
    });
  });

  describe('评论', () => {
    let commentId: string;
    let replyId: string;

    it('创建顶级评论', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '很有用的教程！' });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('很有用的教程！');
      expect(res.body.data.parentId).toBeNull();
      commentId = res.body.data.id;
    });

    it('创建回复（2层）', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: '谢谢分享', parentId: commentId });
      expect(res.status).toBe(201);
      expect(res.body.data.parentId).toBe(commentId);
      replyId = res.body.data.id;
    });

    it('嵌套第3层 -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/guides/${publishedGuideId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '第三层', parentId: replyId });
      expect(res.status).toBe(400);
    });

    it('评论列表返回嵌套结构', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/guides/${publishedGuideId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBeGreaterThan(0);
      const top = items.find((c: any) => c.id === commentId);
      expect(top).toBeDefined();
      expect(top.replies.length).toBeGreaterThan(0);
      expect(top.replies[0].id).toBe(replyId);
    });

    it('评论点赞 toggle', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/guides/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(201);
      expect(res.body.data.liked).toBe(true);
      expect(res.body.data.likeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('小区隔离', () => {
    it('A 小区不能查 B 小区的 guide', async () => {
      // 用户 A 在小区 B 创建一个 guide
      await prisma.communityMember.create({
        data: {
          userId: userIdA,
          communityId: communityId2,
          role: 'resident',
          verifyStatus: 'verified',
        },
      });
      const g = await prisma.guide.create({
        data: {
          communityId: communityId2,
          authorId: userIdA,
          title: '小区B教程',
          description: '描述',
          images: [],
          category: 'other',
          status: 'published',
        },
      });

      // 用户 B 在小区 A，不应看到小区 B 的 guide
      const res = await request(app.getHttpServer())
        .get(`/api/v1/guides/${g.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });
  });
});
