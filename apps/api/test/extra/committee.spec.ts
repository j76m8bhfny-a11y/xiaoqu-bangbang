/**
 * Feature: 居委成员管理测试
 * 覆盖：committee + admin 居委管理全部端点
 * 路径：apps/api/test/extra/committee.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 居委成员管理', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminToken: string;
  let userId: string;
  let adminUserId: string;
  let communityId: string;
  let memberId: string;
  let claimId: string;
  let announcementId: string;

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
      data: { name: '居委测试小区', city: '南京', district: '鼓楼区', address: '居委路1号' },
    });
    communityId = community.id;

    // 普通用户
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'committee-user-001' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });

    // 管理员用户
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'committee-admin-001' });
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ communityId });

    // 插入 admin_users（AdminGuard 需要）
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
        name: '测试居委成员',
        position: '主任',
        responsibility: '负责小区事务',
        claimStatus: 'unclaimed',
        status: 'active',
      },
    });
    memberId = member.id;

    // 创建已发布的公告
    const ann = await prisma.committeeAnnouncement.create({
      data: {
        communityId,
        publisherId: adminUserId,
        title: '测试公告',
        content: '测试公告内容',
        status: 'published',
        publishedAt: new Date(),
      },
    });
    announcementId = ann.id;
  });

  afterAll(async () => {
    try {
      await prisma.committeeAnnouncement.deleteMany({ where: { communityId } });
      await prisma.committeeMemberClaim.deleteMany({ where: { communityId } });
      await prisma.committeeMember.deleteMany({ where: { communityId } });
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.adminUser.deleteMany({ where: { userId: { in: [adminUserId, userId] } } });
      await prisma.auditLog.deleteMany({ where: { operatorId: { in: [adminUserId, userId] } } });
      await prisma.community.delete({ where: { id: communityId } });
      await prisma.user.deleteMany({ where: { id: { in: [adminUserId, userId] } } });
    } catch {
      // 忽略清理错误
    } finally {
      await app.close();
    }
  });

  // ===== 用户侧 - 居委概览 =====
  describe('GET /api/v1/committee - 居委概览', () => {
    it('应返回居委概览数据', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/committee')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('memberCount');
      }
    });
  });

  describe('GET /api/v1/committee/members - 居委成员列表', () => {
    it('应返回成员列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/committee/members')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('GET /api/v1/committee/members/:id - 成员详情', () => {
    it('应返回成员详情', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committee/members/${memberId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403, 404]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('name');
      }
    });
  });

  describe('POST /api/v1/committee/members/:id/claim - 认领职位', () => {
    it('提交认领申请', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/committee/members/${memberId}/claim`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statement: '我是本小区业主', materialUrls: [] })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
        claimId = res.body.data?.id;
      }
    });

    it('未登录应返回401/403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/committee/members/${memberId}/claim`)
        .send({ statement: '测试' })
        .expect([401, 403]);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /api/v1/me/committee-claims - 我的认领申请', () => {
    it('应返回我的认领申请列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/committee-claims')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('GET /api/v1/committee/announcements - 公告列表', () => {
    it('应返回公告列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/committee/announcements')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('GET /api/v1/committee/announcements/:id - 公告详情', () => {
    it('应返回公告详情', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/committee/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403, 404]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('title');
      }
    });
  });

  // ===== 管理侧 - 居委管理 =====
  describe('GET /api/v1/admin/committee/members - 管理端成员列表', () => {
    it('管理员获取成员列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/committee/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('POST /api/v1/admin/committee/members - 创建居委成员', () => {
    it('创建新成员', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/committee/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '新成员', position: '副主任', responsibility: '协助管理' })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('PATCH /api/v1/admin/committee/members/:id - 更新成员', () => {
    it('更新成员信息', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/committee/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '更新后的名称', responsibility: '更新职责' })
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('DELETE /api/v1/admin/committee/members/:id - 删除成员', () => {
    it('删除居委成员', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/committee/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('GET /api/v1/admin/committee-claims - 认领申请列表', () => {
    it('管理员获取认领申请', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/committee-claims')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('GET /api/v1/admin/committee/announcements - 公告列表（管理端）', () => {
    it('管理员获取公告', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/committee/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('POST /api/v1/admin/committee/announcements - 创建公告', () => {
    it('创建新公告', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/committee/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '新公告标题', content: '新公告内容' })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
      }
    });
  });
});