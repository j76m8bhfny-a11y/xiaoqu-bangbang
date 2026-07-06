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

  it('public_feedback → feedback → 1 朵花 (P-01)', () => {
    const action = getEventAction('public_feedback');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('discussion → feedback → 1 朵花 (P-01)', () => {
    const action = getEventAction('discussion');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('help_request (free) → help_free → 1 朵花 (P-61 统一为1朵)', () => {
    const action = getEventAction('help_request', 'free');
    expect(action).toBe('help_free');
    expect(getFlowerCount(action)).toBe(1);
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
    // ponytail: 清理测试数据，避免残留数据触发 FK 报错
    await prisma.rankingSnapshot.deleteMany({ where: { communityId } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.communityMember.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user
      .update({ where: { id: userId }, data: { currentCommunityId: null } })
      .catch(() => {});
    await prisma.community.deleteMany({ where: { id: communityId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
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
    // 创建 1 条 help_free 帮手贡献记录（reason='完成事件' 标识帮手）
    const cr = await prisma.contributionRecord.create({
      data: {
        userId,
        communityId,
        sourceType: 'event',
        sourceId: crypto.randomUUID(),
        action: 'help_free',
        score: 1,
        flowerCount: 1,
        reason: '完成事件: help_request',
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

  it('public_welfare 创建者不应获得 helper_1 徽章 (P1 徽章计数膨胀修复)', async () => {
    // 清除之前测试残留的帮手贡献记录（reason='完成事件'）
    await prisma.contributionRecord.deleteMany({
      where: {
        userId,
        communityId,
        reason: { startsWith: '完成事件' },
      },
    });

    // 创建 1 条 public_welfare 创建者贡献记录（reason='发起事件'）
    const cr = await prisma.contributionRecord.create({
      data: {
        userId,
        communityId,
        sourceType: 'event',
        sourceId: crypto.randomUUID(),
        action: 'public_welfare',
        score: 5,
        flowerCount: 5,
        reason: '发起事件: public_welfare',
        occurredAt: new Date(),
      },
    });
    crIds.push(cr.id);

    // 先删除已有 helper_1 徽章（上一个测试可能已颁发）
    await prisma.userBadge.deleteMany({
      where: { userId, communityId, badge: { code: 'helper_1' } },
    });

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

    // 创建者不是帮手，不应获得 helper_1 徽章
    const helperBadge = userBadges.find((ub) => ub.badge.code === 'helper_1');
    expect(helperBadge).toBeUndefined();
  });
});

// P-145+P-146: getMyBadges 返回结构 + BadgeDto icon 字段
describe('P-145+P-146: 徽章返回结构', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let badgeId: string;
  let userBadgeId: string;
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
      data: { name: 'P145测试小区', city: '南京', district: '鼓楼区', address: '测试路1号' },
    });
    communityId = community.id;

    // 创建测试徽章
    const badge = await prisma.badge.create({
      data: {
        code: 'test_badge_p145',
        name: 'P145测试徽章',
        description: '测试徽章返回结构',
        iconUrl: 'https://example.com/badge-icon.png',
        ruleJson: {},
        status: 'active',
      },
    });
    badgeId = badge.id;

    // 登录用户
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat-login')
      .send({ code: 'p145-test-user' });
    userToken = loginRes.body.data.token;
    userId = loginRes.body.data.user.id;

    // 给用户颁发徽章
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        communityId,
        badgeId,
        sourceType: 'event',
        sourceId: crypto.randomUUID(),
      },
    });
    userBadgeId = userBadge.id;
  });

  afterAll(async () => {
    await prisma.userBadge.deleteMany({ where: { userId } });
    await prisma.badge.deleteMany({ where: { id: badgeId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.communityMember.deleteMany({ where: { userId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.user
      .update({ where: { id: userId }, data: { currentCommunityId: null } })
      .catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('GET /me/badges 返回 items 数组（非 badges），且每项为扁平 BadgeDto 结构 (P-145)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/badges')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    // P-145: 应有 items 字段，而非 badges 字段
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.badges).toBeUndefined();

    const item = res.body.data.items.find((b: any) => b.id === badgeId);
    expect(item).toBeTruthy();
    // P-145: 扁平结构 — 应有 name/icon/description，不应有嵌套 badge 对象
    expect(item.name).toBe('P145测试徽章');
    expect(item.description).toBe('测试徽章返回结构');
    expect(item.badge).toBeUndefined();
    expect(item.badgeId).toBeUndefined();
    expect(item.userId).toBeUndefined();
  });

  it('GET /me/badges items[].id 是 badge.id（不是 userBadge.id）(P-145)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/badges')
      .set('Authorization', `Bearer ${userToken}`);

    const item = res.body.data.items.find((b: any) => b.id === badgeId);
    expect(item).toBeTruthy();
    // id 应为 badge.id，不是 userBadge.id
    expect(item.id).toBe(badgeId);
    expect(item.id).not.toBe(userBadgeId);
  });

  it('GET /me/badges items[].icon 使用 icon 字段名（非 iconUrl）(P-146)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/badges')
      .set('Authorization', `Bearer ${userToken}`);

    const item = res.body.data.items.find((b: any) => b.id === badgeId);
    expect(item).toBeTruthy();
    // P-146: 应有 icon 字段，不应有 iconUrl 字段
    expect(item.icon).toBe('https://example.com/badge-icon.png');
    expect(item.iconUrl).toBeUndefined();
  });

  it('GET /badges 返回 items[].icon（非 iconUrl）(P-146)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/badges');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    const item = res.body.data.items.find((b: any) => b.id === badgeId);
    expect(item).toBeTruthy();
    expect(item.icon).toBe('https://example.com/badge-icon.png');
    expect(item.iconUrl).toBeUndefined();
  });
});
