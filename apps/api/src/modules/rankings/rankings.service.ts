import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RankingsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * Handle full contribution flow after event completion:
   * 1. Create contribution record with flowers for the helper
   * 2. Check and award badges
   * 3. Recalculate rankings
   * 4. Create notifications for both parties
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
    if (!helperId) return;

    // 1. Determine contribution action and flower count
    const action = this.getEventAction(event.type, event.rewardType);
    const flowerCount = this.getFlowerCount(action);

    // Create contribution record for helper
    await this.prisma.contributionRecord.create({
      data: {
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

    // 2. Check and award badges for both creator and helper
    await this.checkAndAwardBadges(helperId, event.communityId, 'event', event.id);
    await this.checkAndAwardBadges(event.creatorId, event.communityId, 'event', event.id);

    // 3. Recalculate rankings for this community
    await this.recalculateRankings(event.communityId);

    // 4. Create notifications for both parties
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

  private getEventAction(eventType: string, rewardType: string): string {
    switch (eventType) {
      case 'help_request':
        return rewardType === 'free' || rewardType === 'none' ? 'help_free' : 'help_paid';
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
      help_free: 3,
      help_paid: 1,
      public_welfare: 5,
      lost_found: 2,
      feedback: 1,
    };
    return flowerMap[action] ?? 1;
  }

  private async checkAndAwardBadges(
    userId: string,
    communityId: string,
    sourceType: string,
    sourceId: string,
  ) {
    // Count total contributions for this user in this community
    const contributionCount = await this.prisma.contributionRecord.count({
      where: {
        userId,
        communityId,
        status: 'valid',
      },
    });

    // Get total flowers
    const flowerResult = await this.prisma.contributionRecord.aggregate({
      where: { userId, communityId, status: 'valid' },
      _sum: { flowerCount: true },
    });
    const totalFlowers = flowerResult._sum.flowerCount ?? 0;

    // Define badge rules: code -> min flowers/contributions
    const badgeRules = [
      {
        code: 'helper_1',
        minContributions: 1,
        minFlowers: 0,
        name: '初来乍到',
        description: '完成第一次互助',
      },
      {
        code: 'helper_5',
        minContributions: 5,
        minFlowers: 0,
        name: '热心邻居',
        description: '完成5次互助',
      },
      {
        code: 'helper_20',
        minContributions: 20,
        minFlowers: 0,
        name: '互助达人',
        description: '完成20次互助',
      },
      {
        code: 'flower_10',
        minContributions: 0,
        minFlowers: 10,
        name: '花开满园',
        description: '累计获得10朵小红花',
      },
      {
        code: 'flower_50',
        minContributions: 0,
        minFlowers: 50,
        name: '花团锦簇',
        description: '累计获得50朵小红花',
      },
    ];

    for (const rule of badgeRules) {
      if (contributionCount >= rule.minContributions && totalFlowers >= rule.minFlowers) {
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

  private async recalculateRankings(communityId: string) {
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

    // Delete existing monthly snapshots and recreate
    await this.prisma.rankingSnapshot.deleteMany({
      where: { communityId, periodType: 'month', periodKey: monthKey },
    });

    if (monthlyEntries.length > 0) {
      await this.prisma.rankingSnapshot.createMany({ data: monthlyEntries });
    }

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

    await this.prisma.rankingSnapshot.deleteMany({
      where: { communityId, periodType: 'total', periodKey: 'total' },
    });

    if (totalEntries.length > 0) {
      await this.prisma.rankingSnapshot.createMany({ data: totalEntries });
    }
  }

  async list(
    communityId: string,
    query?: { periodType?: string; periodKey?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId };
    if (query?.periodType) where.periodType = query.periodType;
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

    return snapshot;
  }

  async getBadges() {
    return this.prisma.badge.findMany({
      where: { status: 'active', deletedAt: null },
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
