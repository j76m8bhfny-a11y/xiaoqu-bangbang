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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
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

    // VerifiedMemberGuard 拦截未认证成员的写操作，测试夹具直接升级两个用户。
    await prisma.communityMember.updateMany({
      where: { communityId, userId: { in: [adminUserId, userId] } },
      data: { verifyStatus: 'verified' },
    });
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
      await prisma.marketItem.deleteMany({ where: { communityId } });
      // 议事相关清理（必须在 event/topic 删之前清子表）
      await prisma.topicCommentLike.deleteMany({ where: { comment: { topic: { communityId } } } });
      await prisma.topicComment.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicLike.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicRating.deleteMany({ where: { topic: { communityId } } });
      await prisma.topicMergeSuggestion.deleteMany({ where: { communityId } });
      await prisma.event.deleteMany({ where: { communityId } });
      await prisma.topic.deleteMany({ where: { communityId } });
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

    // P-301: pendingReviews 应按 communityId 过滤，committee_admin 不应看到其他小区的待审核数
    it('GET /admin/dashboard - pendingReviews 不包含其他小区的数据', async () => {
      // 在另一个小区创建待审核事件 + AI审核日志
      const communityB = await prisma.community.create({
        data: { name: '隔离测试小区B', city: '南京', district: '鼓楼区', address: '隔离路2号' },
      });
      const eventB = await prisma.event.create({
        data: {
          communityId: communityB.id,
          creatorId: adminUserId,
          title: '其他小区待审核事件',
          description: '测试描述',
          type: 'help_request',
          aiReviewStatus: 'manual_review',
          status: 'pending_review',
        },
      });
      // 创建 AI 审核日志（result=manual_review，当前代码会跨小区统计）
      await prisma.aiReviewLog.create({
        data: {
          targetType: 'event',
          targetId: eventB.id,
          inputSummary: { title: '其他小区待审核事件' },
          result: 'manual_review',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // pendingReviews 不应包含 communityB 的审核日志
      expect(res.body.data.pendingReviews).toBe(0);

      // 清理
      await prisma.aiReviewLog.deleteMany({ where: { targetId: eventB.id } });
      await prisma.event.deleteMany({ where: { communityId: communityB.id } });
      await prisma.community.delete({ where: { id: communityB.id } });
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

  // ===== 闲置管理 =====
  describe('【管理】闲置管理动作', () => {
    let marketItemId: string;

    it('准备一条闲置数据', async () => {
      const item = await prisma.marketItem.create({
        data: {
          communityId,
          sellerId: userId,
          category: 'other',
          title: '管理测试闲置',
          description: '用于管理动作测试',
          tradeType: 'sell',
          conditionLevel: 'good',
          status: 'on_sale',
        },
      });
      marketItemId = item.id;
      expect(marketItemId).toBeDefined();
    });

    it('POST /admin/market/:id/hide - 应将状态置为 hidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/market/${marketItemId}/hide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('hidden');
    });

    it('POST /admin/market/:id/restore - 应恢复为 on_sale', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/market/${marketItemId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('on_sale');
    });

    it('POST /admin/market/:id/reject - 应拒绝并置为 rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/market/${marketItemId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '违规内容' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('rejected');
    });

    it('POST /admin/market/:id/hide - 普通用户应403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/market/${marketItemId}/hide`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
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

  // ===== 议事管理 =====
  describe('【管理】议事管理', () => {
    let topicId: string;
    let topicIdB: string;
    let eventId: string;

    it('准备数据：创建两个议题 + 一个事件', async () => {
      const t1 = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '电梯老化问题', description: '电梯频繁故障' });
      expect(t1.status).toBe(201);
      topicId = t1.body.data.id;

      const t2 = await request(app.getHttpServer())
        .post('/api/v1/topics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '电梯维保升级', description: '建议更换维保单位' });
      expect(t2.status).toBe(201);
      topicIdB = t2.body.data.id;

      const ev = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'public_feedback',
          title: '电梯卡在 5 楼',
          description: '今早 8 点',
          topicId,
        });
      expect(ev.status).toBe(201);
      eventId = ev.body.data.id;
    });

    it('GET /admin/topics?status=open 应包含议题', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/topics?status=open')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.some((t: any) => t.id === topicId)).toBe(true);
    });

    it('GET /admin/topics/:id 返回议题详情', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/topics/${topicId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(topicId);
    });

    it('POST /admin/topics/:id/events/:eventId/move 应移动事件', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/${topicId}/events/${eventId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetTopicId: topicIdB });
      expect(res.status).toBe(201);
      // 把事件移回 topicId 以便后续合并测试
      await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/${topicIdB}/events/${eventId}/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetTopicId: topicId });
    });

    it('POST /admin/topics/:id/close 应完结议题并发通知', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/${topicId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ summary: '物业已联系维修单位，本月内完成' });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('closed');
      expect(res.body.data.closedSummary).toContain('物业');
    });

    it('POST /admin/topics/:id/reopen 应重新打开议题', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/${topicId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('open');
    });

    it('POST /admin/topics/merge 应将源议题合并到目标', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/topics/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourceTopicId: topicId, targetTopicId: topicIdB });
      expect(res.status).toBe(201);

      // 验证源议题已删除
      const sourceCheck = await request(app.getHttpServer())
        .get(`/api/v1/admin/topics/${topicId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(sourceCheck.status).toBe(404);

      // 事件已挂到目标议题
      const targetCheck = await request(app.getHttpServer())
        .get(`/api/v1/admin/topics/${topicIdB}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(targetCheck.body.data.events.some((e: any) => e.id === eventId)).toBe(true);
    });
  });

  // ===== AI 功能开关 =====
  describe('【管理】AI 功能开关', () => {
    afterAll(async () => {
      // 清理：恢复所有开关到默认值
      await prisma.systemSetting.deleteMany({
        where: {
          key: {
            in: ['ai_topic_suggest', 'ai_topic_merge', 'ai_event_comment', 'ai_content_review'],
          },
        },
      });
    });

    it('GET /admin/settings/ai 默认全部为 true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/settings/ai')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.aiTopicSuggest).toBe(true);
      expect(res.body.data.aiEventComment).toBe(true);
    });

    it('PATCH /admin/settings/ai 关闭 aiEventComment', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/settings/ai')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ aiEventComment: false });
      expect(res.status).toBe(200);
      expect(res.body.data.aiEventComment).toBe(false);
      expect(res.body.data.aiTopicSuggest).toBe(true);
    });

    it('关闭 aiEventComment 后创建议事类事件应 aiComment=null', async () => {
      // 先创建一个议题
      const topic = await prisma.topic.create({
        data: { communityId, title: '关 AI 测试议题', createdBy: userId, status: 'open' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'public_feedback',
          title: '花坛维护',
          description: '物业请处理',
          topicId: topic.id,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.aiComment).toBeNull();
    });
  });

  // ===== 议题合并建议 =====
  describe('【管理】议题合并建议', () => {
    let suggA: string;
    let suggB: string;

    beforeAll(async () => {
      // 创建两个高度相似的议题（共享同一组高频字符），让 Jaccard 命中 0.8~0.95
      const t1 = await prisma.topic.create({
        data: {
          communityId,
          title: '小区门口违章停车治理',
          description: '希望物业加强对门口违章停车的管理',
          createdBy: userId,
          status: 'open',
        },
      });
      const t2 = await prisma.topic.create({
        data: {
          communityId,
          title: '小区门口违章停车整顿',
          description: '希望物业加强对门口违章停车的管理力度',
          createdBy: userId,
          status: 'open',
        },
      });
      suggA = t1.id;
      suggB = t2.id;
    });

    it('POST /admin/topics/merge-suggestions/scan 应扫描并创建建议', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/topics/merge-suggestions/scan')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.data.created)).toBe(true);
    });

    it('GET /admin/topics/merge-suggestions 应列出 pending 建议', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/topics/merge-suggestions?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('POST /admin/topics/merge-suggestions/:id/reject 应标记为 rejected', async () => {
      // 手动创建一条建议确保可控
      const s = await prisma.topicMergeSuggestion.create({
        data: { communityId, sourceTopicId: suggA, targetTopicId: suggB, similarity: 0.85 },
      });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/merge-suggestions/${s.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('rejected');
    });

    it('POST /admin/topics/merge-suggestions/:id/approve 应合并并标记为 approved', async () => {
      const s = await prisma.topicMergeSuggestion.create({
        data: { communityId, sourceTopicId: suggA, targetTopicId: suggB, similarity: 0.9 },
      });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/topics/merge-suggestions/${s.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('approved');
      // 源议题应被删除
      const src = await prisma.topic.findUnique({ where: { id: suggA } });
      expect(src).toBeNull();
    });
  });
});
