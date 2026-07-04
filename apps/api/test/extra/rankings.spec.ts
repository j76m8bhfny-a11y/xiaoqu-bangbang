/**
 * P-01: 积分映射测试 — public_feedback/discussion 应为 1 朵花
 * P-143: 排行榜列表返回扁平 nickname/avatarUrl（非嵌套 user 对象）
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RankingsService } from '../../src/modules/rankings/rankings.service';

describe('P-01: 积分映射', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rankingsService: RankingsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    rankingsService = app.get(RankingsService);
  });

  afterAll(async () => {
    await app.close();
  });

  const getEventAction = (type: string, rewardType = 'free') =>
    (rankingsService as any).getEventAction(type, rewardType);

  const getFlowerCount = (action: string) => (rankingsService as any).getFlowerCount(action);

  it('public_feedback → feedback → 1 朵花（不是 help_free 3 朵）', () => {
    const action = getEventAction('public_feedback');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('discussion → feedback → 1 朵花（不是 help_free 3 朵）', () => {
    const action = getEventAction('discussion');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('help_request (free) → help_free → 3 朵花（回归）', () => {
    const action = getEventAction('help_request', 'free');
    expect(action).toBe('help_free');
    expect(getFlowerCount(action)).toBe(3);
  });

  it('help_request (paid) → help_paid → 1 朵花（回归）', () => {
    const action = getEventAction('help_request', 'paid');
    expect(action).toBe('help_paid');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('public_welfare → public_welfare → 5 朵花（回归）', () => {
    const action = getEventAction('public_welfare');
    expect(action).toBe('public_welfare');
    expect(getFlowerCount(action)).toBe(5);
  });
});

describe('P-143: 排行榜列表返回扁平结构', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
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

    // 创建测试社区
    const community = await prisma.community.create({
      data: { name: 'P143测试小区', city: '南京', district: '鼓楼区', address: '测试路1号' },
    });
    communityId = community.id;

    // 登录用户
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'p143-test-user' });
    userToken = loginRes.body.data.token;
    userId = loginRes.body.data.user.id;

    // 选择社区（认证）
    await request(app.getHttpServer())
      .post('/api/v1/communities/select')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ communityId });

    // 认证用户
    await prisma.communityMember.update({
      where: { userId_communityId: { userId, communityId } },
      data: { verifyStatus: 'verified' },
    });

    // 更新用户昵称和头像（用于 rankingSnapshot 的 user 关联）
    await prisma.user.update({
      where: { id: userId },
      data: { nickname: '测试用户P143', avatarUrl: 'https://example.com/avatar.png' },
    });

    // 创建排行榜快照
    await prisma.rankingSnapshot.create({
      data: {
        communityId,
        periodType: 'month',
        periodKey: '2026-07',
        userId,
        rankNo: 1,
        score: 100,
        flowerCount: 10,
        helpCount: 5,
        badgeCount: 2,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /rankings 返回 items[].nickname 和 avatarUrl（扁平，非嵌套 user 对象）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rankings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

    const item = res.body.data.items[0];
    // P-143: 应有扁平 nickname/avatarUrl
    expect(item.nickname).toBe('测试用户P143');
    expect(item.avatarUrl).toBe('https://example.com/avatar.png');
    // 不应有嵌套 user 对象
    expect(item.user).toBeUndefined();
  });
});
