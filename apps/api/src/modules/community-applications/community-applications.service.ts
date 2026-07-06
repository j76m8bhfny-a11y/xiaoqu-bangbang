import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommunityApplicationDto } from './dto/create-application.dto';

@Injectable()
export class CommunityApplicationsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommunityApplicationDto) {
    const existingPending = await this.prisma.communityApplication.findFirst({
      where: { applicantId: userId, status: 'pending' },
    });
    if (existingPending) {
      throw new ConflictException('您已有一个待审核的小区申请');
    }
    const created = await this.prisma.communityApplication.create({
      data: { ...dto, applicantId: userId },
      include: {
        applicant: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    return this.toPublicDto(created, false);
  }

  async list(
    query: { status?: string; city?: string; keyword?: string },
    pagination: { skip: number; take: number },
    viewerId?: string,
  ) {
    const where: any = {};
    if (query.status) where.status = query.status;
    else where.status = 'pending'; // 默认只看进行中的
    if (query.city) where.city = { contains: query.city };
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { address: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.communityApplication.findMany({
        where,
        orderBy: [{ supportCount: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
        include: {
          applicant: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.communityApplication.count({ where }),
    ]);

    // 查询当前用户对这些申请的助力状态
    let supportedIds = new Set<string>();
    if (viewerId && items.length > 0) {
      const supports = await this.prisma.communityApplicationSupport.findMany({
        where: { userId: viewerId, applicationId: { in: items.map((i) => i.id) } },
        select: { applicationId: true },
      });
      supportedIds = new Set(supports.map((s) => s.applicationId));
    }
    return {
      items: items.map((i) => this.toPublicDto(i, supportedIds.has(i.id))),
      total,
    };
  }

  async listMine(userId: string) {
    const items = await this.prisma.communityApplication.findMany({
      where: { applicantId: userId },
      orderBy: { createdAt: 'desc' },
      include: { applicant: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return items.map((i) => this.toPublicDto(i, false));
  }

  async listSupported(userId: string) {
    const supports = await this.prisma.communityApplicationSupport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: { applicant: { select: { id: true, nickname: true, avatarUrl: true } } },
        },
      },
    });
    return supports.map((s) => this.toPublicDto(s.application, true));
  }

  async detail(id: string, viewerId?: string) {
    const item = await this.prisma.communityApplication.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    if (!item) throw new NotFoundException('申请不存在');

    // 最近 20 位助力人
    const recent = await this.prisma.communityApplicationSupport.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    let hasSupported = false;
    if (viewerId) {
      const s = await this.prisma.communityApplicationSupport.findUnique({
        where: { applicationId_userId: { applicationId: id, userId: viewerId } },
      });
      hasSupported = !!s;
    }

    return {
      ...this.toPublicDto(item, hasSupported),
      recentSupporters: recent.map((r) => ({
        userId: r.userId,
        nickname: r.user.nickname,
        avatarUrl: r.user.avatarUrl,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async support(applicationId: string, userId: string) {
    const app = await this.prisma.communityApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'pending') {
      throw new BadRequestException('该申请已结束，无法助力');
    }
    if (app.applicantId === userId) {
      throw new BadRequestException('不能给自己的申请助力');
    }
    try {
      await this.prisma.$transaction([
        this.prisma.communityApplicationSupport.create({
          data: { applicationId, userId },
        }),
        this.prisma.communityApplication.update({
          where: { id: applicationId },
          data: { supportCount: { increment: 1 } },
        }),
      ]);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('您已助力过');
      }
      throw e;
    }
    return { ok: true };
  }

  private toPublicDto(item: any, hasSupported: boolean) {
    return {
      id: item.id,
      applicantId: item.applicantId,
      applicantNickname: item.applicant?.nickname,
      applicantAvatarUrl: item.applicant?.avatarUrl,
      name: item.name,
      city: item.city,
      district: item.district,
      address: item.address,
      estimatedHouseholds: item.estimatedHouseholds ?? undefined,
      reason: item.reason ?? undefined,
      status: item.status,
      rejectReason: item.rejectReason ?? undefined,
      supportCount: item.supportCount,
      hasSupported,
      approvedCommunityId: item.approvedCommunityId ?? undefined,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
