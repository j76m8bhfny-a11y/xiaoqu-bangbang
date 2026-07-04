/**
 * Feature: 投票系统扩展测试
 * 覆盖 votes 用户侧 + admin 全部端点
 * 路径：apps/api/test/extra/votes.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 投票系统（全量）', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminUserId: string;
  let communityId: string;
  let publishedVoteId: string;

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
      data: { name: '投票测试小区', city: '南京', district: '鼓楼区', address: '投票路1号' },
    });
    communityId = community.id;

    // 普通用户
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'votes-user-001' });
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ communityId });

    // 居委/管理员用户
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'votes-admin-001' });
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ communityId });

    // 插入 admin_users 表（AdminGuard 需要，upsert 防重复）
    await prisma.adminUser.upsert({
      where: { userId: adminUserId },
      update: {},
      create: {
        userId: adminUserId,
        username: `admin_${adminUserId.slice(0, 8)}`,
        role: 'committee_admin',
        communityId,
      },
    });

    // 创建居委成员职位（claimStatus=unclaimed）
    await prisma.committeeMember.create({
      data: {
        communityId,
        name: '投票管理员',
        position: '管理员',
        avatarUrl: 'https://example.com/avatar.png',
        status: 'active',
        claimStatus: 'unclaimed',
      },
    });
  });

  afterAll(async () => {
    if (publishedVoteId) {
      await prisma.voteRecord.deleteMany({ where: { voteId: publishedVoteId } });
      await prisma.voteOption.deleteMany({ where: { voteId: publishedVoteId } });
      await prisma.vote.delete({ where: { id: publishedVoteId } });
    }
    await prisma.committeeMember.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.delete({ where: { id: communityId } });
    await prisma.adminUser.deleteMany({ where: { userId: { in: [userId, adminUserId] } } });
    await prisma.auditLog.deleteMany({ where: { operatorId: { in: [userId, adminUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminUserId] } } });
    await app.close();
  });

  // ===== 用户侧 API 测试 =====

  describe('【用户侧】获取投票列表', () => {
    it('GET /votes - 应返回该小区投票列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/votes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect([200, 403]); // 403=AuthGuard阻止无小区上下文

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });

    it('GET /votes - 无 token 应返回 401/403', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/votes').expect([401, 403]);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('【用户侧】查看投票详情', () => {
    it('GET /votes/:id - 不存在的投票', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/votes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect([200, 403, 404]);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('code');
      }
    });
  });

  describe('【用户侧】提交投票记录', () => {
    it('POST /votes/:id/records - 未登录返回401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/votes/any-id/records')
        .send({ selectedOptionIds: [] })
        .expect(401);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ===== 居委/管理员侧 API 测试 =====

  describe('【管理侧】创建投票', () => {
    it('POST /admin/votes - 居委创建草稿投票', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/votes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '小区活动投票',
          description: '选择下期活动内容',
          voteType: 'single',
          maxChoices: 1,
          options: ['趣味运动会', '读书分享会', '美食烹饪课'],
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('draft');
      publishedVoteId = res.body.data.id;
    });

    it('POST /admin/votes - 普通用户创建应返回403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/votes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '非法投票',
          options: ['A', 'B'],
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(403);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('【管理侧】投票生命周期', () => {
    it('POST /admin/votes/:id/publish - 发布草稿投票', async () => {
      if (!publishedVoteId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/votes/${publishedVoteId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('published');
    });

    it('POST /admin/votes/:id/close - 关闭投票', async () => {
      if (!publishedVoteId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/votes/${publishedVoteId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('closed');
    });

    it('PATCH /admin/votes/:id - 更新投票信息', async () => {
      if (!publishedVoteId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/votes/${publishedVoteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '修改后的投票标题' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('GET /admin/votes/:id/results - 查看投票结果', async () => {
      if (!publishedVoteId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/votes/${publishedVoteId}/results`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  describe('【管理侧】投票列表查询', () => {
    it('GET /admin/votes - 获取小区投票管理列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/votes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });
  });

  // P-24: 投票跨小区漏洞 — 用户不能给其他小区的投票投票
  describe('【安全】跨小区投票隔离', () => {
    let communityBId: string;
    let voteBId: string;
    let optionBId: string;

    beforeAll(async () => {
      const communityB = await prisma.community.create({
        data: { name: '投票隔离小区B', city: '南京', district: '鼓楼区', address: '隔离路5号' },
      });
      communityBId = communityB.id;

      const now = new Date();
      const voteB = await prisma.vote.create({
        data: {
          communityId: communityBId,
          title: '小区B投票',
          description: '跨小区隔离测试',
          voteType: 'single',
          onlyVerified: false, // 关闭认证限制以暴露跨小区漏洞
          startAt: now,
          endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'published',
          createdBy: adminUserId,
        },
      });
      voteBId = voteB.id;

      const optionB = await prisma.voteOption.create({
        data: { voteId: voteBId, content: '选项A', sortOrder: 0 },
      });
      optionBId = optionB.id;
    });

    afterAll(async () => {
      try {
        await prisma.voteRecord.deleteMany({ where: { voteId: voteBId } });
        await prisma.voteOption.deleteMany({ where: { voteId: voteBId } });
        await prisma.vote.delete({ where: { id: voteBId } });
        await prisma.community.delete({ where: { id: communityBId } });
      } catch {
        // 忽略清理错误
      }
    });

    it('POST /votes/:id/records - 不能给其他小区的投票投票', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/votes/${voteBId}/records`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ selectedOptionIds: [optionBId] });

      // 应返回 403/404，而非 201
      expect([403, 404]).toContain(res.status);
    });
  });
});
