/**
 * Feature: 通知系统
 * BDD Tests for Notifications module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 通知系统', () => {
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

    const community = await prisma.community.create({
      data: { name: '通知测试小区', city: '南京', district: '鼓楼区', address: '通知路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'notifications-test-user' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });

    // 创建测试通知
    await prisma.notification.createMany({
      data: [
        { userId, communityId, type: 'system', title: '欢迎加入', content: '欢迎加入小区帮帮！', isRead: false },
        { userId, communityId, type: 'badge', title: '获得奖章', content: '恭喜获得热心邻居奖章', isRead: false },
        { userId, communityId, type: 'event_response', title: '有人帮忙', content: '张三响应了你的求助', isRead: true },
      ],
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('Scenario: 获取通知列表', () => {
    it('should return notification list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBe(3);
    });

    it('should filter unread notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items.length).toBe(2);
    });
  });

  describe('Scenario: 标记通知已读', () => {
    it('should mark a single notification as read', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${token}`);
      const unreadId = listRes.body.data.items[0]?.id;
      if (!unreadId) return;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/notifications/${unreadId}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);

      // Verify all read
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.body.data.items.length).toBe(0);
    });
  });
});
