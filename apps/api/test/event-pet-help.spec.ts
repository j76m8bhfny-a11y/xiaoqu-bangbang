import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature: 宠物帮帮 (M22)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let verifiedToken: string;
  let verifiedUserId: string;
  let unverifiedToken: string;
  let unverifiedUserId: string;
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

    const community = await prisma.community.create({
      data: { name: '宠物帮测试小区', city: '南京', district: '鼓楼区', address: '宠物路1号' },
    });
    communityId = community.id;

    // 创建已认证用户
    const verifiedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'pet-help-verified-user' });
    verifiedToken = verifiedRes.body.data.token;
    verifiedUserId = verifiedRes.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${verifiedToken}`)
      .send({ communityId });
    // verifyStatus 在 CommunityMember 表上，不在 User 表
    await prisma.communityMember.update({
      where: { userId_communityId: { userId: verifiedUserId, communityId } },
      data: { verifyStatus: 'verified' },
    });

    // 创建未认证用户（默认 verifyStatus=unverified，无需 update）
    const unverifiedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'pet-help-unverified-user' });
    unverifiedToken = unverifiedRes.body.data.token;
    unverifiedUserId = unverifiedRes.body.data.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${unverifiedToken}`)
      .send({ communityId });
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { communityId } });
    await prisma.communityMember.deleteMany({ where: { communityId } });
    await prisma.community.delete({ where: { id: communityId } });
    await prisma.user.deleteMany({
      where: { id: { in: [verifiedUserId, unverifiedUserId] } },
    });
    await app.close();
  });

  describe('创建 pet_help 事件', () => {
    it('已认证用户创建 feed 成功', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'feed',
          title: '代喂猫咪',
          description: '出差 3 天，求邻居帮忙喂猫',
          petMeta: {
            petType: 'cat',
            petName: '小白',
            feedsPerDay: 2,
            totalDays: 3,
            dateRange: { start: '2026-08-01', end: '2026-08-03' },
            needClean: true,
            rewardType: 'free',
            note: '猫粮在玄关柜',
          },
        });
      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('pet_help');
      expect(res.body.data.subType).toBe('feed');
      expect(res.body.data.petMeta.petType).toBe('cat');
    });

    it('已认证用户创建 walk 成功', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'walk',
          title: '代遛金毛',
          description: '出差 3 天，求邻居帮忙遛狗',
          petMeta: {
            dogSize: 'large',
            dogName: '大毛',
            timesPerDay: 2,
            durationPerTime: 30,
            timeSlots: ['morning', 'evening'],
            needGear: true,
            rewardType: 'negotiable',
            note: '牵引绳在门口',
          },
        });
      expect(res.status).toBe(201);
      expect(res.body.data.subType).toBe('walk');
    });

    it('未认证用户创建 lost 成功（不需要认证）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'lost',
          title: '寻猫启事',
          description: '我家橘猫走丢了',
          petMeta: {
            petType: 'cat',
            breed: '橘猫',
            name: '橘橘',
            lostLocation: '小区南门',
            lostTime: '2026-07-20T10:00:00Z',
            appearance: '橘色短毛，体型偏胖',
            photos: [],
            rewardType: 'negotiable',
            note: '有线索请联系',
          },
        });
      expect(res.status).toBe(201);
      expect(res.body.data.subType).toBe('lost');
    });

    it('未认证用户创建 feed 返回 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'feed',
          title: '代喂猫咪',
          description: '出差求帮忙',
          petMeta: {
            petType: 'cat',
            feedsPerDay: 2,
            totalDays: 3,
            dateRange: { start: '2026-08-01', end: '2026-08-03' },
            needClean: true,
            rewardType: 'free',
          },
        });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40301);
    });

    it('未认证用户创建 walk 返回 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'walk',
          title: '代遛狗',
          description: '求帮忙',
          petMeta: {
            dogSize: 'small',
            timesPerDay: 1,
            durationPerTime: 20,
            timeSlots: ['morning'],
            needGear: false,
            rewardType: 'free',
          },
        });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40301);
    });

    it('type=pet_help 但缺 subType 返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          type: 'pet_help',
          title: '无 subType',
          description: '测试',
        });
      expect(res.status).toBe(400);
    });

    it('feed petMeta 含 photos 字段返回 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          type: 'pet_help',
          subType: 'feed',
          title: '代喂',
          description: '测试',
          petMeta: {
            petType: 'cat',
            feedsPerDay: 2,
            totalDays: 3,
            dateRange: { start: '2026-08-01', end: '2026-08-03' },
            needClean: false,
            rewardType: 'free',
            photos: ['http://example.com/cat.jpg'],
          },
        });
      expect(res.status).toBe(400);
    });
  });

  describe('列表查询', () => {
    it('filter=pet_help 只返回 pet_help 类型', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events?type=pet_help')
        .set('Authorization', `Bearer ${verifiedToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.every((e: any) => e.type === 'pet_help')).toBe(true);
    });

    it('多类型 filter 返回 3 种类型', async () => {
      // 先创建一个 help_request 事件
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          type: 'help_request',
          title: '借工具',
          description: '求借电钻',
          rewardType: 'free',
        });

      const res = await request(app.getHttpServer())
        .get('/api/v1/events?type=help_request,public_welfare,pet_help')
        .set('Authorization', `Bearer ${verifiedToken}`);
      expect(res.status).toBe(200);
      const types = new Set(res.body.data.items.map((e: any) => e.type));
      expect(types.has('help_request')).toBe(true);
      expect(types.has('pet_help')).toBe(true);
    });
  });

  describe('老数据迁移验证', () => {
    it('type=lost_found 的事件计数为 0', async () => {
      const count = await prisma.event.count({ where: { type: 'lost_found' } });
      expect(count).toBe(0);
    });
  });
});
