import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommitteeService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getOverview(communityId: string) {
    const [memberCount, announcementCount] = await Promise.all([
      this.prisma.committeeMember.count({
        where: { communityId, status: 'active', deletedAt: null },
      }),
      this.prisma.committeeAnnouncement.count({
        where: { communityId, status: 'published', deletedAt: null },
      }),
    ]);

    const latestAnnouncement = await this.prisma.committeeAnnouncement.findFirst({
      where: { communityId, status: 'published', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, title: true, publishedAt: true },
    });

    return {
      memberCount,
      announcementCount,
      latestAnnouncement,
    };
  }

  async getMembers(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.committeeMember.findMany({
      where: { communityId, status: 'active', deletedAt: null },
      select: {
        id: true,
        name: true,
        position: true,
        avatarUrl: true,
        responsibility: true,
        termStart: true,
        termEnd: true,
        claimStatus: true,
      },
      orderBy: { createdAt: 'asc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countMembers(communityId: string) {
    return this.prisma.committeeMember.count({
      where: { communityId, status: 'active', deletedAt: null },
    });
  }

  async getMemberDetail(id: string, communityId: string) {
    const member = await this.prisma.committeeMember.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        claims: {
          where: { deletedAt: null },
          select: {
            id: true,
            userId: true,
            statement: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('业委会成员不存在');
    }

    return member;
  }

  async claimMembership(
    userId: string,
    memberId: string,
    dto: { statement: string; materialUrls?: string[] },
  ) {
    const member = await this.prisma.committeeMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.deletedAt) {
      throw new NotFoundException('业委会成员不存在');
    }

    if (member.status !== 'active') {
      throw new NotFoundException('业委会成员不存在');
    }

    if (member.claimStatus === 'claimed') {
      throw new NotFoundException('该成员已被认领');
    }

    // 检查是否已提交过认领申请
    const existingClaim = await this.prisma.committeeMemberClaim.findUnique({
      where: { committeeMemberId_userId: { committeeMemberId: memberId, userId } },
    });
    if (existingClaim) {
      throw new NotFoundException('您已提交过认领申请');
    }

    const claim = await this.prisma.committeeMemberClaim.create({
      data: {
        committeeMemberId: memberId,
        userId,
        communityId: member.communityId,
        statement: dto.statement,
        materialUrls: (dto.materialUrls ?? []) as any,
      },
    });

    return {
      id: claim.id,
      status: claim.status,
      createdAt: claim.createdAt,
    };
  }

  async getMyClaims(userId: string) {
    return this.prisma.committeeMemberClaim.findMany({
      where: { userId, deletedAt: null },
      include: {
        committeeMember: {
          select: { id: true, name: true, position: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAnnouncements(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.committeeAnnouncement.findMany({
      where: { communityId, status: 'published', deletedAt: null },
      select: {
        id: true,
        title: true,
        isPinned: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countAnnouncements(communityId: string) {
    return this.prisma.committeeAnnouncement.count({
      where: { communityId, status: 'published', deletedAt: null },
    });
  }

  async getAnnouncementDetail(id: string, communityId: string, viewerUserId?: string) {
    const announcement = await this.prisma.committeeAnnouncement.findFirst({
      where: { id, communityId, status: 'published', deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    // 当前浏览者是否已点赞
    let isLiked = false;
    if (viewerUserId) {
      const like = await this.prisma.announcementLike.findUnique({
        where: { announcementId_userId: { announcementId: id, userId: viewerUserId } },
      });
      isLiked = !!like;
    }

    return { ...announcement, isLiked };
  }

  async toggleAnnouncementLike(userId: string, announcementId: string, communityId: string) {
    const announcement = await this.prisma.committeeAnnouncement.findFirst({
      where: { id: announcementId, communityId, deletedAt: null },
    });
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    const existing = await this.prisma.announcementLike.findUnique({
      where: { announcementId_userId: { announcementId, userId } },
    });

    if (existing) {
      await this.prisma.announcementLike.delete({ where: { id: existing.id } });
      const updated = await this.prisma.committeeAnnouncement.update({
        where: { id: announcementId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false, likeCount: updated.likeCount };
    }

    await this.prisma.announcementLike.create({ data: { announcementId, userId } });
    const updated = await this.prisma.committeeAnnouncement.update({
      where: { id: announcementId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true, likeCount: updated.likeCount };
  }
}
