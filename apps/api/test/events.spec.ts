/**
 * Feature: 事件系统
 * BDD Tests for Events module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 事件系统', () => {
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
      data: { name: '事件测试小区', city: '南京', district: '鼓楼区', address: '事件路1号' },
    });
    communityId = community.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'events-test-user' });
    token = res.body.data.token;
    userId = res.body.data.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ communityId });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.eventFavorite.deleteMany({ where: { userId } });
    await prisma.eventLike.deleteMany({ where: { userId } });
    await prisma.eventThank.deleteMany({ where: { fromUserId: userId } });
    await prisma.eventComment.deleteMany({ where: { userId } });
    await prisma.eventApplication.deleteMany({ where: { userId } });
    await prisma.eventCompletionConfirmation.deleteMany({ where: { userId } });
    await prisma.report.deleteMany({ where: { reporterId: userId } });
    await prisma.event.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('Scenario: 发布事件', () => {
    it('should create an event and return it', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'help_request',
          title: '求助：搬运家具',
          description: '需要帮忙搬几张桌子',
          locationText: '3栋楼下',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.type).toBe('help_request');
      expect(res.body.data.title).toBe('求助：搬运家具');
    });
  });

  describe('Scenario: 获取事件列表', () => {
    it('should return events filtered by communityId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0]).toHaveProperty('type');
      expect(res.body.data.items[0]).toHaveProperty('title');
    });
  });

  describe('Scenario: 响应事件', () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`);
      eventId = res.body.data.items[0]?.id;
    });

    it('should create an application to respond to event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .send({ actionType: 'help', message: '我可以帮忙！' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.actionType).toBe('help');
    });
  });

  describe('Scenario: 点赞和收藏', () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${token}`);
      eventId = res.body.data.items[0]?.id;
    });

    it('should toggle like on event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('should toggle favorite on event', async () => {
      if (!eventId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.code).toBe(0);
    });
  });
});
