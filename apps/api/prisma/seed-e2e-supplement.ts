/**
 * seed-e2e-supplement.ts - 补齐 E2E 测试跳过项需要的演示数据
 *
 * 目的：E2E 二轮测试有 18 项因缺 seed 数据而跳过，本脚本补齐这些数据。
 * 基于现有「阳光花园」小区 + test_zhangsan/test_lisi 用户，幂等可重复执行。
 *
 * 运行：cd apps/api && npx tsx prisma/seed-e2e-supplement.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// 现有小区和用户（DB 实际存在）
const CID = 'a0000000-0000-0000-0000-000000000001'; // 阳光花园
const U_ZHANG = 'e4773507-f756-41ec-9b45-9118e747ecf2'; // test_zhangsan (verified)
const U_LISI = '1357a6f6-860e-428f-97aa-be08701f6c7a'; // test_lisi (verified)
const U_WANGWU = 'b0000000-0000-0000-0000-000000000003'; // 王五 (碧水湾，用于小区隔离测试)

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

// 固定 UUID（所有 seed 数据用 e2e 前缀避免和 seed.ts 冲突）
// 传入任意字符串，hash 成纯 hex 后补齐到 12 位
function uid(s: string): string {
  let h = '';
  for (let i = 0; i < s.length; i++) {
    h += (s.charCodeAt(i) % 16).toString(16);
  }
  return `e2e00000-0000-4000-8000-${h.padEnd(12, '0').slice(0, 12)}`;
}

async function main() {
  console.log('▶ 补齐 E2E 测试数据...');

  // ============================================================
  // 1. closed 议题（4.4.2~4.4.4 需要：完结态评分入口/提交/防重复）
  // ============================================================
  console.log('  → closed 议题...');
  const closedTopicId = uid('c1050001');
  await prisma.topic.upsert({
    where: { id: closedTopicId },
    update: {},
    create: {
      id: closedTopicId,
      communityId: CID,
      title: '【已完结】小区垃圾分类方案讨论',
      description: '经过讨论，大家一致同意增加晚间督导时段。此议题已完结。',
      status: 'closed',
      likeCount: 15,
      dislikeCount: 2,
      closedLikeCount: 12,
      closedDislikeCount: 1,
      ratingSum: 20,
      ratingCount: 4,
      commentCount: 8,
      closedSummary: '增加晚间 18:00-20:00 督导时段，志愿者排班落实。',
      closedAt: daysAgo(3),
      closedBy: U_ZHANG,
      createdBy: U_ZHANG,
      aiReviewStatus: 'pass',
      createdAt: daysAgo(20),
    },
  });
  console.log('    ✓ closed 议题 1 条');

  // ============================================================
  // 2. 更多闲置（3.7.5 分页需要 10+ 条，现有 3 条）
  // ============================================================
  console.log('  → 闲置市场补齐...');
  const extraMarketItems = [
    {
      title: '九成新婴儿推车转让',
      category: 'baby',
      price: 150,
      tradeType: 'sell',
      conditionLevel: 'like_new',
    },
    {
      title: '闲置电风扇出售',
      category: 'other',
      price: 30,
      tradeType: 'sell',
      conditionLevel: 'used',
    },
    {
      title: '儿童滑板车免费送',
      category: 'baby',
      price: null,
      tradeType: 'free',
      conditionLevel: 'good',
    },
    {
      title: '出闲置咖啡机',
      category: 'digital',
      price: 80,
      tradeType: 'sell',
      conditionLevel: 'used',
    },
    {
      title: '换一把雨伞',
      category: 'other',
      price: null,
      tradeType: 'exchange',
      conditionLevel: 'good',
    },
    {
      title: '搬家清仓衣物一批',
      category: 'other',
      price: null,
      tradeType: 'free',
      conditionLevel: 'used',
    },
    {
      title: '出闲置书架',
      category: 'furniture',
      price: 50,
      tradeType: 'sell',
      conditionLevel: 'used',
    },
    {
      title: '儿童玩具车转让',
      category: 'baby',
      price: 20,
      tradeType: 'sell',
      conditionLevel: 'used',
    },
    {
      title: '绿植盆栽免费送',
      category: 'other',
      price: null,
      tradeType: 'free',
      conditionLevel: 'good',
    },
    {
      title: '出闲置微波炉',
      category: 'digital',
      price: 100,
      tradeType: 'sell',
      conditionLevel: 'like_new',
    },
  ];
  for (let i = 0; i < extraMarketItems.length; i++) {
    const m = extraMarketItems[i];
    const id = uid(`mkt${String(i + 1).padStart(4, '0')}`);
    await prisma.marketItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        communityId: CID,
        sellerId: i % 2 === 0 ? U_ZHANG : U_LISI,
        category: m.category,
        title: m.title,
        description: `${m.title}，详细情况请联系。`,
        images: [],
        price: m.price,
        tradeType: m.tradeType,
        conditionLevel: m.conditionLevel,
        contactText: '微信联系',
        status: 'on_sale',
        aiReviewStatus: 'pass',
        createdAt: daysAgo(i + 3),
      },
    });
  }
  console.log(
    `    ✓ 闲置市场补齐 ${extraMarketItems.length} 条（共 ${3 + extraMarketItems.length} 条）`,
  );

  // ============================================================
  // 3. 更多议题（4.7.5 分页需要 10+ 条，现有 1 条）
  // ============================================================
  console.log('  → 议题补齐...');
  const extraTopics = [
    { title: '建议增加小区充电桩', desc: '新能源车越来越多，现有充电位不够用' },
    { title: '小区门禁系统升级建议', desc: '老旧门禁卡经常失效，建议升级人脸识别' },
    { title: '公共区域 WiFi 覆盖', desc: '希望活动室和花园能有免费 WiFi' },
    { title: '快递柜位置调整', desc: '现有快递柜位置不方便，建议搬迁' },
    { title: '垃圾分类投放点增设', desc: '目前投放点太少，排队严重' },
    { title: '地下车库信号增强', desc: '车库内手机无信号，紧急情况无法联系' },
    { title: '小区绿化品种优化', desc: '部分植物老化，建议更换新品种' },
    { title: '儿童游乐设施更新', desc: '现有滑梯老化存在安全隐患' },
    { title: '社区活动室预约制度', desc: '希望建立活动室在线预约系统' },
    { title: '夜间照明改善建议', desc: '部分楼道灯光不足，存在安全隐患' },
  ];
  for (let i = 0; i < extraTopics.length; i++) {
    const t = extraTopics[i];
    const id = uid(`top${String(i + 1).padStart(4, '0')}`);
    await prisma.topic.upsert({
      where: { id },
      update: {},
      create: {
        id,
        communityId: CID,
        title: t.title,
        description: t.desc,
        status: 'open',
        likeCount: Math.floor(Math.random() * 20) + 1,
        commentCount: Math.floor(Math.random() * 5),
        createdBy: i % 2 === 0 ? U_ZHANG : U_LISI,
        aiReviewStatus: 'pass',
        createdAt: daysAgo(i + 1),
      },
    });
  }
  console.log(`    ✓ 议题补齐 ${extraTopics.length} 条（共 ${1 + extraTopics.length} 条）`);

  // ============================================================
  // 4. 带图片的公告（5.3.5 图片轮播需要）
  // ============================================================
  console.log('  → 带图片公告...');
  const imgAnnouncementId = uid('ann0001');
  await prisma.committeeAnnouncement.upsert({
    where: { id: imgAnnouncementId },
    update: {},
    create: {
      id: imgAnnouncementId,
      communityId: CID,
      title: '小区绿化改造工程进展（附图）',
      content: '绿化改造工程已启动，以下是改造前的现状照片和设计方案图，请各位业主查看。',
      images: [
        'https://placeholder.co/600x400/5B9E6F/white?text=改造前1',
        'https://placeholder.co/600x400/4A8C5E/white?text=改造前2',
        'https://placeholder.co/600x400/A8D5B5/white?text=设计方案',
      ],
      publisherId: U_ZHANG,
      isPinned: false,
      status: 'published',
      publishedAt: daysAgo(1),
    },
  });
  console.log('    ✓ 带图片公告 1 条（3 张图）');

  // ============================================================
  // 5. committee_admin 账号（8.2.3~8.2.4 需要）
  // ============================================================
  console.log('  → committee_admin 账号...');
  const committeeAdminId = uid('cma00001');
  await prisma.adminUser.upsert({
    where: { id: committeeAdminId },
    update: {},
    create: {
      id: committeeAdminId,
      userId: U_LISI, // 绑定到 test_lisi
      username: 'committee_admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'committee_admin',
      communityId: CID,
      status: 'active',
    },
  });
  console.log('    ✓ committee_admin 账号 1 个（username: committee_admin / pwd: admin123）');

  // ============================================================
  // 6. pending 小区申请（1.7.3 Playwright 审批需要）
  // ============================================================
  console.log('  → pending 小区申请...');
  const pendingAppId = uid('app00001');
  await prisma.communityApplication.upsert({
    where: { id: pendingAppId },
    update: {},
    create: {
      id: pendingAppId,
      applicantId: U_WANGWU,
      name: '翠湖天地',
      city: '南京市',
      district: '秦淮区',
      address: '秦淮区苜蓿园大街88号',
      estimatedHouseholds: 1200,
      reason: '新交付小区，希望接入小区帮榜棒平台方便邻里互助',
      materialType: 'property_cert',
      materialUrl: 'https://placeholder.co/600x400/cccccc/white?text=房产证',
      doorPhotoUrl: 'https://placeholder.co/600x400/999999/white?text=小区门头',
      status: 'pending',
      supportCount: 0,
    },
  });
  console.log('    ✓ pending 小区申请 1 条（翠湖天地）');

  // ============================================================
  // 7. manual_review 状态内容（8.3.1~8.3.4 Admin 内容审核需要）
  // ============================================================
  console.log('  → manual_review 内容...');
  // 事件
  const reviewEventId = uid('rve00001');
  await prisma.event.upsert({
    where: { id: reviewEventId },
    update: {},
    create: {
      id: reviewEventId,
      communityId: CID,
      creatorId: U_LISI,
      type: 'help_request',
      title: '求助：代购药品（待审核）',
      description: '老人行动不便，希望邻居帮忙去附近药店代购降压药，有酬谢。',
      images: [],
      videos: [],
      rewardType: 'paid',
      rewardAmount: 50,
      locationText: '7栋2单元301室',
      status: 'pending_review',
      aiReviewStatus: 'manual_review',
      aiReviewResult: { score: 0.45, reason: '涉及药品代购，需人工确认安全性' },
    },
  });
  // 闲置
  const reviewMarketId = uid('rvm00001');
  await prisma.marketItem.upsert({
    where: { id: reviewMarketId },
    update: {},
    create: {
      id: reviewMarketId,
      communityId: CID,
      sellerId: U_LISI,
      category: 'other',
      title: '出闲置保健品（待审核）',
      description: '未开封的保健品一批，低价转让，详细情况请联系。',
      images: [],
      price: 200,
      tradeType: 'sell',
      conditionLevel: 'new',
      contactText: '微信联系',
      status: 'on_sale',
      aiReviewStatus: 'manual_review',
    },
  });
  // 议题
  const reviewTopicId = uid('rvt00001');
  await prisma.topic.upsert({
    where: { id: reviewTopicId },
    update: {},
    create: {
      id: reviewTopicId,
      communityId: CID,
      title: '关于小区周边商业噪音问题（待审核）',
      description: '小区底商经营噪音较大，影响居民休息，希望业委会协调解决。',
      status: 'open',
      createdBy: U_LISI,
      aiReviewStatus: 'manual_review',
      aiReviewResult: { score: 0.38, reason: '涉及商业投诉，需人工确认措辞' },
    },
  });
  console.log('    ✓ manual_review 内容 3 条（事件/闲置/议题各 1）');

  // ============================================================
  // 8. 公益活动 + 失物招领事件（6.2.2/6.2.3 发花流程需要）
  // 已有 public_welfare(in_progress) 和 lost_found(open) 各 1 个
  // 补一个 completed 状态的公益活动（可发花）+ completed 失物招领
  // ============================================================
  console.log('  → 公益活动 + 失物招领事件（completed 状态，可发花）...');

  // 找现有的 public_welfare 事件
  const welfareEvent = await prisma.event.findFirst({
    where: { communityId: CID, type: 'public_welfare' },
    orderBy: { createdAt: 'asc' },
  });

  if (welfareEvent) {
    // 标记为 completed
    await prisma.event.update({
      where: { id: welfareEvent.id },
      data: {
        status: 'completed',
        completedAt: daysAgo(1),
        thanksCount: 3,
      },
    });
    console.log(`    ✓ 公益活动 ${welfareEvent.id.slice(0, 8)}... 标记为 completed`);

    // 添加参与者（用于发花）- 先查再 upsert，避免 (event_id, user_id, action_type) 唯一约束冲突
    const participants = [U_ZHANG, U_LISI, U_WANGWU];
    for (let i = 0; i < participants.length; i++) {
      const existing = await prisma.eventApplication.findFirst({
        where: { eventId: welfareEvent.id, userId: participants[i], actionType: 'join' },
      });
      if (existing) {
        await prisma.eventApplication.update({
          where: { id: existing.id },
          data: { status: 'confirmed', message: '积极参加公益活动' },
        });
      } else {
        const eaId = uid(`wp${String(i + 1).padStart(4, '0')}`);
        await prisma.eventApplication.create({
          data: {
            id: eaId,
            eventId: welfareEvent.id,
            userId: participants[i],
            actionType: 'join',
            message: '积极参加公益活动',
            status: 'confirmed',
          },
        });
      }
    }
    console.log(`    ✓ 公益活动参与者 ${participants.length} 位`);
  }

  // 失物招领 completed
  const lostEventId = uid('lst00001');
  await prisma.event.upsert({
    where: { id: lostEventId },
    update: {},
    create: {
      id: lostEventId,
      communityId: CID,
      creatorId: U_ZHANG,
      type: 'lost_found',
      title: '寻物：丢失钥匙串（已找回，感谢邻居）',
      description: '在邻居帮助下已找回钥匙串，感谢热心的邻居们！',
      images: [],
      videos: [],
      rewardType: 'paid',
      rewardAmount: 50,
      locationText: '小区花园附近',
      status: 'completed',
      aiReviewStatus: 'pass',
      completedAt: daysAgo(2),
      thanksCount: 1,
    },
  });
  // 添加提供线索的邻居
  const clueAppId = uid('lca00001');
  await prisma.eventApplication.upsert({
    where: { id: clueAppId },
    update: {},
    create: {
      id: clueAppId,
      eventId: lostEventId,
      userId: U_LISI,
      actionType: 'provide_clue',
      message: '在花园喷泉旁边看到过一串钥匙，可以去物业认领',
      status: 'selected',
    },
  });
  console.log('    ✓ 失物招领 completed 事件 1 条（含线索提供者）');

  // ============================================================
  // 9. 议题合并建议（8.5.3 需要）
  // ============================================================
  console.log('  → 议题合并建议...');
  // 找两个相似议题
  const topic1 = await prisma.topic.findFirst({
    where: { communityId: CID, status: 'open', title: { contains: '充电' } },
  });
  const topic2 = await prisma.topic.findFirst({
    where: { communityId: CID, status: 'open', title: { contains: '充电桩' } },
  });

  if (topic1 && topic2 && topic1.id !== topic2.id) {
    const mergeId = uid('mrg00001');
    await prisma.topicMergeSuggestion.upsert({
      where: { id: mergeId },
      update: {},
      create: {
        id: mergeId,
        communityId: CID,
        sourceTopicId: topic1.id,
        targetTopicId: topic2.id,
        similarity: 0.85,
        status: 'pending',
      },
    });
    console.log('    ✓ 议题合并建议 1 条');
  } else {
    // 手动创建两个相似议题再建合并建议
    const similarTopic1Id = uid('st100001');
    const similarTopic2Id = uid('st200001');
    await prisma.topic.upsert({
      where: { id: similarTopic1Id },
      update: {},
      create: {
        id: similarTopic1Id,
        communityId: CID,
        title: '建议小区增加快递柜',
        description: '现有快递柜不够用，建议增加一组。',
        status: 'open',
        likeCount: 5,
        createdBy: U_ZHANG,
        aiReviewStatus: 'pass',
        createdAt: daysAgo(5),
      },
    });
    await prisma.topic.upsert({
      where: { id: similarTopic2Id },
      update: {},
      create: {
        id: similarTopic2Id,
        communityId: CID,
        title: '快递柜数量不足问题',
        description: '小区快递柜经常满，希望增设更多快递柜。',
        status: 'open',
        likeCount: 3,
        createdBy: U_LISI,
        aiReviewStatus: 'pass',
        createdAt: daysAgo(4),
      },
    });
    const mergeId = uid('mrg00001');
    await prisma.topicMergeSuggestion.upsert({
      where: { id: mergeId },
      update: {},
      create: {
        id: mergeId,
        communityId: CID,
        sourceTopicId: similarTopic1Id,
        targetTopicId: similarTopic2Id,
        similarity: 0.82,
        status: 'pending',
      },
    });
    console.log('    ✓ 议题合并建议 1 条（新建 2 个相似议题）');
  }

  // ============================================================
  // 10. 未上榜用户（6.1.6 需要）
  // 王五在碧水湾，不在阳光花园的光荣榜里，但需要他在阳光花园有活动记录
  // ============================================================
  console.log('  → 未上榜用户...');
  // 确保 U_WANGWU 有 community_member 记录在阳光花园（unverified，用于测试）
  const existingWangwuMember = await prisma.communityMember.findFirst({
    where: { userId: U_WANGWU, communityId: CID },
  });
  if (!existingWangwuMember) {
    await prisma.communityMember.create({
      data: {
        userId: U_WANGWU,
        communityId: CID,
        building: '8栋',
        roomMasked: '3***',
        role: 'resident',
        verifyStatus: 'verified',
      },
    });
    console.log('    ✓ 王五加入阳光花园（未上榜用户）');
  } else {
    console.log('    ✓ 王五已在阳光花园');
  }

  console.log('✅ E2E 测试数据补齐完成');
  console.log('');
  console.log('📋 补齐数据汇总：');
  console.log('  1. closed 议题 1 条（4.4.2~4.4.4 评分测试）');
  console.log('  2. 闲置 +10 条（3.7.5 分页测试）');
  console.log('  3. 议题 +10 条（4.7.5 分页测试）');
  console.log('  4. 带图片公告 1 条（5.3.5 图片轮播测试）');
  console.log('  5. committee_admin 账号（8.2.3~8.2.4 权限测试）');
  console.log('  6. pending 小区申请 1 条（1.7.3 审批测试）');
  console.log('  7. manual_review 内容 3 条（8.3.1~8.3.4 审核测试）');
  console.log('  8. 公益活动+失物招领 completed 各 1 条（6.2.2/6.2.3 发花测试）');
  console.log('  9. 议题合并建议 1 条（8.5.3 合并测试）');
  console.log('  10. 未上榜用户 1 位（6.1.6 未上榜处理测试）');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
