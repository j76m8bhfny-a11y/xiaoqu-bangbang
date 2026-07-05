import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RankingsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * 互助类事件完成时触发: helper 花朵 + public_welfare 创建者 5 朵 + completion 通知
   * 仅处理互助类 (help_request/public_welfare/lost_found)，议事类走 handleEventApproved
   */
  async handleEventCompletion(event: {
    id: string;
    communityId: string;
    creatorId: string;
    selectedHelperId: string | null;
    type: string;
    rewardType: string;
  }) {
    const helperId = event.selectedHelperId;
    const action = this.getEventAction(event.type, event.rewardType);
    const flowerCount = this.getFlowerCount(action);

    // 1. Helper contribution record (if helper exists)
    if (helperId) {
      // P-276: 使用 upsert 防止重复记录
      await this.prisma.contributionRecord.upsert({
        where: {
          userId_sourceType_sourceId_action: {
            userId: helperId,
            sourceType: 'event',
            sourceId: event.id,
            action,
          },
        },
        update: {},
        create: {
          userId: helperId,
          communityId: event.communityId,
          sourceType: 'event',
          sourceId: event.id,
          action,
          score: flowerCount,
          flowerCount,
          reason: `完成事件: ${event.type}`,
          occurredAt: new Date(),
        },
      });
    }

    // 2. Creator contribution record (Standard M10.5 + P-16: 按类型区分)
    // P-16: 即使 flowerCount=0 也创建贡献记录，确保创建者参与徽章统计
    const creatorFlowers = this.getCreatorFlowerCount(event.type);
    // P-276: 使用 upsert 防止重复记录
    await this.prisma.contributionRecord.upsert({
      where: {
        userId_sourceType_sourceId_action: {
          userId: event.creatorId,
          sourceType: 'event',
          sourceId: event.id,
          action,
        },
      },
      update: {},
      create: {
        userId: event.creatorId,
        communityId: event.communityId,
        sourceType: 'event',
        sourceId: event.id,
        action,
        score: creatorFlowers,
        flowerCount: creatorFlowers,
        reason: `发起事件: ${event.type}`,
        occurredAt: new Date(),
      },
    });

    // 3. Check and award badges
    if (helperId) {
      await this.checkAndAwardBadges(helperId, event.communityId, 'event', event.id);
    }
    if (creatorFlowers > 0) {
      await this.checkAndAwardBadges(event.creatorId, event.communityId, 'event', event.id);
    }

    // 4. Recalculate rankings for this community
    await this.recalculateRankings(event.communityId);

    // 5. Create notifications (互助类完成 → type='completion')
    if (helperId) {
      await this.prisma.notification.create({
        data: {
          userId: helperId,
          communityId: event.communityId,
          type: 'completion',
          title: '事件已完成',
          content: '您参与的事件已确认完成，获得小红花奖励！',
          targetType: 'event',
          targetId: event.id,
        },
      });
    }

    await this.prisma.notification.create({
      data: {
        userId: event.creatorId,
        communityId: event.communityId,
        type: 'completion',
        title: '事件已完成',
        content: '您发布的事件已确认完成，感谢您使用互帮互助！',
        targetType: 'event',
        targetId: event.id,
      },
    });
  }

  /**
   * 议事类事件审核通过时触发 (Map.md §3.4: pending_review → open 即发激励)
   * 创建者得 1 朵花 (action='feedback') + type='feedback' 通知
   */
  async handleEventApproved(event: {
    id: string;
    communityId: string;
    creatorId: string;
    type: string;
  }) {
    const flowerCount = 1;

    // 1. Creator contribution record
    // P-276: 使用 upsert 防止重复记录
    await this.prisma.contributionRecord.upsert({
      where: {
        userId_sourceType_sourceId_action: {
          userId: event.creatorId,
          sourceType: 'event',
          sourceId: event.id,
          action: 'feedback',
        },
      },
      update: {},
      create: {
        userId: event.creatorId,
        communityId: event.communityId,
        sourceType: 'event',
        sourceId: event.id,
        action: 'feedback',
        score: flowerCount,
        flowerCount,
        reason: `发起事件: ${event.type}`,
        occurredAt: new Date(),
      },
    });

    // 2. Check and award badges
    await this.checkAndAwardBadges(event.creatorId, event.communityId, 'event', event.id);

    // 3. Recalculate rankings
    await this.recalculateRankings(event.communityId);

    // 4. Create notification (议事类 → type='feedback')
    await this.prisma.notification.create({
      data: {
        userId: event.creatorId,
        communityId: event.communityId,
        type: 'feedback',
        title: '议事已发布',
        content: '您发起的议事已审核通过，感谢参与社区建设！',
        targetType: 'event',
        targetId: event.id,
      },
    });
  }

  /**
   * 议题审核通过发 1 朵小红花（Standard M6.2）
   */
  async handleTopicApproved(topic: {
    id: string;
    communityId: string;
    createdBy: string;
    aiReviewStatus: string;
  }) {
    if (topic.aiReviewStatus !== 'pass') return;

    const flowerCount = 1;
    // P-276: 使用 upsert 防止重复记录
    await this.prisma.contributionRecord.upsert({
      where: {
        userId_sourceType_sourceId_action: {
          userId: topic.createdBy,
          sourceType: 'topic',
          sourceId: topic.id,
          action: 'topic',
        },
      },
      update: {},
      create: {
        userId: topic.createdBy,
        communityId: topic.communityId,
        sourceType: 'topic',
        sourceId: topic.id,
        action: 'topic',
        score: flowerCount,
        flowerCount,
        reason: '议题审核通过',
        occurredAt: new Date(),
      },
    });

    await this.checkAndAwardBadges(topic.createdBy, topic.communityId, 'topic', topic.id);
    await this.recalculateRankings(topic.communityId);

    await this.prisma.notification.create({
      data: {
        userId: topic.createdBy,
        communityId: topic.communityId,
        type: 'review_result',
        title: '议题审核通过',
        content: '您创建的议题已审核通过，获得 1 朵小红花！',
        targetType: 'topic',
        targetId: topic.id,
      },
    });
  }

  private getEventAction(eventType: string, rewardType: string): string {
    switch (eventType) {
      case 'help_request':
        return rewardType === 'free' || rewardType === 'none' ? 'help_free' : 'help_paid';
      // @deprecated help_offer 已废弃，仅兼容历史数据
      case 'help_offer':
        return 'help_free';
      case 'public_welfare':
        return 'public_welfare';
      case 'lost_found':
        return 'lost_found';
      case 'public_feedback':
      case 'discussion':
        return 'feedback';
      default:
        return 'help_free';
    }
  }

  private getFlowerCount(action: string): number {
    const flowerMap: Record<string, number> = {
      help_free: 1,
      help_paid: 1,
      public_welfare: 5,
      lost_found: 2,
      feedback: 1,
    };
    return flowerMap[action] ?? 1;
  }

  /**
   * Standard M10.5: 互助类 public_welfare 创建者 5 朵
   * 议事类创建者 1 朵走 handleEventApproved，不经过此方法
   */
  private getCreatorFlowerCount(eventType: string): number {
    switch (eventType) {
      case 'public_welfare':
        return 5;
      // @deprecated help_offer 已废弃，仅兼容历史数据
      case 'help_offer':
        // P-16: help_offer 创建者就是帮手，发花
        return 1;
      default:
        // help_request/lost_found: 只记贡献，不发花
        return 0;
    }
  }

  private async checkAndAwardBadges(
    userId: string,
    communityId: string,
    sourceType: string,
    sourceId: string,
  ) {
    // Count contributions by action category (Standard M10.6)
    const baseWhere = { userId, communityId, status: 'valid' as const };

    const [helpCount, feedbackCount, topicCount, flowerResult] = await Promise.all([
      // helper 徽章只算帮手贡献 (reason='完成事件')，不算创建者贡献 (reason='发起事件')
      this.prisma.contributionRecord.count({
        where: {
          ...baseWhere,
          action: { in: ['help_free', 'help_paid', 'public_welfare', 'lost_found'] },
          reason: { startsWith: '完成事件' },
        },
      }),
      this.prisma.contributionRecord.count({
        where: { ...baseWhere, action: 'feedback' },
      }),
      this.prisma.contributionRecord.count({
        where: { ...baseWhere, action: 'topic' },
      }),
      this.prisma.contributionRecord.aggregate({
        where: baseWhere,
        _sum: { flowerCount: true },
      }),
    ]);
    const totalFlowers = flowerResult._sum.flowerCount ?? 0;

    // Define badge rules per Standard M10.6
    const badgeRules = [
      // 互助类
      {
        code: 'helper_1',
        countType: 'help' as const,
        minCount: 1,
        name: '初来乍到',
        description: '完成第一次互助',
      },
      {
        code: 'helper_5',
        countType: 'help' as const,
        minCount: 5,
        name: '热心邻居',
        description: '完成5次互助',
      },
      {
        code: 'helper_20',
        countType: 'help' as const,
        minCount: 20,
        name: '互助达人',
        description: '完成20次互助',
      },
      // 议事类
      {
        code: 'feedback_5',
        countType: 'feedback' as const,
        minCount: 5,
        name: '议事参与者',
        description: '参与5次议事',
      },
      {
        code: 'feedback_20',
        countType: 'feedback' as const,
        minCount: 20,
        name: '议事达人',
        description: '参与20次议事',
      },
      // 议题类
      {
        code: 'topic_1',
        countType: 'topic' as const,
        minCount: 1,
        name: '议题提出者',
        description: '提出1个议题',
      },
      {
        code: 'topic_5',
        countType: 'topic' as const,
        minCount: 5,
        name: '议题达人',
        description: '提出5个议题',
      },
      // 小花类
      {
        code: 'flower_10',
        countType: 'flower' as const,
        minCount: 10,
        name: '花开满园',
        description: '累计获得10朵小红花',
      },
      {
        code: 'flower_50',
        countType: 'flower' as const,
        minCount: 50,
        name: '花团锦簇',
        description: '累计获得50朵小红花',
      },
    ];

    const countMap: Record<string, number> = {
      help: helpCount,
      feedback: feedbackCount,
      topic: topicCount,
      flower: totalFlowers,
    };

    for (const rule of badgeRules) {
      if (countMap[rule.countType] >= rule.minCount) {
        // Check if badge exists and user doesn't already have it
        const badge = await this.prisma.badge.findUnique({
          where: { code: rule.code },
        });

        if (badge) {
          const existing = await this.prisma.userBadge.findFirst({
            where: { userId, communityId, badgeId: badge.id },
          });

          if (!existing) {
            await this.prisma.userBadge.create({
              data: {
                userId,
                communityId,
                badgeId: badge.id,
                sourceType,
                sourceId,
              },
            });

            // Notify user about badge
            await this.prisma.notification.create({
              data: {
                userId,
                communityId,
                type: 'badge',
                title: '获得新徽章',
                content: `恭喜您获得「${rule.name}」徽章！`,
                targetType: 'badge',
                targetId: badge.id,
              },
            });
          }
        }
      }
    }
  }

  async recalculateRankings(communityId: string) {
    // Get current month key and bounds
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Aggregate scores: monthly (with occurredAt filter) and total (no filter)
    const [totalScores, monthlyScores] = await Promise.all([
      this.prisma.contributionRecord.groupBy({
        by: ['userId'],
        where: { communityId, status: 'valid' },
        _sum: { flowerCount: true, score: true },
        _count: { id: true },
      }),
      this.prisma.contributionRecord.groupBy({
        by: ['userId'],
        where: {
          communityId,
          status: 'valid',
          occurredAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { flowerCount: true, score: true },
        _count: { id: true },
      }),
    ]);

    // Also count badges per user
    const userBadgeCounts = await this.prisma.userBadge.groupBy({
      by: ['userId'],
      where: { communityId },
      _count: { id: true },
    });

    const badgeCountMap = new Map(userBadgeCounts.map((ub) => [ub.userId, ub._count.id]));

    // Calculate and upsert monthly ranking snapshots
    const monthlyEntries = monthlyScores
      .sort((a, b) => (b._sum.score ?? 0) - (a._sum.score ?? 0))
      .map((entry, index) => ({
        communityId,
        periodType: 'month',
        periodKey: monthKey,
        userId: entry.userId,
        rankNo: index + 1,
        score: entry._sum.score ?? 0,
        flowerCount: entry._sum.flowerCount ?? 0,
        helpCount: entry._count.id,
        badgeCount: badgeCountMap.get(entry.userId) ?? 0,
      }));

    // P-23: 用事务包裹 deleteMany + createMany，防止中间出错数据丢失
    await this.prisma.$transaction([
      this.prisma.rankingSnapshot.deleteMany({
        where: { communityId, periodType: 'month', periodKey: monthKey },
      }),
      ...(monthlyEntries.length > 0
        ? [this.prisma.rankingSnapshot.createMany({ data: monthlyEntries })]
        : []),
    ]);

    // Calculate and upsert total ranking snapshots
    const totalEntries = totalScores
      .sort((a, b) => (b._sum.score ?? 0) - (a._sum.score ?? 0))
      .map((entry, index) => ({
        communityId,
        periodType: 'total',
        periodKey: 'total',
        userId: entry.userId,
        rankNo: index + 1,
        score: entry._sum.score ?? 0,
        flowerCount: entry._sum.flowerCount ?? 0,
        helpCount: entry._count.id,
        badgeCount: badgeCountMap.get(entry.userId) ?? 0,
      }));

    await this.prisma.$transaction([
      this.prisma.rankingSnapshot.deleteMany({
        where: { communityId, periodType: 'total', periodKey: 'total' },
      }),
      ...(totalEntries.length > 0
        ? [this.prisma.rankingSnapshot.createMany({ data: totalEntries })]
        : []),
    ]);
  }

  async list(
    communityId: string,
    query?: { periodType?: string; periodKey?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId };
    // P-270: 默认过滤 periodType，避免 month 和 total 混合
    where.periodType = query?.periodType ?? 'month';
    if (query?.periodKey) where.periodKey = query.periodKey;

    return this.prisma.rankingSnapshot.findMany({
      where,
      orderBy: [{ periodType: 'asc' }, { periodKey: 'desc' }, { rankNo: 'asc' }],
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async count(communityId: string, query?: { periodType?: string; periodKey?: string }) {
    const where: any = { communityId };
    if (query?.periodType) where.periodType = query.periodType;
    if (query?.periodKey) where.periodKey = query.periodKey;
    return this.prisma.rankingSnapshot.count({ where });
  }

  async getMyRanking(userId: string, communityId: string, periodType?: string, periodKey?: string) {
    const where: any = { userId, communityId };
    if (periodType) where.periodType = periodType;
    if (periodKey) where.periodKey = periodKey;

    const snapshot = await this.prisma.rankingSnapshot.findFirst({
      where,
      orderBy: [{ periodKey: 'desc' }],
    });

    // P-271: 未上榜时返回默认对象而非 null，避免前端额外空值判断
    if (!snapshot) {
      return {
        userId,
        communityId,
        periodType: periodType ?? 'month',
        periodKey: periodKey ?? '',
        rankNo: null,
        score: 0,
        flowerCount: 0,
        helpCount: 0,
        badgeCount: 0,
      };
    }

    return snapshot;
  }

  async getBadges() {
    // P-272: 排除 deleted 勋章，保留 draft 等非 deleted 状态
    return this.prisma.badge.findMany({
      where: { status: { not: 'deleted' }, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        iconUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getMyBadges(userId: string, communityId?: string) {
    const where: any = { userId };
    if (communityId) where.communityId = communityId;

    const badges = await this.prisma.userBadge.findMany({
      where,
      include: {
        badge: {
          select: { id: true, code: true, name: true, description: true, iconUrl: true },
        },
      },
      orderBy: { awardedAt: 'desc' },
    });

    // 获取贡献记录（送花记录）
    const contributionWhere: any = { userId };
    if (communityId) contributionWhere.communityId = communityId;

    const contributions = await this.prisma.contributionRecord.findMany({
      where: contributionWhere,
      select: {
        id: true,
        sourceType: true,
        action: true,
        score: true,
        flowerCount: true,
        reason: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    return { badges, contributions };
  }
}
