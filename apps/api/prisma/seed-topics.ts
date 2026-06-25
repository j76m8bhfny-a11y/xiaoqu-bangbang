/**
 * 议事管理 假数据脚本（仅 topics 模块）
 *
 * 用法：
 *   cd apps/api && npx tsx prisma/seed-topics.ts
 *
 * 幂等：固定 UUID，重复跑只会 upsert，不会重复
 * 依赖：阳光小区（COMMUNITY_YANGGUANG_ID）+ 三个用户（张三/李四/王五）已存在
 *      （即先跑过 `pnpm db:seed`）
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// 复用主 seed 的 ID
const COMMUNITY_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ZHANGSAN_ID = 'b0000000-0000-0000-0000-000000000001';
const USER_LISI_ID = 'b0000000-0000-0000-0000-000000000002';
const USER_WANGWU_ID = 'b0000000-0000-0000-0000-000000000003';

// Topics
const T_GREEN_ID = '11111111-1111-1111-1111-000000000001'; // open - 花坛绿化
const T_ELEVATOR_ID = '11111111-1111-1111-1111-000000000002'; // open - 电梯老化
const T_ELEVATOR_DUP_ID = '11111111-1111-1111-1111-000000000003'; // open - 电梯维保（相似议题，用于合并建议）
const T_PARKING_ID = '11111111-1111-1111-1111-000000000004'; // closed - 停车位划线
const T_NOISE_ID = '11111111-1111-1111-1111-000000000005'; // rejected - 楼上噪音（个人纠纷被驳）

// Events (议事类)
const E_GREEN_1 = '22222222-2222-2222-2222-000000000001';
const E_GREEN_2 = '22222222-2222-2222-2222-000000000002';
const E_ELEVATOR_1 = '22222222-2222-2222-2222-000000000003';
const E_ELEVATOR_2 = '22222222-2222-2222-2222-000000000004';
const E_ELEVATOR_DUP_1 = '22222222-2222-2222-2222-000000000005';
const E_PARKING_1 = '22222222-2222-2222-2222-000000000006';
const E_PARKING_2 = '22222222-2222-2222-2222-000000000007';

// Topic comments
const TC_1 = '33333333-3333-3333-3333-000000000001';
const TC_2 = '33333333-3333-3333-3333-000000000002';
const TC_3 = '33333333-3333-3333-3333-000000000003';
const TC_4_REPLY = '33333333-3333-3333-3333-000000000004';

// Merge suggestion
const MS_ELEVATOR_ID = '44444444-4444-4444-4444-000000000001';

async function seed() {
  console.log('🌱 开始播种议事管理假数据...');

  // 检查依赖
  const community = await prisma.community.findUnique({ where: { id: COMMUNITY_ID } });
  if (!community) {
    throw new Error(`小区 ${COMMUNITY_ID} 不存在，请先运行 pnpm db:seed`);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [USER_ZHANGSAN_ID, USER_LISI_ID, USER_WANGWU_ID] } },
  });
  if (users.length < 3) {
    throw new Error('用户不全，请先运行 pnpm db:seed');
  }

  console.log('1️⃣  创建 5 个议题...');

  await prisma.topic.upsert({
    where: { id: T_GREEN_ID },
    update: {},
    create: {
      id: T_GREEN_ID,
      communityId: COMMUNITY_ID,
      title: '三栋楼下花坛需要修复',
      description: '花坛长期无人维护，杂草丛生，希望物业能尽快处理',
      status: 'open',
      likeCount: 12,
      dislikeCount: 1,
      eventCount: 2,
      commentCount: 3,
      createdBy: USER_ZHANGSAN_ID,
      aiReviewStatus: 'pass',
    },
  });

  await prisma.topic.upsert({
    where: { id: T_ELEVATOR_ID },
    update: {},
    create: {
      id: T_ELEVATOR_ID,
      communityId: COMMUNITY_ID,
      title: '电梯老化问题',
      description: '电梯频繁故障，希望尽快更换',
      status: 'open',
      likeCount: 28,
      dislikeCount: 0,
      eventCount: 2,
      commentCount: 0,
      createdBy: USER_LISI_ID,
      aiReviewStatus: 'pass',
    },
  });

  await prisma.topic.upsert({
    where: { id: T_ELEVATOR_DUP_ID },
    update: {},
    create: {
      id: T_ELEVATOR_DUP_ID,
      communityId: COMMUNITY_ID,
      title: '电梯维保升级建议',
      description: '建议更换电梯维保单位',
      status: 'open',
      likeCount: 5,
      dislikeCount: 0,
      eventCount: 1,
      commentCount: 0,
      createdBy: USER_WANGWU_ID,
      aiReviewStatus: 'pass',
    },
  });

  await prisma.topic.upsert({
    where: { id: T_PARKING_ID },
    update: {},
    create: {
      id: T_PARKING_ID,
      communityId: COMMUNITY_ID,
      title: '地下车库停车位划线模糊',
      description: '划线已基本看不清，希望重新划',
      status: 'closed',
      likeCount: 0,
      dislikeCount: 0,
      closedLikeCount: 18,
      closedDislikeCount: 0,
      ratingSum: 19,
      ratingCount: 5, // avg = 3.8
      eventCount: 2,
      commentCount: 0,
      closedSummary: '物业已于 6 月 15 日完成所有车位重新划线，标识清晰。',
      closedAt: new Date('2026-06-15T10:00:00.000Z'),
      closedBy: USER_ZHANGSAN_ID,
      createdBy: USER_LISI_ID,
      aiReviewStatus: 'pass',
    },
  });

  await prisma.topic.upsert({
    where: { id: T_NOISE_ID },
    update: {},
    create: {
      id: T_NOISE_ID,
      communityId: COMMUNITY_ID,
      title: '楼上邻居噪音问题',
      description: '希望管管楼上邻居',
      status: 'rejected',
      eventCount: 0,
      commentCount: 0,
      createdBy: USER_WANGWU_ID,
      aiReviewStatus: 'pass',
    },
  });

  console.log('2️⃣  创建议事类事件（挂到议题下）...');

  const events = [
    {
      id: E_GREEN_1,
      topicId: T_GREEN_ID,
      creatorId: USER_ZHANGSAN_ID,
      title: '三栋楼下花坛照片现状',
      description: '附上现状照片，杂草已经长到半人高',
      aiComment: '建议联系物业绿化部门评估修复方案。',
    },
    {
      id: E_GREEN_2,
      topicId: T_GREEN_ID,
      creatorId: USER_LISI_ID,
      title: '花坛附近有蚊虫',
      description: '夏天蚊虫多，建议尽快清理杂草',
      aiComment: '建议联系物业绿化部门评估修复方案。',
    },
    {
      id: E_ELEVATOR_1,
      topicId: T_ELEVATOR_ID,
      creatorId: USER_LISI_ID,
      title: '电梯今早卡在 5 楼',
      description: '8 点高峰期电梯故障，影响很多业主上班',
      aiComment: '该事件涉及公共设施安全，建议尽快上报物业处理。',
    },
    {
      id: E_ELEVATOR_2,
      topicId: T_ELEVATOR_ID,
      creatorId: USER_WANGWU_ID,
      title: '电梯按钮失灵',
      description: '3 楼按钮按了无反应',
      aiComment: '该事件涉及公共设施安全，建议尽快上报物业处理。',
    },
    {
      id: E_ELEVATOR_DUP_1,
      topicId: T_ELEVATOR_DUP_ID,
      creatorId: USER_WANGWU_ID,
      title: '维保公司响应慢',
      description: '上次报修等了 3 天才来人',
      aiComment: '该事件涉及公共设施安全，建议尽快上报物业处理。',
    },
    {
      id: E_PARKING_1,
      topicId: T_PARKING_ID,
      creatorId: USER_LISI_ID,
      title: '负一层车位线已磨损',
      description: '车位边线已基本看不清',
      aiComment: '建议物业排查并维护相关公共设施。',
    },
    {
      id: E_PARKING_2,
      topicId: T_PARKING_ID,
      creatorId: USER_ZHANGSAN_ID,
      title: '负二层同样问题',
      description: '负二层也需要重新划线',
      aiComment: '建议物业排查并维护相关公共设施。',
    },
  ];

  for (const ev of events) {
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        communityId: COMMUNITY_ID,
        creatorId: ev.creatorId,
        topicId: ev.topicId,
        type: 'public_feedback',
        title: ev.title,
        description: ev.description,
        images: [],
        rewardType: 'free',
        isAnonymous: false,
        status: 'open',
        aiReviewStatus: 'pass',
        aiComment: ev.aiComment,
      },
    });
  }

  console.log('3️⃣  创建议题评论...');

  await prisma.topicComment.upsert({
    where: { id: TC_1 },
    update: {},
    create: {
      id: TC_1,
      topicId: T_GREEN_ID,
      userId: USER_LISI_ID,
      content: '我也觉得花坛该修了，邻居们都在抱怨',
      images: [],
      likeCount: 5,
    },
  });
  await prisma.topicComment.upsert({
    where: { id: TC_2 },
    update: {},
    create: {
      id: TC_2,
      topicId: T_GREEN_ID,
      userId: USER_WANGWU_ID,
      content: '建议组织一次业主自助清理',
      images: [],
      likeCount: 2,
    },
  });
  await prisma.topicComment.upsert({
    where: { id: TC_3 },
    update: {},
    create: {
      id: TC_3,
      topicId: T_GREEN_ID,
      userId: USER_ZHANGSAN_ID,
      content: '已经反馈给物业了，会跟进',
      images: [],
      likeCount: 8,
    },
  });
  await prisma.topicComment.upsert({
    where: { id: TC_4_REPLY },
    update: {},
    create: {
      id: TC_4_REPLY,
      topicId: T_GREEN_ID,
      userId: USER_LISI_ID,
      parentId: TC_3,
      content: '感谢张哥跟进！',
      images: [],
      likeCount: 1,
    },
  });

  console.log('4️⃣  创建合并建议（电梯 vs 电梯维保）...');

  await prisma.topicMergeSuggestion.upsert({
    where: { id: MS_ELEVATOR_ID },
    update: {},
    create: {
      id: MS_ELEVATOR_ID,
      communityId: COMMUNITY_ID,
      sourceTopicId: T_ELEVATOR_DUP_ID,
      targetTopicId: T_ELEVATOR_ID,
      similarity: 0.72,
      status: 'pending',
    },
  });

  console.log('✅ 议事管理假数据已就绪');
  console.log('');
  console.log('数据统计：');
  console.log(`  议题：5 个（3 进行中、1 已完结、1 已驳回）`);
  console.log(`  事件：7 个（挂在不同议题下）`);
  console.log(`  评论：4 条（含 1 条回复）`);
  console.log(`  合并建议：1 条 pending`);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 播种失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });
