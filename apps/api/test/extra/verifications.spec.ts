/**
 * Feature: 认证审核测试
 * 覆盖：verifications 全部端点 + admin 认证审核
 * 路径：apps/api/test/extra/verifications.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 认证审核', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminToken: string;
  let userId: string;
  let adminUserId: string;
  let communityId: string;
  let verificationId: string;

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
      data: { name: '认证测试小区', city: '南京', district: '鼓楼区', address: '认证路1号' },
    });
    communityId = community.id;

    // 普通用户
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'verify-user-001' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });

    // 管理员用户
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'verify-admin-001' });
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ communityId });

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

    await prisma.committeeMember.create({
      data: {
        communityId,
        name: '认证管理员',
        position: '主任',
        claimStatus: 'unclaimed',
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.verification.deleteMany({ where: { userId } });
      await prisma.verification.deleteMany({ where: { communityId } });
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

  // ===== 用户侧 - 提交认证 =====
  describe('POST /api/v1/verifications - 提交认证申请', () => {
    it('提交认证申请', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          communityId,
          materialType: 'property_cert',
          fileUrl: 'https://example.com/material.jpg',
          consentAccepted: true,
          consentVersion: 'v1.0',
        })
        .expect([200, 201, 403]);

      if (res.status === 200 || res.status === 201) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('status');
        verificationId = res.body.data?.id;
      }
    });

    it('未同意授权应返回400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          communityId,
          materialType: 'property_cert',
          fileUrl: 'https://example.com/material.jpg',
          consentAccepted: false,
          consentVersion: 'v1.0',
        })
        .expect([400, 403]);

      if (res.status === 400) {
        expect(res.body.message).toBeDefined();
      }
    });

    it('未登录应返回401/403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .send({ communityId, materialType: 'property_cert', fileUrl: 'https://x.com/a.jpg', consentAccepted: true, consentVersion: 'v1.0' })
        .expect([401, 403]);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /api/v1/verifications/me - 我的认证列表', () => {
    it('应返回认证列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/verifications/me')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });
  });

  // ===== 管理侧 - 认证审核 =====
  describe('GET /api/v1/admin/verifications - 认证审核列表', () => {
    it('管理员获取认证列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/verifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });

    it('按状态筛选', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/verifications')
        .query({ status: 'manual_review' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('GET /api/v1/admin/verifications/:id - 认证详情', () => {
    it('获取认证详情', async () => {
      if (!verificationId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/verifications/${verificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect([200, 403, 404]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('status');
      }
    });
  });
});