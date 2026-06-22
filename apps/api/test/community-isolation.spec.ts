/**
 * Feature: 小区数据隔离
 * BDD Tests for CurrentCommunityGuard
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 小区数据隔离', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;
  let communityAId: string;
  let communityBId: string;
  let userAId: string;
  let userBId: string;

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
    const communityA = await prisma.community.create({
      data: { name: '测试小区A', city: '南京', district: '鼓楼区', address: '测试路1号' },
    });
    const communityB = await prisma.community.create({
      data: { name: '测试小区B', city: '南京', district: '玄武区', address: '测试路2号' },
    });
    communityAId = communityA.id;
    communityBId = communityB.id;

    // 创建用户并登录
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'isolation-user-A' });
    tokenA = resA.body.data.token;
    userAId = resA.body.data.user.id;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'isolation-user-B' });
    tokenB = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // 用户A选择小区A，用户B选择小区B
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ communityId: communityAId });

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ communityId: communityBId });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.communityMember.deleteMany({
      where: { communityId: { in: [communityAId, communityBId] } },
    });
    await prisma.community.deleteMany({
      where: { id: { in: [communityAId, communityBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    await app.close();
  });

  describe('Scenario: 用户未选择小区时请求业务接口', () => {
    it('should return 40301 when user has no current community', async () => {
      // 创建一个没有选择小区的用户
      const resLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'no-community-user' });
      const noCommunityToken = resLogin.body.data.token;

      // 确保用户没有当前小区
      await prisma.user.update({
        where: { id: resLogin.body.data.user.id },
        data: { currentCommunityId: null },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/communities/current/social-groups')
        .set('Authorization', `Bearer ${noCommunityToken}`)
        .expect(403);

      expect(res.body.code).toBe(40301);
    });
  });

  describe('Scenario: 切换小区后数据上下文刷新', () => {
    it('should update context after switching community', async () => {
      // 用户A切换到小区B
      await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ communityId: communityBId })
        .expect(201);

      // 验证 /me 返回当前小区是小区B
      const resMe = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(resMe.body.data.currentCommunityId).toBe(communityBId);

      // 切回小区A
      await request(app.getHttpServer())
        .post('/api/v1/communities/select')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ communityId: communityAId });
    });
  });
});
