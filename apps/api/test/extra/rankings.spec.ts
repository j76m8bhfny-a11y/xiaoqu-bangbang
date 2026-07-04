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

// P-277+P-278+P-279: 勋章规则缺失
describe('P-277+P-278+P-279: 勋章规则', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rankingsService: RankingsService;
  let userId: string;
  let communityId: string;
  const badgeIds: string[] = [];
  const crIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    rankingsService = app.get(RankingsService);

    const community = await prisma.community.create({
      data: { name: '勋章测试小区', city: '南京', district: '鼓楼区', address: '勋章路1号' },
    });
    communityId = community.id;

    const user = await prisma.user.create({
      data: { openid: 'badge-test-user', nickname: '勋章测试用户', avatarUrl: '' },
    });
    userId = user.id;

    await prisma.communityMember.create({
      data: { userId, communityId, verifyStatus: 'verified' },
    });

    // 创建 Standard 定义的勋章（seed 文件缺少这些 codes）
    const badges = [
      { code: 'helper_1', name: '初来乍到', description: '完成第一次互助' },
      { code: 'helper_5', name: '热心邻居', description: '完成5次互助' },
      { code: 'helper_20', name: '互助达人', description: '完成20次互助' },
      { code: 'flower_10', name: '花开满园', description: '累计获得10朵小红花' },
      { code: 'flower_50', name: '花团锦簇', description: '累计获得50朵小红花' },
      { code: 'feedback_5', name: '议事参与者', description: '参与5次议事' },
      { code: 'feedback_20', name: '议事达人', description: '参与20次议事' },
      { code: 'topic_1', name: '议题提出者', description: '提出1个议题' },
      { code: 'topic_5', name: '议题达人', description: '提出5个议题' },
    ];

    for (const b of badges) {
      const badge = await prisma.badge.create({
        data: {
          code: b.code,
          name: b.name,
          description: b.description,
          ruleJson: {},
          status: 'active',
        },
      });
      badgeIds.push(badge.id);
    }
  });

  afterAll(async () => {
    await prisma.userBadge.deleteMany({ where: { userId } });
    await prisma.userBadge.deleteMany({ where: { badgeId: { in: badgeIds } } });
    await prisma.contributionRecord.deleteMany({ where: { userId } });
    await prisma.rankingSnapshot.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.communityMember.deleteMany({ where: { userId } });
    await prisma.badge.deleteMany({ where: { id: { in: badgeIds } } });
    await prisma.user
      .update({ where: { id: userId }, data: { currentCommunityId: null } })
      .catch(() => {});
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('feedback_5 勋章应在 5 次 feedback 贡献后颁发 (P-277)', async () => {
    // 创建 5 条 feedback 贡献记录
    for (let i = 0; i < 5; i++) {
      const cr = await prisma.contributionRecord.create({
        data: {
          userId,
          communityId,
          sourceType: 'event',
          sourceId: crypto.randomUUID(),
          action: 'feedback',
          score: 1,
          flowerCount: 1,
          reason: '议事反馈',
          occurredAt: new Date(),
        },
      });
      crIds.push(cr.id);
    }

    // 触发勋章检查
    await (rankingsService as any).checkAndAwardBadges(
      userId,
      communityId,
      'event',
      crypto.randomUUID(),
    );

    const userBadges = await prisma.userBadge.findMany({
      where: { userId, communityId },
      include: { badge: { select: { code: true } } },
    });

    const feedbackBadge = userBadges.find((ub) => ub.badge.code === 'feedback_5');
    expect(feedbackBadge).toBeTruthy();
  });

  it('topic_1 勋章应在 1 次 topic 贡献后颁发 (P-278)', async () => {
    // 创建 1 条 topic 贡献记录
    const cr = await prisma.contributionRecord.create({
      data: {
        userId,
        communityId,
        sourceType: 'topic',
        sourceId: crypto.randomUUID(),
        action: 'topic',
        score: 1,
        flowerCount: 1,
        reason: '议题审核通过',
        occurredAt: new Date(),
      },
    });
    crIds.push(cr.id);

    // 触发勋章检查
    await (rankingsService as any).checkAndAwardBadges(
      userId,
      communityId,
      'topic',
      crypto.randomUUID(),
    );

    const userBadges = await prisma.userBadge.findMany({
      where: { userId, communityId },
      include: { badge: { select: { code: true } } },
    });

    const topicBadge = userBadges.find((ub) => ub.badge.code === 'topic_1');
    expect(topicBadge).toBeTruthy();
  });

  it('helper_1 勋章应在 1 次 help 贡献后颁发 (回归)', async () => {
    // 创建 1 条 help_free 贡献记录
    const cr = await prisma.contributionRecord.create({
      data: {
        userId,
        communityId,
        sourceType: 'event',
        sourceId: crypto.randomUUID(),
        action: 'help_free',
        score: 3,
        flowerCount: 3,
        reason: '互助',
        occurredAt: new Date(),
      },
    });
    crIds.push(cr.id);

    // 触发勋章检查
    await (rankingsService as any).checkAndAwardBadges(
      userId,
      communityId,
      'event',
      crypto.randomUUID(),
    );

    const userBadges = await prisma.userBadge.findMany({
      where: { userId, communityId },
      include: { badge: { select: { code: true } } },
    });

    const helperBadge = userBadges.find((ub) => ub.badge.code === 'helper_1');
    expect(helperBadge).toBeTruthy();
  });
});
