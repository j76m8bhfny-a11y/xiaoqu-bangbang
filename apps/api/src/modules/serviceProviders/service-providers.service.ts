import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceProvidersService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async list(communityId: string, query?: { category?: string }) {
    const where: any = {
      communityId,
      status: 'published',
      deletedAt: null,
    };

    if (query?.category) {
      where.category = query.category;
    }

    return this.prisma.serviceProvider.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        coverUrl: true,
        description: true,
        contactText: true,
        serviceArea: true,
        recommendationSource: true,
        verifyStatus: true,
        sortOrder: true,
      },
    });
  }

  async findOne(id: string, communityId: string) {
    const provider = await this.prisma.serviceProvider.findFirst({
      where: {
        id,
        communityId,
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        coverUrl: true,
        description: true,
        contactText: true,
        serviceArea: true,
        recommendationSource: true,
        verifyStatus: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('服务商不存在');
    }

    return provider;
  }
}
