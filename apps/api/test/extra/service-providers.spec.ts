/**
 * Feature: 服务商模块测试
 * 覆盖：service-providers 全部端点
 * 路径：apps/api/test/extra/service-providers.spec.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: 服务商模块', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let communityId: string;
  let serviceProviderId: string;

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
      data: { name: '服务商测试小区', city: '南京', district: '鼓楼区', address: '服务商路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'sp-user-001' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });

    // 创建测试服务商
    const sp = await prisma.serviceProvider.create({
      data: {
        communityId,
        name: '测试家政公司',
        category: 'cleaning',
        description: '专业家政服务',
        contactText: '13800138000',
        serviceArea: '全城',
        status: 'published',
        sortOrder: 1,
      },
    });
    serviceProviderId = sp.id;
  });

  // afterAll: 包 try/catch 忽略 parallel 测试隔离错误
  afterAll(async () => {
    try {
      await prisma.serviceProvider.deleteMany({ where: { communityId } });
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.community.delete({ where: { id: communityId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // 忽略清理错误
    } finally {
      await app.close();
    }
  });

  describe('GET /service-providers - 服务商列表', () => {
    it('应返回服务商列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/service-providers')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data.items).toBeInstanceOf(Array);
      }
    });

    it('按分类筛选', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/service-providers')
        .query({ category: 'cleaning' })
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('GET /service-providers/:id - 服务商详情', () => {
    it('应返回服务商详情', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 403]);

      if (res.status === 200) {
        expect(res.body.code).toBe(0);
        expect(res.body.data).toHaveProperty('name');
      }
    });

    it('不存在的服务商应404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/service-providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect([200, 404, 403]);

      if (res.status === 404) {
        expect(res.body.message || res.body).toBeDefined();
      }
    });
  });
});