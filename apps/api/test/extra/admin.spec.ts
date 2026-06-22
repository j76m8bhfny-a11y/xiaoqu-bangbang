/**
 * Feature: 管理后台扩展测试
 * 覆盖：admin/banners/rankings/share 全部端点
 * 路径：apps/api/test/extra/admin.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 管理后台（全量）', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let userToken: string;
  let userId: string;
  let communityId: string;
  let bannerId: string;
  let committeeMemberId: string;
  let announcementId: string;
  let badgeId: string;
  let serviceProviderId: string;
  let socialGroupId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const community = await prisma.community.create({
      data: { name: '管理测试小区', city: '南京', district: '鼓楼区', address: '管理路1号' },
    });
    communityId = community.id;

    // 管理员用户
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'admin-test-001' });
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

    // 创建居委成员职位
    const member = await prisma.committeeMember.create({
      data: {
        communityId,
        name: '测试居委',
        position: '主任',
        avatarUrl: 'https://example.com/avatar.png',
        status: 'active',
        claimStatus: 'unclaimed',
      },
    });
    committeeMemberId = member.id;

    // 普通用户
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'user-test-001' });
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ communityId });
  });

  // afterAll: 跳过清理（parallel 执行时外键约束冲突由测试框架隔离）
  afterAll(async () => {
    try {
      await prisma.committeeAnnouncement.deleteMany({ where: { communityId } });
      await prisma.banner.deleteMany({ where: { communityId } });
      await prisma.communitySocialGroup.deleteMany({ where: { communityId } });
      await prisma.serviceProvider.deleteMany({ where: { communityId } });
      await prisma.committeeMemberClaim.deleteMany({ where: { communityId } });
      await prisma.committeeMember.deleteMany({ where: { communityId } });
      await prisma.auditLog.deleteMany({ where: { operatorId: { in: [adminUserId, userId] } } });
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.adminUser.deleteMany({ where: { userId: { in: [adminUserId, userId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [adminUserId, userId] } } });
      if (badgeId) {
        await prisma.badge.delete({ where: { id: badgeId } });
      }
    } catch {
      // 忽略清理错误（parallel 测试间隔离问题）
    } finally {
      await app.close();
    }
  });

  // ===== Dashboard =====
  describe('【管理】Dashboard', () => {
    it('GET /admin/dashboard - 应返回统计数据', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toBeDefined();
    });

    it('GET /admin/dashboard - 普通用户应403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ===== Banner 管理 =====
  describe('【管理】Banner 管理', () => {
    it('GET /admin/banners - 获取Banner列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /admin/banners - 创建Banner', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          communityId,
          title: '测试Banner',
          subtitle: '副标题',
          imageUrl: 'https://example.com/banner.jpg',
          linkType: 'event',
          linkId: '00000000-0000-0000-0000-000000000001',
          sortOrder: 1,
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      bannerId = res.body.data.id;
      expect(res.body.data.status).toBe('draft');
    });

    it('PATCH /admin/banners/:id - 更新Banner', async () => {
      if (!bannerId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '修改后的Banner标题', sortOrder: 10 })
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('POST /admin/banners/:id/publish - 上线Banner', async () => {
      if (!bannerId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/banners/${bannerId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('published');
    });

    it('POST /admin/banners/:id/offline - 下线Banner', async () => {
      if (!bannerId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/banners/${bannerId}/offline`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('offline');
    });
  });

  // ===== 居委管理 =====
  describe('【管理】居委成员管理', () => {
    it('GET /admin/committee/members - 获取居委列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/committee/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /admin/committee/members - 创建居委职位', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/committee/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '副主任',
          position: '副主任',
          avatarUrl: 'https://example.com/vp.png',
          responsibility: '协助管理',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('PATCH /admin/committee/members/:id - 更新居委信息', async () => {
      if (!committeeMemberId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/committee/members/${committeeMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ position: '副主任', responsibility: '日常管理' })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 公告管理 =====
  describe('【管理】公告管理', () => {
    it('POST /admin/committee/announcements - 创建公告', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/committee/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '测试公告',
          content: '这是测试公告内容',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      announcementId = res.body.data.id;
    });

    it('GET /admin/committee/announcements - 获取公告列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/committee/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('PATCH /admin/committee/announcements/:id - 更新公告', async () => {
      if (!announcementId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/committee/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '修改后的公告标题', isPinned: true })
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 服务商管理 =====
  describe('【管理】服务商管理', () => {
    it('POST /admin/service-providers - 创建服务商', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          communityId,
          name: '测试保洁公司',
          category: 'cleaning',
          description: '专业家庭保洁',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      serviceProviderId = res.body.data.id;
    });

    it('GET /admin/service-providers - 获取服务商列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('PATCH /admin/service-providers/:id - 更新服务商', async () => {
      if (!serviceProviderId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '更名的保洁公司', sortOrder: 1 })
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('POST /admin/service-providers/:id/publish - 上线服务商', async () => {
      if (!serviceProviderId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/service-providers/${serviceProviderId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 社群管理 =====
  describe('【管理】社群管理', () => {
    it('POST /admin/community-social-groups - 创建社群', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/community-social-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          communityId,
          title: '测试微信群',
          description: '业主交流群',
          qrImageUrl: 'https://example.com/qr.png',
          visibleTo: 'verified',
          sortOrder: 1,
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      socialGroupId = res.body.data.id;
    });

    it('GET /admin/community-social-groups - 获取社群列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/community-social-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });

    it('DELETE /admin/community-social-groups/:id - 删除社群', async () => {
      if (!socialGroupId) return;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/community-social-groups/${socialGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 徽章管理 =====
  describe('【管理】徽章管理', () => {
    it('GET /admin/badges - 获取徽章列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/badges')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /admin/badges - 创建徽章', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/badges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `test-badge-${Date.now()}`,
          name: '测试徽章',
          description: '用于自动化测试',
          iconUrl: 'https://example.com/badge.png',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      badgeId = res.body.data.id;
    });

    it('POST /admin/users/:userId/badges - 授予用户徽章', async () => {
      if (!badgeId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${userId}/badges`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ badgeId, communityId })
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 排行榜与贡献 =====
  describe('【管理】排行榜与贡献', () => {
    it('GET /admin/contributions - 获取贡献记录', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/contributions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('POST /admin/rankings/recalculate - 重新计算排行榜', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/rankings/recalculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 审核管理 =====
  describe('【管理】认证审核', () => {
    it('GET /admin/verifications - 获取认证申请列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/verifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });

    it('GET /admin/reviews - 获取内容审核列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // ===== 安全测试 =====
  describe('【安全】权限边界', () => {
    it('GET /admin/events - 普通用户应403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect([401, 403]).toContain(res.status);
    });

    it('POST /admin/committee/members - 普通用户应403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/committee/members')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: '非法成员', position: '组长' })
        .expect(403);

      expect([401, 403]).toContain(res.status);
    });

    it('GET /admin/audit-logs - 操作审计日志', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });
});