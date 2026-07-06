/**
 * Feature: 小区认证
 * BDD Tests for VerificationsService
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 小区认证', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
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

    // 创建匹配 mock OCR 结果的小区（名称包含"阳光花园"）
    const community = await prisma.community.create({
      data: { name: '阳光花园小区', city: '南京', district: '鼓楼区', address: '阳光路88号' },
    });
    communityId = community.id;

    // 登录
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'verification-test-user' });
    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.verification.deleteMany({ where: { userId } });
    // 认证通过会触发首批业主徽章授予，先删 user_badges 否则 community 外键无法清理。
    await prisma.userBadge.deleteMany({ where: { userId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('Scenario: 提交认证申请', () => {
    it('should create verification record and call OCR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          communityId,
          materialType: 'property_cert',
          fileUrl: 'https://example.com/cert.jpg',
          buildingNo: '1',
          unitNo: '2',
          roomNo: '303',
          consentAccepted: true,
          consentVersion: '2026-05-privacy-v1',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('ocrSummary');
      expect(res.body.data.ocrSummary).toHaveProperty('communityName');
      expect(res.body.data.ocrSummary).toHaveProperty('confidence');
    });
  });

  describe('Scenario: 认证通过（OCR与小区名匹配）', () => {
    it('should set status to approved when OCR matches community', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          communityId,
          materialType: 'property_cert',
          fileUrl: 'https://example.com/cert2.jpg',
          buildingNo: '1',
          unitNo: '2',
          roomNo: '303',
          consentAccepted: true,
          consentVersion: '2026-05-privacy-v1',
        })
        .expect(201);

      // Mock OCR 返回"阳光花园小区" + buildingNo=1/unitNo=2/roomNo=303，与用户输入一致 → 自动通过
      expect(res.body.data.status).toBe('approved');
    });
  });

  describe('Scenario: 查询我的认证状态', () => {
    it('should return verification status without original file URL', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/verifications/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      // 不应返回原图 URL
      const item = res.body.data.items[0];
      expect(item).not.toHaveProperty('originalFileUrl');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('materialType');
    });
  });

  describe('Scenario: P-216 originalFileDeletedAt 仅 approved 时标记', () => {
    it('approved 认证应标记 originalFileDeletedAt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/verifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          communityId,
          materialType: 'property_cert',
          fileUrl: 'https://example.com/p216-approved.jpg',
          buildingNo: '1',
          unitNo: '2',
          roomNo: '303',
          consentAccepted: true,
          consentVersion: '2026-05-privacy-v1',
        })
        .expect(201);

      const verification = await prisma.verification.findUnique({
        where: { id: res.body.data.id },
      });
      // R5 红线: 仅 approved 时标记原图删除
      expect(verification.status).toBe('approved');
      expect(verification.originalFileDeletedAt).not.toBeNull();
    });

    it('pending_review 认证不应标记 originalFileDeletedAt', async () => {
      // 创建名字不匹配 OCR 结果的小区 + 楼栋房号也不匹配 → pending_review
      const mismatchCommunity = await prisma.community.create({
        data: { name: 'P216测试小区', city: '南京', district: '鼓楼区', address: 'P216路1号' },
      });

      try {
        const res = await request(app.getHttpServer())
          .post('/api/v1/verifications')
          .set('Authorization', `Bearer ${token}`)
          .send({
            communityId: mismatchCommunity.id,
            materialType: 'property_cert',
            fileUrl: 'https://example.com/p216-manual.jpg',
            buildingNo: '9',
            unitNo: '9',
            roomNo: '999',
            consentAccepted: true,
            consentVersion: '2026-05-privacy-v1',
          })
          .expect(201);

        const verification = await prisma.verification.findUnique({
          where: { id: res.body.data.id },
        });
        // R5 红线: pending_review 不应标记原图删除
        expect(verification.status).toBe('pending_review');
        expect(verification.originalFileDeletedAt).toBeNull();
      } finally {
        await prisma.verification.deleteMany({ where: { communityId: mismatchCommunity.id } });
        await prisma.communityMember.deleteMany({ where: { communityId: mismatchCommunity.id } });
        await prisma.community.delete({ where: { id: mismatchCommunity.id } });
      }
    });
  });
});
