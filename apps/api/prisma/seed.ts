import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

// Load env vars from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Fixed deterministic UUIDs for idempotency — all must be valid UUID v4 format
// Communities
const COMMUNITY_YANGGUANG_ID = 'a0000000-0000-0000-0000-000000000001';
const COMMUNITY_BISHUIWAN_ID = 'a0000000-0000-0000-0000-000000000002';

// Users
const USER_ZHANGSAN_ID = 'b0000000-0000-0000-0000-000000000001';
const USER_LISI_ID = 'b0000000-0000-0000-0000-000000000002';
const USER_WANGWU_ID = 'b0000000-0000-0000-0000-000000000003';

// Events
const EVENT_HELP_REQ_ID = 'c0000000-0000-0000-0000-000000000001';
const EVENT_HELP_OFFER_ID = 'c0000000-0000-0000-0000-000000000002';
const EVENT_WELFARE_ID = 'c0000000-0000-0000-0000-000000000003';
const EVENT_LOST_FOUND_ID = 'c0000000-0000-0000-0000-000000000004';
const EVENT_FEEDBACK_ID = 'c0000000-0000-0000-0000-000000000005';
const EVENT_DISCUSSION_ID = 'c0000000-0000-0000-0000-000000000006';

// Market Items
const MARKET_FURNITURE_ID = 'd0000000-0000-0000-0000-000000000001';
const MARKET_BABY_ID = 'd0000000-0000-0000-0000-000000000002';
const MARKET_DIGITAL_ID = 'd0000000-0000-0000-0000-000000000003';

// Votes
const VOTE_GREEN_ID = 'e0000000-0000-0000-0000-000000000001';
const VOTE_FEE_ID = 'e0000000-0000-0000-0000-000000000002';

// Vote Options
const VOTE_GREEN_OPT_1 = 'e1000000-0000-0000-0000-000000000001';
const VOTE_GREEN_OPT_2 = 'e1000000-0000-0000-0000-000000000002';
const VOTE_GREEN_OPT_3 = 'e1000000-0000-0000-0000-000000000003';
const VOTE_FEE_OPT_1 = 'e2000000-0000-0000-0000-000000000001';
const VOTE_FEE_OPT_2 = 'e2000000-0000-0000-0000-000000000002';
const VOTE_FEE_OPT_3 = 'e2000000-0000-0000-0000-000000000003';
const VOTE_FEE_OPT_4 = 'e2000000-0000-0000-0000-000000000004';

// Committee Members
const COMMITTEE_DIRECTOR_ID = 'f0000000-0000-0000-0000-000000000001';
const COMMITTEE_VICE_ID = 'f0000000-0000-0000-0000-000000000002';
const COMMITTEE_MEMBER_ID = 'f0000000-0000-0000-0000-000000000003';

// Announcements
const ANNOUNCEMENT_SUMMARY_ID = 'a1000000-0000-0000-0000-000000000001';
const ANNOUNCEMENT_DRILL_ID = 'a1000000-0000-0000-0000-000000000002';

// Banners
const BANNER_EVENT_ID = 'b1000000-0000-0000-0000-000000000001';
const BANNER_ANNOUNCEMENT_ID = 'b1000000-0000-0000-0000-000000000002';

// Service Providers
const SP_REPAIR_ID = 'c1000000-0000-0000-0000-000000000001';
const SP_CLEANING_ID = 'c1000000-0000-0000-0000-000000000002';
const SP_LOCK_ID = 'c1000000-0000-0000-0000-000000000003';

// Badges
const BADGE_HELPFUL_ID = 'd1000000-0000-0000-0000-000000000001';
const BADGE_STAR_ID = 'd1000000-0000-0000-0000-000000000002';
const BADGE_GUARD_ID = 'd1000000-0000-0000-0000-000000000003';

// Community Members
const CM_ZHANGSAN_ID = 'aa000000-0000-0000-0000-000000000001';
const CM_LISI_ID = 'aa000000-0000-0000-0000-000000000002';
const CM_WANGWU_ID = 'aa000000-0000-0000-0000-000000000003';

// Event Comments
const EC_1_1 = 'ab000000-0000-0000-0000-000000000001';
const EC_1_2 = 'ab000000-0000-0000-0000-000000000002';
const EC_2_1 = 'ab000000-0000-0000-0000-000000000003';
const EC_2_2 = 'ab000000-0000-0000-0000-000000000004';
const EC_2_3 = 'ab000000-0000-0000-0000-000000000005';
const EC_3_1 = 'ab000000-0000-0000-0000-000000000006';
const EC_3_2 = 'ab000000-0000-0000-0000-000000000007';
const EC_4_1 = 'ab000000-0000-0000-0000-000000000008';
const EC_4_2 = 'ab000000-0000-0000-0000-000000000009';
const EC_5_1 = 'ab000000-0000-0000-0000-000000000010';
const EC_5_2 = 'ab000000-0000-0000-0000-000000000011';
const EC_5_3 = 'ab000000-0000-0000-0000-000000000012';
const EC_6_1 = 'ab000000-0000-0000-0000-000000000013';
const EC_6_2 = 'ab000000-0000-0000-0000-000000000014';

