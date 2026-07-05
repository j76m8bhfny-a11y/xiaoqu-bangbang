import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async wechatLogin(code: string, phoneCode?: string) {
    // 首版 mock：用 code 作为 openid 标识
    const openid = `mock_openid_${code}`;
    let user = await this.prisma.user.findUnique({ where: { openid } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: `邻居${Date.now().toString().slice(-6)}`,
          avatarUrl: '',
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, openid: user.openid });
    // 复用 getMe 组装完整 user（含 verifyStatus / currentCommunityName / roles），
    // 否则前端拿到的 user 缺 verifyStatus 字段，永远显示未认证。
    const userDto = await this.getMe(user.id);
    return { token, user: { ...userDto, openid: user.openid } };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        status: true,
        currentCommunityId: true,
        currentCommunity: { select: { id: true, name: true } },
        communityMembers: {
          select: {
            communityId: true,
            role: true,
            verifyStatus: true,
          },
        },
      },
    });

    // P-204: 用户不存在时抛 401 而非返回 null，避免前端拿到 data:null 歧义
    if (!user) throw new UnauthorizedException('用户不存在');

    const currentCommunity = user.currentCommunity;
    const currentMember = user.currentCommunityId
      ? user.communityMembers.find((m) => m.communityId === user.currentCommunityId)
      : null;

    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status,
      currentCommunityId: user.currentCommunityId,
      currentCommunityName: currentCommunity?.name ?? null,
      verifyStatus: currentMember?.verifyStatus ?? 'unverified',
      roles: currentMember ? [currentMember.role as any] : [],
    };
  }

  async updateMe(userId: string, data: { nickname?: string; avatarUrl?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nickname: true, avatarUrl: true, bio: true },
    });
  }

  /**
   * 用户公开个人主页：基础信息 + 当前小区下的认证状态/贡献/徽章。
   * 隐私：不返回手机号/openid/status；徽章上限 6 个；统计取 ranking_snapshots 已有快照，
   * 没快照视为 0（rankings 模块有定期任务回填）。
   */
  async getUserProfile(viewerId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!target) return null;

    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { currentCommunityId: true },
    });
    const communityId = viewer?.currentCommunityId ?? null;

    let verifyStatus: 'verified' | 'unverified' | null = null;
    let communityName: string | null = null;
    let helpCount = 0;
    let flowerCount = 0;
    let badgeCount = 0;
    let contributionScore = 0;
    let badges: { id: string; code: string; name: string; iconUrl: string | null }[] = [];

    if (communityId) {
      const [member, snapshot, userBadges] = await Promise.all([
        this.prisma.communityMember.findUnique({
          where: { userId_communityId: { userId: targetUserId, communityId } },
          select: { verifyStatus: true, community: { select: { name: true } } },
        }),
        this.prisma.rankingSnapshot.findFirst({
          where: { userId: targetUserId, communityId, periodType: 'total' },
          orderBy: { periodKey: 'desc' },
        }),
        this.prisma.userBadge.findMany({
          where: { userId: targetUserId, communityId },
          include: {
            badge: { select: { id: true, code: true, name: true, iconUrl: true } },
          },
          orderBy: { awardedAt: 'desc' },
          take: 6,
        }),
      ]);

      if (member) {
        verifyStatus = member.verifyStatus === 'verified' ? 'verified' : 'unverified';
        communityName = member.community?.name ?? null;
      }
      // 注意：target 不在 viewer 当前小区时 verifyStatus 保持 null，
      // 前端按 null 不显示「未认证」tag，避免误导。
      if (snapshot) {
        helpCount = snapshot.helpCount;
        flowerCount = snapshot.flowerCount;
        badgeCount = snapshot.badgeCount;
        contributionScore = snapshot.score;
      }
      badges = userBadges.map((ub) => ub.badge);
    }

    return {
      id: target.id,
      nickname: target.nickname,
      avatarUrl: target.avatarUrl,
      bio: target.bio,
      joinedAt: target.createdAt.toISOString(),
      verifyStatus,
      communityName,
      helpCount,
      flowerCount,
      badgeCount,
      contributionScore,
      badges,
    };
  }

  // ponytail: home tab 极简看板。只取首屏要展示的几个数字 + 待我参与的投票列表。
  // 没选小区时直接返回零值，避免前端再特判。
  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentCommunityId: true },
    });
    const communityId = user?.currentCommunityId ?? null;

    const empty = {
      communityId: null as string | null,
      unreadNotificationCount: 0,
      contributionScore: 0,
      badgeCount: 0,
      myActiveEventCount: 0,
      myActiveMarketCount: 0,
      pendingVotes: [] as Array<{ id: string; title: string; endAt: string }>,
    };

    if (!communityId) {
      // 未选小区：仍展示全局未读通知数
      const unread = await this.prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      });
      return { ...empty, unreadNotificationCount: unread };
    }

    const now = new Date();
    const [
      unreadNotificationCount,
      contributionAgg,
      badgeCount,
      myActiveEventCount,
      myActiveMarketCount,
      activeVotes,
      myVotedIds,
    ] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      }),
      this.prisma.contributionRecord.aggregate({
        where: { userId, communityId, status: 'valid', deletedAt: null },
        _sum: { score: true },
      }),
      this.prisma.userBadge.count({
        where: { userId, communityId },
      }),
      this.prisma.event.count({
        // P-207: 活跃事件应含 open/in_progress/processing 三种状态
        where: {
          creatorId: userId,
          communityId,
          status: { in: ['open', 'in_progress', 'processing'] },
          deletedAt: null,
        },
      }),
      this.prisma.marketItem.count({
        where: { sellerId: userId, communityId, status: 'on_sale', deletedAt: null },
      }),
      this.prisma.vote.findMany({
        where: {
          communityId,
          status: 'published',
          startAt: { lte: now },
          endAt: { gt: now },
          deletedAt: null,
        },
        orderBy: { endAt: 'asc' },
        take: 10,
        select: { id: true, title: true, endAt: true },
      }),
      this.prisma.voteRecord.findMany({
        where: { userId, communityId },
        select: { voteId: true },
      }),
    ]);

    const votedSet = new Set(myVotedIds.map((r) => r.voteId));
    const pendingVotes = activeVotes
      .filter((v) => !votedSet.has(v.id))
      .slice(0, 5)
      .map((v) => ({ id: v.id, title: v.title, endAt: v.endAt.toISOString() }));

    return {
      communityId,
      unreadNotificationCount,
      contributionScore: contributionAgg._sum.score ?? 0,
      badgeCount,
      myActiveEventCount,
      myActiveMarketCount,
      pendingVotes,
    };
  }
}
