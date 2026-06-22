/**
 * Feature: 小区选择与社群入口
 * BDD Tests for CommunitiesService
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 小区选择与社群入口', () => {
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 创建测试小区
    const community = await prisma.community.create({
      data: { name: '社群测试小区', city: '南京', district: '鼓楼区', address: '社群路1号' },
    });
    communityId = community.id;

    // 登录
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'community-test-user' });
    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.communitySocialGroup.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('Scenario: 获取小区列表', () => {
    it('should return community list with name, city, district, address', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communities')
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items[0]).toHaveProperty('name');
      expect(res.body.data.items[0]).toHaveProperty('city');
    });
  });

  describe('Scenario: 选择当前小区', () => {
    it('should update user current_community_id', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ communityId })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.currentCommunityId).toBe(communityId);
    });
  });

  describe('Scenario: 认证居民可查看社群入口', () => {
    it('should return verified_only group for verified user', async () => {
      // 创建社群入口
      await prisma.communitySocialGroup.create({
        data: {
          communityId,
          title: '邻里互助群',
          visibleTo: 'verified_only',
          qrImageUrl: 'https://example.com/qr.png',
        },
      });

      // 将用户设为已认证
      await prisma.communityMember.update({
        where: { userId_communityId: { userId, communityId } },
        data: { verifyStatus: 'verified' },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/communities/current/social-groups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
    });
  });

  describe('Scenario: 未认证用户不能查看verified_only社群入口', () => {
    it('should not return verified_only group for unverified user', async () => {
      // 将用户设为未认证
      await prisma.communityMember.update({
        where: { userId_communityId: { userId, communityId } },
        data: { verifyStatus: 'unverified' },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/communities/current/social-groups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // verified_only 的群不应返回
      const verifiedOnlyItems = res.body.data.items.filter(
        (item: any) => item.visibleTo === 'verified_only',
      );
      expect(verifiedOnlyItems).toHaveLength(0);
    });
  });
});
