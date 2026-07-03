/**
 * seed-jinmao.ts — 为「金茂悦二期」小区填充演示数据
 *
 * 目的：测试账号（邻居854091 等）登录的是金茂悦二期(1228ac29-)，
 *       而主 seed.ts 的数据都在「阳光花园」，导致 UI 各页面无内容。
 *       本脚本用现有测试用户为该小区补齐 市场/议题/业委会/投票/服务商/榜单/勋章 数据。
 *
 * 幂等：全部固定 UUID + upsert，可重复执行。
 * 运行：cd apps/api && npx tsx prisma/seed-jinmao.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// 目标小区
const CID = '1228ac29-e815-4b9b-808c-aa09165d034a';

// 现有测试用户（金茂悦二期成员）
const U_MAIN = '06c61dc7-5e94-4fad-bd72-657c14d056a2'; // 邻居854091 verified（主要作者）
const U_B = '360b5875-2c77-40bd-9c78-c5482dd8d660'; // 邻居525808
const U_C = 'd46c690f-2724-4459-bb48-12b9b4bae5dd'; // 邻居046139
const U_D = '2520cfdc-181d-49bd-96c3-2c696b6d929c'; // 邻居768543

// 全局勋章（主 seed 已建）
const BADGE_HELPFUL = 'd1000000-0000-0000-0000-000000000001'; // 热心邻居
const BADGE_STAR = 'd1000000-0000-0000-0000-000000000002'; // 互助之星
const BADGE_GUARDIAN = 'd1000000-0000-0000-0000-000000000003'; // 社区守护者

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

async function main() {
  console.log('▶ 为金茂悦二期填充演示数据...');

  // ── 邻里帮：闲置市场 ──────────────────────────────
  const marketItems = [
    {
      id: 'f1a00000-0000-0000-0000-000000000001',
      category: 'furniture',
      title: '九成新实木书桌转让',
      description: '搬家闲置，实木书桌一张，1.2 米宽，无磕碰，自提。',
      price: 280,
      tradeType: 'sell',
      conditionLevel: 'like_new',
      contactText: '微信同号 138****8888',
      status: 'on_sale',
    },
    {
      id: 'f1a00000-0000-0000-0000-000000000002',
      category: 'baby',
      title: '宝宝绘本一批免费送',
      description: '孩子看过的绘本约 20 本，八成新，免费送给有需要的邻居。',
      price: null,
      tradeType: 'free',
      conditionLevel: 'good',
      contactText: '楼下快递柜自取',
      status: 'on_sale',
    },
    {
      id: 'f1a00000-0000-0000-0000-000000000003',
      category: 'books',
      title: '闲置绿植换多肉',
      description: '一盆长势很好的绿萝，想换一盆多肉，欢迎爱花的邻居。',
      price: null,
      tradeType: 'exchange',
      conditionLevel: 'good',
      contactText: '私信联系',
      status: 'on_sale',
    },
    {
      id: 'f1a00000-0000-0000-0000-000000000004',
      category: 'digital',
      title: '出闲置蓝牙音箱',
      description: '小米蓝牙音箱，用了半年，音质不错，低价出。',
      price: 60,
      tradeType: 'sell',
      conditionLevel: 'used',
      contactText: '晚上在家可看货',
      status: 'sold',
      soldAt: daysAgo(2),
    },
    {
      id: 'f1a00000-0000-0000-0000-000000000005',
      category: 'other',
      title: '富余鸡蛋分享给邻居',
      description: '老家寄来太多土鸡蛋，分享一些，先到先得。',
      price: null,
      tradeType: 'free',
      conditionLevel: 'new',
      contactText: '3 栋 2 单元',
      status: 'on_sale',
    },
  ];
  const marketSellers = [U_MAIN, U_B, U_C, U_MAIN, U_D];
  for (let i = 0; i < marketItems.length; i++) {
    const m = marketItems[i];
    const data = {
      communityId: CID,
      sellerId: marketSellers[i],
      category: m.category,
      title: m.title,
      description: m.description,
      images: [],
      price: m.price ?? null,
      tradeType: m.tradeType,
      conditionLevel: m.conditionLevel,
      contactText: m.contactText,
      status: m.status,
      aiReviewStatus: 'pass',
      soldAt: m.soldAt ?? null,
      createdAt: daysAgo(i + 1),
    };
    await prisma.marketItem.upsert({
      where: { id: m.id },
      create: { id: m.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 闲置市场 ${marketItems.length} 条`);

  // ── 议事榜：议题 ─────────────────────────────────
  const topics = [
    {
      id: 'f1b00000-0000-0000-0000-000000000001',
      title: '小区门口早市要不要保留？',
      description: '早市方便买菜但也带来噪音和卫生问题，大家怎么看？',
      likeCount: 12,
      commentCount: 6,
      createdBy: U_MAIN,
    },
    {
      id: 'f1b00000-0000-0000-0000-000000000002',
      title: '建议增设新能源车充电桩',
      description: '现在电车越来越多，地下车库充电位不够用，希望业委会推进。',
      likeCount: 8,
      commentCount: 3,
      createdBy: U_B,
    },
    {
      id: 'f1b00000-0000-0000-0000-000000000003',
      title: '垃圾分类督导时间能否调整',
      description: '早上督导时间太早，上班族赶不上，建议增加晚间时段。',
      likeCount: 4,
      commentCount: 1,
      createdBy: U_C,
    },
  ];
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const data = {
      communityId: CID,
      title: t.title,
      description: t.description,
      status: 'open',
      likeCount: t.likeCount,
      commentCount: t.commentCount,
      createdBy: t.createdBy,
      aiReviewStatus: 'pass',
      createdAt: daysAgo(i + 2),
    };
    await prisma.topic.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
  }
  console.log(`  ✓ 议题 ${topics.length} 条`);

  // ── 业委会：成员 ─────────────────────────────────
  const members = [
    {
      id: 'f1c00000-0000-0000-0000-000000000001',
      name: '陈建国',
      position: '业委会主任',
      responsibility: '统筹小区公共事务、对接物业与街道',
      claimedUserId: U_MAIN,
      claimStatus: 'claimed',
    },
    {
      id: 'f1c00000-0000-0000-0000-000000000002',
      name: '李秀兰',
      position: '副主任',
      responsibility: '负责财务公开与绿化改造',
      claimedUserId: null,
      claimStatus: 'unclaimed',
    },
    {
      id: 'f1c00000-0000-0000-0000-000000000003',
      name: '王强',
      position: '委员',
      responsibility: '负责安保与停车管理',
      claimedUserId: null,
      claimStatus: 'unclaimed',
    },
  ];
  for (const mb of members) {
    const data = {
      communityId: CID,
      name: mb.name,
      position: mb.position,
      responsibility: mb.responsibility,
      termStart: daysAgo(200),
      termEnd: daysAhead(900),
      claimedUserId: mb.claimedUserId,
      claimStatus: mb.claimStatus,
      status: 'active',
    };
    await prisma.committeeMember.upsert({
      where: { id: mb.id },
      create: { id: mb.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 业委会成员 ${members.length} 位`);

  // ── 业委会：公告 ─────────────────────────────────
  const announcements = [
    {
      id: 'f1d00000-0000-0000-0000-000000000001',
      title: '关于电梯年检暂停使用的通知',
      content:
        '定于本周六 9:00-12:00 对 1-3 栋电梯进行年检，期间暂停使用，请提前安排出行，给您带来不便敬请谅解。',
      isPinned: true,
    },
    {
      id: 'f1d00000-0000-0000-0000-000000000002',
      title: '小区绿化改造方案征求意见',
      content:
        '业委会拟对中心花园进行绿化升级，现公开征求居民意见，欢迎在议事榜留言，方案详情见公告栏。',
      isPinned: false,
    },
  ];
  for (let i = 0; i < announcements.length; i++) {
    const a = announcements[i];
    const data = {
      communityId: CID,
      title: a.title,
      content: a.content,
      images: [],
      publisherId: U_MAIN,
      isPinned: a.isPinned,
      status: 'published',
      publishedAt: daysAgo(i + 1),
      createdAt: daysAgo(i + 1),
    };
    await prisma.committeeAnnouncement.upsert({
      where: { id: a.id },
      create: { id: a.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 业委会公告 ${announcements.length} 条`);

  // ── 投票 ─────────────────────────────────────────
  const votes = [
    {
      id: 'f1e00000-0000-0000-0000-000000000001',
      title: '是否加装小区智能门禁系统',
      description: '为提升安全性，拟加装人脸/刷卡智能门禁，费用从公共维修资金列支。',
      voteType: 'single',
      maxChoices: null,
      options: ['同意加装', '不同意', '再议'],
    },
    {
      id: 'f1e00000-0000-0000-0000-000000000002',
      title: '公共活动室开放时段（可多选）',
      description: '为合理安排活动室使用，请选择你希望开放的时段。',
      voteType: 'multiple',
      maxChoices: 2,
      options: ['工作日上午', '工作日晚间', '周末全天'],
    },
  ];
  for (let i = 0; i < votes.length; i++) {
    const v = votes[i];
    const data = {
      communityId: CID,
      title: v.title,
      description: v.description,
      voteType: v.voteType,
      maxChoices: v.maxChoices,
      onlyVerified: true,
      onlyVerifiedLocked: true,
      resultVisibility: 'always',
      isAnonymous: false,
      startAt: daysAgo(2),
      endAt: daysAhead(5),
      status: 'published',
      createdBy: U_MAIN,
      createdAt: daysAgo(2),
    };
    await prisma.vote.upsert({ where: { id: v.id }, create: { id: v.id, ...data }, update: data });
    for (let j = 0; j < v.options.length; j++) {
      // 选项 ID：在第 3 段嵌入投票序号 i、末段嵌入选项序号 j，保证跨投票唯一
      const optId = `f1e00000-0000-0000-000${i}-0000000001${j}0`;
      await prisma.voteOption.upsert({
        where: { id: optId },
        create: { id: optId, voteId: v.id, content: v.options[j], sortOrder: j },
        update: { content: v.options[j], sortOrder: j },
      });
    }
  }
  console.log(`  ✓ 投票 ${votes.length} 个（含选项）`);

  // ── 服务商 ────────────────────────────────────────
  const providers = [
    {
      id: 'f1f00000-0000-0000-0000-000000000001',
      name: '老张家电维修',
      category: 'repair',
      description: '本小区居民，二十年维修经验，空调冰箱洗衣机上门快修。',
      contactText: '电话 138****1234',
      serviceArea: '本小区及周边 3 公里',
    },
    {
      id: 'f1f00000-0000-0000-0000-000000000002',
      name: '洁净家政保洁',
      category: 'cleaning',
      description: '日常保洁、深度大扫除、玻璃清洗，阿姨经验丰富。',
      contactText: '微信 jiejing_home',
      serviceArea: '金茂悦各期',
    },
    {
      id: 'f1f00000-0000-0000-0000-000000000003',
      name: '快开锁（备案）',
      category: 'lock',
      description: '正规备案开锁换锁，24 小时上门，需出示证件。',
      contactText: '电话 139****5678',
      serviceArea: '全城',
    },
  ];
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const data = {
      communityId: CID,
      name: p.name,
      category: p.category,
      description: p.description,
      contactText: p.contactText,
      serviceArea: p.serviceArea,
      recommendationSource: 'committee',
      verifyStatus: 'verified',
      status: 'published',
      sortOrder: i,
    };
    await prisma.serviceProvider.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 服务商 ${providers.length} 家`);

  // ── 勋章授予 ──────────────────────────────────────
  const userBadges = [
    { id: 'f1600000-0000-0000-0000-000000000001', userId: U_MAIN, badgeId: BADGE_HELPFUL },
    { id: 'f1600000-0000-0000-0000-000000000002', userId: U_MAIN, badgeId: BADGE_STAR },
    { id: 'f1600000-0000-0000-0000-000000000003', userId: U_B, badgeId: BADGE_GUARDIAN },
  ];
  for (const ub of userBadges) {
    const data = {
      userId: ub.userId,
      communityId: CID,
      badgeId: ub.badgeId,
      sourceType: 'manual',
      awardedAt: daysAgo(5),
    };
    await prisma.userBadge.upsert({
      where: { id: ub.id },
      create: { id: ub.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 勋章授予 ${userBadges.length} 枚`);

  // ── 光荣榜快照（总榜）────────────────────────────
  const ranks = [
    {
      id: 'f1700000-0000-0000-0000-000000000001',
      userId: U_MAIN,
      rankNo: 1,
      score: 320,
      flowerCount: 32,
      helpCount: 15,
      badgeCount: 2,
    },
    {
      id: 'f1700000-0000-0000-0000-000000000002',
      userId: U_B,
      rankNo: 2,
      score: 210,
      flowerCount: 21,
      helpCount: 9,
      badgeCount: 1,
    },
    {
      id: 'f1700000-0000-0000-0000-000000000003',
      userId: U_C,
      rankNo: 3,
      score: 150,
      flowerCount: 15,
      helpCount: 6,
      badgeCount: 0,
    },
  ];
  for (const r of ranks) {
    const data = {
      communityId: CID,
      periodType: 'total',
      periodKey: 'total',
      userId: r.userId,
      rankNo: r.rankNo,
      score: r.score,
      flowerCount: r.flowerCount,
      helpCount: r.helpCount,
      badgeCount: r.badgeCount,
    };
    await prisma.rankingSnapshot.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
  }
  console.log(`  ✓ 光荣榜快照 ${ranks.length} 条`);

  console.log('✅ 金茂悦二期演示数据填充完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
