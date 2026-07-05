import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async list(query?: { city?: string; keyword?: string }) {
    const where: any = { status: 'active', deletedAt: null };
    if (query?.city) where.city = { contains: query.city };
    if (query?.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { address: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const communities = await this.prisma.community.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: { where: { deletedAt: null } } } } },
    });
    return communities.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      district: c.district,
      address: c.address,
      status: c.status,
      memberCount: c._count.members,
    }));
  }

  async select(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community || community.status !== 'active') {
      throw new NotFoundException('小区不存在');
    }

    // P-211: create + update 放入事务
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (!existing) {
        await tx.communityMember.create({
          data: { userId, communityId, role: 'resident', verifyStatus: 'unverified' },
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { currentCommunityId: communityId },
      });
    });

    return { currentCommunityId: communityId, communityName: community.name };
  }

  async getMemberVerifyStatus(userId: string, communityId: string) {
    return this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { verifyStatus: true },
    });
  }

  async getSocialGroups(communityId: string, userVerifyStatus: string) {
    const where: any = {
      communityId,
      status: 'active',
    };

    // 未认证用户只能看到 public 的社群入口
    if (userVerifyStatus !== 'verified') {
      where.visibleTo = 'public';
    }

    return this.prisma.communitySocialGroup.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        qrImageUrl: true,
        contactText: true,
        visibleTo: true,
      },
    });
  }
}
