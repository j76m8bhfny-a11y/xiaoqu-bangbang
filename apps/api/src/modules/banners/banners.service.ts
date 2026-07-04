import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async list(communityId?: string, position?: string) {
    const now = new Date();

    const where: any = {
      status: 'published',
      deletedAt: null,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      // P-287: 过滤已过期的 banner
      AND: [
        {
          OR: [{ endAt: null }, { endAt: { gte: now } }],
        },
      ],
    };

    // P-289: 按位置筛选
    if (position) {
      where.position = position;
    }

    // If communityId is provided, show community-specific + global banners
    if (communityId) {
      where.communityId = { in: [communityId, null] };
    } else {
      where.communityId = null;
    }

    return this.prisma.banner.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        communityId: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        linkType: true,
        linkId: true,
        linkUrl: true,
        position: true,
        sortOrder: true,
        startAt: true,
        endAt: true,
      },
    });
  }
}