// Event Applications
const EA_1 = 'ac000000-0000-0000-0000-000000000001';
const EA_2 = 'ac000000-0000-0000-0000-000000000002';
const EA_3 = 'ac000000-0000-0000-0000-000000000003';
const EA_4 = 'ac000000-0000-0000-0000-000000000004';
const EA_5 = 'ac000000-0000-0000-0000-000000000005';

// Ranking Snapshots
const RK_1 = 'ad000000-0000-0000-0000-000000000001';
const RK_2 = 'ad000000-0000-0000-0000-000000000002';

// User Badges
const UB_1 = 'ae000000-0000-0000-0000-000000000001';
const UB_2 = 'ae000000-0000-0000-0000-000000000002';
const UB_3 = 'ae000000-0000-0000-0000-000000000003';

// Admin Users
const ADMIN_ZHANGSAN_ID = 'af000000-0000-0000-0000-000000000001';

async function seed() {
  console.log('Seeding database...');

  // ============================================================
  // 1. Communities
  // ============================================================
  console.log('Creating communities...');

  await prisma.community.upsert({
    where: { id: COMMUNITY_YANGGUANG_ID },
    update: {},
    create: {
      id: COMMUNITY_YANGGUANG_ID,
      name: '阳光花园',
      city: '南京市',
      district: '鼓楼区',
      address: '鼓楼区中山北路288号',
      status: 'active',
    },
  });

  await prisma.community.upsert({
    where: { id: COMMUNITY_BISHUIWAN_ID },
    update: {},
    create: {
      id: COMMUNITY_BISHUIWAN_ID,
      name: '碧水湾',
      city: '南京市',
      district: '建邺区',
      address: '建邺区河西大街168号',
      status: 'active',
    },
  });

  // ============================================================
  // 2. Users
  // ============================================================
  console.log('Creating users...');

  await prisma.user.upsert({
    where: { id: USER_ZHANGSAN_ID },
    update: {},
    create: {
      id: USER_ZHANGSAN_ID,
      openid: 'seed_zhangsan_openid',
      unionid: 'seed_zhangsan_unionid',
      phone: '13800000001',
      nickname: '张三',
      avatarUrl: '',
      bio: '阳光花园热心业主，乐于助人',
      status: 'active',
      currentCommunityId: COMMUNITY_YANGGUANG_ID,
    },
  });

  await prisma.user.upsert({
    where: { id: USER_LISI_ID },
    update: {},
    create: {
      id: USER_LISI_ID,
      openid: 'seed_lisi_openid',
      unionid: 'seed_lisi_unionid',
      phone: '13800000002',
      nickname: '李四',
      avatarUrl: '',
      bio: '住在阳光花园，喜欢分享',
      status: 'active',
      currentCommunityId: COMMUNITY_YANGGUANG_ID,
    },
  });

  await prisma.user.upsert({
    where: { id: USER_WANGWU_ID },
    update: {},
    create: {
      id: USER_WANGWU_ID,
      openid: 'seed_wangwu_openid',
      phone: '13800000003',
      nickname: '王五',
      avatarUrl: '',
      bio: '新搬来碧水湾的住户',
      status: 'active',
      currentCommunityId: COMMUNITY_BISHUIWAN_ID,
    },
  });

  // ============================================================
  // 3. Community Members
  // ============================================================
  console.log('Creating community members...');

  await prisma.communityMember.upsert({
    where: { id: CM_ZHANGSAN_ID },
    update: {},
    create: {
      id: CM_ZHANGSAN_ID,
      userId: USER_ZHANGSAN_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      building: '3栋',
      roomMasked: '12**',
      role: 'resident',
      verifyStatus: 'verified',
    },
  });

  await prisma.communityMember.upsert({
    where: { id: CM_LISI_ID },
    update: {},
    create: {
      id: CM_LISI_ID,
      userId: USER_LISI_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      building: '5栋',
      roomMasked: '8***',
      role: 'resident',
      verifyStatus: 'verified',
    },
  });

  await prisma.communityMember.upsert({
    where: { id: CM_WANGWU_ID },
    update: {},
    create: {
      id: CM_WANGWU_ID,
      userId: USER_WANGWU_ID,
      communityId: COMMUNITY_BISHUIWAN_ID,
      building: '2栋',
      roomMasked: '5***',
      role: 'resident',
      verifyStatus: 'unverified',
    },
  });

  // ============================================================
  // 4. Events + Comments
  // ============================================================
  console.log('Creating events...');

  // 4-1. help_request (open) by zhangsan
  await prisma.event.upsert({
    where: { id: EVENT_HELP_REQ_ID },
    update: {},
    create: {
      id: EVENT_HELP_REQ_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_ZHANGSAN_ID,
      type: 'help_request',
      title: '求助：搬运大件家具上楼',
      description: '家里新买了一个衣柜，需要两个人帮忙抬到6楼。大约需要30分钟，有意者请联系我！',
      images: [],
      videos: [],
      rewardType: 'paid',
      rewardAmount: 100,
      locationText: '3栋1单元602室',
      expectedTime: new Date('2026-05-25T10:00:00.000Z'),
      status: 'open',
      aiReviewStatus: 'pass',
      viewCount: 42,
      likeCount: 3,
      commentCount: 2,
    },
  });

  // 4-2. help_offer (open) by lisi
  await prisma.event.upsert({
    where: { id: EVENT_HELP_OFFER_ID },
    update: {},
    create: {
      id: EVENT_HELP_OFFER_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_LISI_ID,
      type: 'help_offer',
      title: '提供：免费电脑维修服务',
      description:
        '我是IT从业者，周末有空可以帮邻居修电脑、装系统、解决网络问题，不收费用，纯属帮忙。',
      images: [],
      videos: [],
      rewardType: 'free',
      locationText: '阳光花园5栋',
      status: 'open',
      aiReviewStatus: 'pass',
      viewCount: 67,
      likeCount: 12,
      commentCount: 3,
    },
  });

  // 4-3. public_welfare (in_progress) by zhangsan
  await prisma.event.upsert({
    where: { id: EVENT_WELFARE_ID },
    update: {},
    create: {
      id: EVENT_WELFARE_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_ZHANGSAN_ID,
      type: 'public_welfare',
      title: '小区义卖活动——为山区儿童筹款',
      description:
        '本周六在小区广场举办义卖活动，欢迎居民捐赠闲置物品，所有收入将捐给山区儿童教育基金。',
      images: [],
      videos: [],
      rewardType: 'none',
      locationText: '阳光花园中心广场',
      eventTime: new Date('2026-05-30T09:00:00.000Z'),
      capacity: 50,
      status: 'in_progress',
      aiReviewStatus: 'pass',
      viewCount: 128,
      likeCount: 35,
      commentCount: 5,
    },
  });

  // 4-4. lost_found (open) by lisi
  await prisma.event.upsert({
    where: { id: EVENT_LOST_FOUND_ID },
    update: {},
    create: {
      id: EVENT_LOST_FOUND_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_LISI_ID,
      type: 'lost_found',
      title: '寻物：丢失一把车钥匙（大众）',
      description:
        '今天下午在小区地下车库附近丢失了一把大众车钥匙，灰色遥控钥匙扣，拾到者请联系我，必有酬谢！',
      images: [],
      videos: [],
      rewardType: 'negotiable',
      locationText: '地下车库B区附近',
      status: 'open',
      aiReviewStatus: 'pass',
      viewCount: 23,
      likeCount: 1,
      commentCount: 2,
    },
  });

  // 4-5. public_feedback (open) by zhangsan
  await prisma.event.upsert({
    where: { id: EVENT_FEEDBACK_ID },
    update: {},
    create: {
      id: EVENT_FEEDBACK_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_ZHANGSAN_ID,
      type: 'public_feedback',
      title: '反馈：3栋楼道灯长期不亮',
      description:
        '3栋2单元5楼到6楼的楼道灯已经坏了两个多月了，多次向物业反映未解决，希望尽快处理，存在安全隐患。',
      images: [],
      videos: [],
      rewardType: 'none',
      locationText: '3栋2单元5-6楼',
      status: 'open',
      aiReviewStatus: 'pass',
      viewCount: 89,
      likeCount: 18,
      commentCount: 4,
    },
  });

  // 4-6. discussion (open) by lisi
  await prisma.event.upsert({
    where: { id: EVENT_DISCUSSION_ID },
    update: {},
    create: {
      id: EVENT_DISCUSSION_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      creatorId: USER_LISI_ID,
      type: 'discussion',
      title: '讨论：是否应该限制外卖电动车进入小区',
      description:
        '最近小区内外卖电动车速度很快，存在安全隐患。是否应该限制外卖电动车进入小区，或者规定限速和指定路线？欢迎大家讨论。',
      images: [],
      videos: [],
      rewardType: 'none',
      status: 'open',
      aiReviewStatus: 'pass',
      viewCount: 156,
      likeCount: 24,
      commentCount: 8,
    },
  });

  // Event Comments (2-3 per event)
  console.log('Creating event comments...');

  const commentData = [
    // Comments for help_request
    {
      id: EC_1_1,
      eventId: EVENT_HELP_REQ_ID,
      userId: USER_LISI_ID,
      content: '我可以帮忙，周六上午可以吗？',
    },
    {
      id: EC_1_2,
      eventId: EVENT_HELP_REQ_ID,
      userId: USER_WANGWU_ID,
      content: '6楼确实不好搬，注意安全！',
    },

    // Comments for help_offer
    {
      id: EC_2_1,
      eventId: EVENT_HELP_OFFER_ID,
      userId: USER_ZHANGSAN_ID,
      content: '太好了！我电脑最近总是蓝屏，能帮我看看吗？',
    },
    {
      id: EC_2_2,
      eventId: EVENT_HELP_OFFER_ID,
      userId: USER_WANGWU_ID,
      content: '李四真是个好人！',
    },
    {
      id: EC_2_3,
      eventId: EVENT_HELP_OFFER_ID,
      userId: USER_ZHANGSAN_ID,
      content: '请问周末几点方便？我下午过去',
    },

    // Comments for public_welfare
    {
      id: EC_3_1,
      eventId: EVENT_WELFARE_ID,
      userId: USER_LISI_ID,
      content: '支持！我捐一些孩子的旧书',
    },
    {
      id: EC_3_2,
      eventId: EVENT_WELFARE_ID,
      userId: USER_WANGWU_ID,
      content: '非常有意义的活动，到时候一定参加',
    },

    // Comments for lost_found
    {
      id: EC_4_1,
      eventId: EVENT_LOST_FOUND_ID,
      userId: USER_ZHANGSAN_ID,
      content: '昨天在B区看到过一把钥匙，不知道是不是你的',
    },
    {
      id: EC_4_2,
      eventId: EVENT_LOST_FOUND_ID,
      userId: USER_WANGWU_ID,
      content: '建议去物业看看监控',
    },

    // Comments for public_feedback
    {
      id: EC_5_1,
      eventId: EVENT_FEEDBACK_ID,
      userId: USER_LISI_ID,
      content: '我们栋也有同样的问题，楼道灯坏了好几处',
    },
    {
      id: EC_5_2,
      eventId: EVENT_FEEDBACK_ID,
      userId: USER_WANGWU_ID,
      content: '安全问题不能忽视，物业应该尽快处理',
    },
    {
      id: EC_5_3,
      eventId: EVENT_FEEDBACK_ID,
      userId: USER_LISI_ID,
      content: '可以联名向物业提交书面投诉',
    },

    // Comments for discussion
    {
      id: EC_6_1,
      eventId: EVENT_DISCUSSION_ID,
      userId: USER_ZHANGSAN_ID,
      content: '我觉得可以划定专用通道，而不是完全禁止',
    },
    {
      id: EC_6_2,
      eventId: EVENT_DISCUSSION_ID,
      userId: USER_WANGWU_ID,
      content: '支持限速，但不能一刀切，外卖员也不容易',
    },
  ];

  for (const c of commentData) {
    await prisma.eventComment.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        eventId: c.eventId,
        userId: c.userId,
        content: c.content,
        aiReviewStatus: 'pass',
        status: 'visible',
      },
    });
  }

  // ============================================================
  // 5. Market Items
  // ============================================================
  console.log('Creating market items...');

  // 5-1. furniture (SELL, like_new) by zhangsan
  await prisma.marketItem.upsert({
    where: { id: MARKET_FURNITURE_ID },
    update: {},
    create: {
      id: MARKET_FURNITURE_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      sellerId: USER_ZHANGSAN_ID,
      category: 'furniture',
      title: '实木书桌（1.2米）九成新',
      description:
        '搬家转实木书桌，1.2米宽，带两个抽屉，原价1800元，使用不到一年，表面无明显划痕，自提。',
      images: [],
      price: 600,
      tradeType: 'sell',
      conditionLevel: 'like_new',
      contactText: '微信：zhangsan_2024',
      status: 'on_sale',
      aiReviewStatus: 'pass',
    },
  });

  // 5-2. baby (FREE) by lisi
  await prisma.marketItem.upsert({
    where: { id: MARKET_BABY_ID },
    update: {},
    create: {
      id: MARKET_BABY_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      sellerId: USER_LISI_ID,
      category: 'baby',
      title: '儿童绘本30本，免费送',
      description:
        '孩子长大了不看了，30本绘本免费送给有需要的邻居，适合3-6岁儿童。大多完好，少数有折痕。',
      images: [],
      tradeType: 'free',
      conditionLevel: 'used',
      contactText: '5栋1单元，随时来取',
      status: 'on_sale',
      aiReviewStatus: 'pass',
    },
  });

  // 5-3. digital (EXCHANGE, good) by zhangsan
  await prisma.marketItem.upsert({
    where: { id: MARKET_DIGITAL_ID },
    update: {},
    create: {
      id: MARKET_DIGITAL_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      sellerId: USER_ZHANGSAN_ID,
      category: 'digital',
      title: 'Kindle Paperwhite 4 交换',
      description:
        '闲置Kindle PW4一台，8GB，功能正常，屏幕无划痕。想交换一个蓝牙耳机或者小型音箱，有意私聊。',
      images: [],
      tradeType: 'exchange',
      conditionLevel: 'good',
      contactText: '3栋张三，微信联系',
      status: 'on_sale',
      aiReviewStatus: 'pass',
    },
  });

  // ============================================================
  // 6. Votes
  // ============================================================
  console.log('Creating votes...');

  // Vote 1: 小区绿化改造方案 (single choice, published)
  await prisma.vote.upsert({
    where: { id: VOTE_GREEN_ID },
    update: {},
    create: {
      id: VOTE_GREEN_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '小区绿化改造方案',
      description:
        '小区绿化改造即将启动，请各位业主投票选择改造方案。本次投票仅限已认证业主参与，每人限投一票。',
      voteType: 'single',
      onlyVerified: true,
      onlyVerifiedLocked: true,
      resultVisibility: 'always',
      isAnonymous: false,
      startAt: new Date('2026-05-20T00:00:00.000Z'),
      endAt: new Date('2026-06-20T23:59:59.000Z'),
      status: 'published',
      createdBy: USER_ZHANGSAN_ID,
    },
  });

  // Vote 1 options
  const voteGreenOptions = [
    { id: VOTE_GREEN_OPT_1, content: '方案A：增种乔木，打造林荫步道', sortOrder: 1 },
    { id: VOTE_GREEN_OPT_2, content: '方案B：建设花坛和休闲草坪', sortOrder: 2 },
    { id: VOTE_GREEN_OPT_3, content: '方案C：保留现有绿化，只做维护翻新', sortOrder: 3 },
  ];

  for (const opt of voteGreenOptions) {
    await prisma.voteOption.upsert({
      where: { id: opt.id },
      update: {},
      create: {
        id: opt.id,
        voteId: VOTE_GREEN_ID,
        content: opt.content,
        sortOrder: opt.sortOrder,
      },
    });
  }

  // Vote 2: 物业费调整 (multiple choice, maxChoices=2)
  await prisma.vote.upsert({
    where: { id: VOTE_FEE_ID },
    update: {},
    create: {
      id: VOTE_FEE_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '物业费调整方案',
      description: '关于下一年度物业费调整，请业主选择可接受的方案。本次投票为多选，最多选2项。',
      voteType: 'multiple',
      maxChoices: 2,
      onlyVerified: true,
      onlyVerifiedLocked: true,
      resultVisibility: 'after_vote',
      isAnonymous: true,
      startAt: new Date('2026-05-22T00:00:00.000Z'),
      endAt: new Date('2026-06-22T23:59:59.000Z'),
      status: 'published',
      createdBy: USER_LISI_ID,
    },
  });

  // Vote 2 options
  const voteFeeOptions = [
    { id: VOTE_FEE_OPT_1, content: '维持现状（2.5元/平米/月）', sortOrder: 1 },
    { id: VOTE_FEE_OPT_2, content: '上调至3.0元，增加安保巡逻', sortOrder: 2 },
    { id: VOTE_FEE_OPT_3, content: '上调至3.5元，增加安保+绿化养护', sortOrder: 3 },
    { id: VOTE_FEE_OPT_4, content: '下调至2.0元，缩减部分服务', sortOrder: 4 },
  ];

  for (const opt of voteFeeOptions) {
    await prisma.voteOption.upsert({
      where: { id: opt.id },
      update: {},
      create: {
        id: opt.id,
        voteId: VOTE_FEE_ID,
        content: opt.content,
        sortOrder: opt.sortOrder,
      },
    });
  }

  // ============================================================
  // 7. Committee Members
  // ============================================================
  console.log('Creating committee members...');

  await prisma.committeeMember.upsert({
    where: { id: COMMITTEE_DIRECTOR_ID },
    update: {},
    create: {
      id: COMMITTEE_DIRECTOR_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '陈主任',
      position: '主任',
      avatarUrl: '',
      responsibility: '业委会全面工作，对外联络',
      termStart: new Date('2024-01-01'),
      termEnd: new Date('2026-12-31'),
      claimedUserId: USER_ZHANGSAN_ID,
      claimStatus: 'claimed',
      status: 'active',
    },
  });

  await prisma.committeeMember.upsert({
    where: { id: COMMITTEE_VICE_ID },
    update: {},
    create: {
      id: COMMITTEE_VICE_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '刘副主任',
      position: '副主任',
      avatarUrl: '',
      responsibility: '协助主任工作，分管物业管理',
      termStart: new Date('2024-01-01'),
      termEnd: new Date('2026-12-31'),
      claimStatus: 'unclaimed',
      status: 'active',
    },
  });

  await prisma.committeeMember.upsert({
    where: { id: COMMITTEE_MEMBER_ID },
    update: {},
    create: {
      id: COMMITTEE_MEMBER_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '赵委员',
      position: '委员',
      avatarUrl: '',
      responsibility: '分管安全与消防',
      termStart: new Date('2024-01-01'),
      termEnd: new Date('2026-12-31'),
      claimStatus: 'pending',
      status: 'active',
    },
  });

  // ============================================================
  // 8. Committee Announcements
  // ============================================================
  console.log('Creating committee announcements...');

  await prisma.committeeAnnouncement.upsert({
    where: { id: ANNOUNCEMENT_SUMMARY_ID },
    update: {},
    create: {
      id: ANNOUNCEMENT_SUMMARY_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '2024年度工作总结',
      content:
        '各位业主：2024年业委会主要完成了以下工作：1. 完成了小区监控系统的全面升级；2. 推动了地下车库防水改造工程；3. 组织了3次社区文化活动；4. 与物业协商降低了公共区域电费。感谢各位业主的支持与配合！',
      images: [],
      publisherId: USER_ZHANGSAN_ID,
      isPinned: true,
      status: 'published',
      publishedAt: new Date('2026-01-15T10:00:00.000Z'),
    },
  });

  await prisma.committeeAnnouncement.upsert({
    where: { id: ANNOUNCEMENT_DRILL_ID },
    update: {},
    create: {
      id: ANNOUNCEMENT_DRILL_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '小区消防演练通知',
      content:
        '为增强居民消防安全意识，业委会联合物业将于6月15日上午9:00在中心广场举行消防演练。届时将有消防员现场演示灭火器使用和逃生技巧，欢迎各位业主积极参与。',
      images: [],
      publisherId: USER_LISI_ID,
      isPinned: false,
      status: 'published',
      publishedAt: new Date('2026-05-10T08:00:00.000Z'),
    },
  });

  // ============================================================
  // 9. Banners
  // ============================================================
  console.log('Creating banners...');

  await prisma.banner.upsert({
    where: { id: BANNER_EVENT_ID },
    update: {},
    create: {
      id: BANNER_EVENT_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '小区义卖活动即将开始',
      subtitle: '为山区儿童筹款，期待您的参与',
      imageUrl: '',
      linkType: 'event',
      linkId: EVENT_WELFARE_ID,
      position: 'home_top',
      sortOrder: 1,
      status: 'published',
      startAt: new Date('2026-05-20T00:00:00.000Z'),
      endAt: new Date('2026-05-31T23:59:59.000Z'),
    },
  });

  await prisma.banner.upsert({
    where: { id: BANNER_ANNOUNCEMENT_ID },
    update: {},
    create: {
      id: BANNER_ANNOUNCEMENT_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      title: '消防演练通知',
      subtitle: '6月15日中心广场，学习消防安全知识',
      imageUrl: '',
      linkType: 'announcement',
      linkId: ANNOUNCEMENT_DRILL_ID,
      position: 'home_top',
      sortOrder: 2,
      status: 'published',
      startAt: new Date('2026-05-10T00:00:00.000Z'),
      endAt: new Date('2026-06-15T23:59:59.000Z'),
    },
  });

  // ============================================================
  // 10. Service Providers
  // ============================================================
  console.log('Creating service providers...');

  await prisma.serviceProvider.upsert({
    where: { id: SP_REPAIR_ID },
    update: {},
    create: {
      id: SP_REPAIR_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '老王维修',
      category: 'repair',
      logoUrl: '',
      coverUrl: '',
      description: '专业水电维修15年，擅长管道疏通、电路检修、龙头更换等。价格公道，随叫随到。',
      contactText: '电话：13900001111',
      serviceArea: '阳光花园及周边小区',
      recommendationSource: 'committee',
      verifyStatus: 'verified',
      status: 'published',
      sortOrder: 1,
    },
  });

  await prisma.serviceProvider.upsert({
    where: { id: SP_CLEANING_ID },
    update: {},
    create: {
      id: SP_CLEANING_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '张阿姨保洁',
      category: 'cleaning',
      logoUrl: '',
      coverUrl: '',
      description: '家政保洁服务，提供日常保洁、深度清洁、开荒保洁等。经验丰富，口碑良好。',
      contactText: '微信：zhang_ayi_clean',
      serviceArea: '阳光花园',
      recommendationSource: 'community',
      verifyStatus: 'verified',
      status: 'published',
      sortOrder: 2,
    },
  });

  await prisma.serviceProvider.upsert({
    where: { id: SP_LOCK_ID },
    update: {},
    create: {
      id: SP_LOCK_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      name: '小李开锁',
      category: 'lock',
      logoUrl: '',
      coverUrl: '',
      description: '公安备案开锁服务，专业开锁、换锁、装智能锁。24小时上门，安全可靠。',
      contactText: '电话：13900003333',
      serviceArea: '鼓楼区全境',
      recommendationSource: 'platform',
      verifyStatus: 'verified',
      status: 'published',
      sortOrder: 3,
    },
  });

  // ============================================================
  // 11. Badges — Standard M10.6 定义的四类勋章
  // ============================================================
  console.log('Creating badges...');

  const badgeDefs = [
    // 互助类
    { code: 'helper_1', name: '初来乍到', description: '完成第一次互助' },
    { code: 'helper_5', name: '热心邻居', description: '完成5次互助' },
    { code: 'helper_20', name: '互助达人', description: '完成20次互助' },
    // 议事类
    { code: 'feedback_5', name: '议事参与者', description: '参与5次议事' },
    { code: 'feedback_20', name: '议事达人', description: '参与20次议事' },
    // 议题类
    { code: 'topic_1', name: '议题提出者', description: '提出1个议题' },
    { code: 'topic_5', name: '议题达人', description: '提出5个议题' },
    // 小花类
    { code: 'flower_10', name: '花开满园', description: '累计获得10朵小红花' },
    { code: 'flower_50', name: '花团锦簇', description: '累计获得50朵小红花' },
    // 特殊类 (Standard M10.6)
    { code: 'first_owner_top30', name: '先锋业主', description: '前30名认证业主' },
    { code: 'founder', name: '小区创始人', description: '小区申请通过' },
    { code: 'seed', name: '种子贡献者', description: '助力小区创建' },
  ];

  for (const def of badgeDefs) {
    await prisma.badge.upsert({
      where: { code: def.code },
      update: {},
      create: {
        code: def.code,
        name: def.name,
        description: def.description,
        iconUrl: '',
        ruleJson: {},
        status: 'active',
      },
    });
  }

  // 保留旧 badge codes 用于向后兼容（已有 userBadge 关联）
  await prisma.badge.upsert({
    where: { id: BADGE_HELPFUL_ID },
    update: {},
    create: {
      id: BADGE_HELPFUL_ID,
      code: 'helpful_neighbor',
      name: '热心邻居',
      description: '累计帮助3位以上邻居获得',
      iconUrl: '',
      ruleJson: { type: 'help_count', threshold: 3 },
      status: 'active',
    },
  });

  await prisma.badge.upsert({
    where: { id: BADGE_STAR_ID },
    update: {},
    create: {
      id: BADGE_STAR_ID,
      code: 'mutual_aid_star',
      name: '互助之星',
      description: '累计帮助10位以上邻居获得',
      iconUrl: '',
      ruleJson: { type: 'help_count', threshold: 10 },
      status: 'active',
    },
  });

  await prisma.badge.upsert({
    where: { id: BADGE_GUARD_ID },
    update: {},
    create: {
      id: BADGE_GUARD_ID,
      code: 'community_guardian',
      name: '社区守护者',
      description: '参与5次以上公益或公共事务获得',
      iconUrl: '',
      ruleJson: { type: 'public_welfare_count', threshold: 5 },
      status: 'active',
    },
  });

  // ============================================================
  // 12. Ranking data: EventApplications for help counts
  // ============================================================
  console.log('Creating event applications for ranking data...');

  // 李四 applies to help on 张三's help_request
  await prisma.eventApplication.upsert({
    where: { id: EA_1 },
    update: {},
    create: {
      id: EA_1,
      eventId: EVENT_HELP_REQ_ID,
      userId: USER_LISI_ID,
      actionType: 'help',
      message: '我有空，可以帮忙！',
      status: 'selected',
    },
  });

  // 张三 applies to 李四's help_offer (as someone who needs help)
  await prisma.eventApplication.upsert({
    where: { id: EA_2 },
    update: {},
    create: {
      id: EA_2,
      eventId: EVENT_HELP_OFFER_ID,
      userId: USER_ZHANGSAN_ID,
      actionType: 'need_help',
      message: '我电脑经常蓝屏，能帮我看看吗？',
      status: 'confirmed',
    },
  });

  // 李四 participates in the public welfare event
  await prisma.eventApplication.upsert({
    where: { id: EA_3 },
    update: {},
    create: {
      id: EA_3,
      eventId: EVENT_WELFARE_ID,
      userId: USER_LISI_ID,
      actionType: 'join',
      message: '我参加！可以帮忙布置场地',
      status: 'confirmed',
    },
  });

  // 王五 also joins the welfare event
  await prisma.eventApplication.upsert({
    where: { id: EA_4 },
    update: {},
    create: {
      id: EA_4,
      eventId: EVENT_WELFARE_ID,
      userId: USER_WANGWU_ID,
      actionType: 'join',
      message: '我也要参加',
      status: 'pending',
    },
  });

  // 张三 provides clue for lost_found
  await prisma.eventApplication.upsert({
    where: { id: EA_5 },
    update: {},
    create: {
      id: EA_5,
      eventId: EVENT_LOST_FOUND_ID,
      userId: USER_ZHANGSAN_ID,
      actionType: 'provide_clue',
      message: '昨天在B区看到过一把灰色钥匙，可以去物业认领',
      status: 'selected',
    },
  });

  // ============================================================
  // 13. Ranking Snapshots (derived data for display)
  // ============================================================
  console.log('Creating ranking snapshots...');

  await prisma.rankingSnapshot.upsert({
    where: { id: RK_1 },
    update: {},
    create: {
      id: RK_1,
      communityId: COMMUNITY_YANGGUANG_ID,
      periodType: 'total',
      periodKey: 'total',
      userId: USER_ZHANGSAN_ID,
      rankNo: 1,
      score: 350,
      flowerCount: 18,
      helpCount: 8,
      badgeCount: 2,
    },
  });

  await prisma.rankingSnapshot.upsert({
    where: { id: RK_2 },
    update: {},
    create: {
      id: RK_2,
      communityId: COMMUNITY_YANGGUANG_ID,
      periodType: 'total',
      periodKey: 'total',
      userId: USER_LISI_ID,
      rankNo: 2,
      score: 280,
      flowerCount: 14,
      helpCount: 5,
      badgeCount: 1,
    },
  });

  // ============================================================
  // 14. User Badges (awarded to 张三 and 李四)
  // ============================================================
  console.log('Creating user badges...');

  await prisma.userBadge.upsert({
    where: { id: UB_1 },
    update: {},
    create: {
      id: UB_1,
      userId: USER_ZHANGSAN_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      badgeId: BADGE_HELPFUL_ID,
      sourceType: 'event',
      sourceId: EVENT_HELP_REQ_ID,
      awardedAt: new Date('2026-05-01T10:00:00.000Z'),
    },
  });

  await prisma.userBadge.upsert({
    where: { id: UB_2 },
    update: {},
    create: {
      id: UB_2,
      userId: USER_ZHANGSAN_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      badgeId: BADGE_GUARD_ID,
      sourceType: 'event',
      sourceId: EVENT_WELFARE_ID,
      awardedAt: new Date('2026-05-10T10:00:00.000Z'),
    },
  });

  await prisma.userBadge.upsert({
    where: { id: UB_3 },
    update: {},
    create: {
      id: UB_3,
      userId: USER_LISI_ID,
      communityId: COMMUNITY_YANGGUANG_ID,
      badgeId: BADGE_HELPFUL_ID,
      sourceType: 'event',
      sourceId: EVENT_HELP_OFFER_ID,
      awardedAt: new Date('2026-05-05T10:00:00.000Z'),
    },
  });

  // ============================================================
  // 15. Admin Users
  // ============================================================
  console.log('Creating admin users...');

  await prisma.adminUser.upsert({
    where: { id: ADMIN_ZHANGSAN_ID },
    update: {},
    create: {
      id: ADMIN_ZHANGSAN_ID,
      userId: USER_ZHANGSAN_ID,
      username: 'zhangsan_admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'platform_admin',
      communityId: COMMUNITY_YANGGUANG_ID,
      status: 'active',
    },
  });

  console.log('Seeding completed successfully!');
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
