/**
 * Feature: 认证与用户
 * BDD Tests for Auth module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature: 认证与用户', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario: 微信登录成功返回token', () => {
    it('should return JWT token and user info on login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'test-wx-code-001' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.openid).toBeDefined();

      token = res.body.data.token;
      userId = res.body.data.user.id;
    });
  });

  describe('Scenario: 未登录访问受保护接口', () => {
    it('should return 40101 when accessing protected route without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .expect(401);

      expect(res.body.code).toBe(40101);
    });
  });

  describe('Scenario: 获取当前用户信息', () => {
    it('should return user info with currentCommunityId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data).toHaveProperty('currentCommunityId');
      expect(res.body.data).toHaveProperty('verifyStatus');
      expect(res.body.data).toHaveProperty('roles');
    });
  });

  describe('Scenario: 更新用户信息', () => {
    it('should update nickname successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '测试邻居' })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.nickname).toBe('测试邻居');
    });
  });
});
