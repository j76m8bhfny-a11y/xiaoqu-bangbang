import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, communityId: string) {
    // 并发查 events + group_buys
    const [events, groupBuys] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          communityId,
          type: { in: ['help_request', 'public_welfare', 'pet_help'] },
          status: { in: ['open', 'in_progress', 'processing', 'completed'] },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize * page, // 取前 N 条用于合并
        select: {
          id: true,
          type: true,
          subType: true,
          title: true,
          description: true,
          status: true,
          likeCount: true,
          commentCount: true,
          _count: { select: { applications: true } },
          createdAt: true,
        },
      }),
      this.prisma.groupBuy.findMany({
        where: {
          communityId,
          status: { in: ['open', 'closed_for_bid', 'purchased', 'completed'] },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize * page,
        select: {
          id: true,
          type: true,
          location: true,
          departAt: true,
          quota: true,
          status: true,
          items: { select: { id: true, status: true } },
          createdAt: true,
        },
      }),
    ]);

    // 映射成 FeedItemDto
    const eventItems = events.map((e) => ({
      id: e.id,
      sourceType: 'event' as const,
      type: e.type,
      subType: e.subType,
      title: e.title,
      subtitle: e.description.slice(0, 50),
      status: e.status,
      stats: {
        likeCount: e.likeCount,
        commentCount: e.commentCount,
        responseCount: e._count.applications,
      },
      createdAt: e.createdAt,
    }));
    const gbItems = groupBuys.map((g) => ({
      id: g.id,
      sourceType: 'group_buy' as const,
      type: g.type,
      subType: null,
      title:
        g.type === 'offer'
          ? `${g.location} ${g.departAt?.toISOString() ?? ''}`
          : `拼单-${g.location}`,
      subtitle:
        g.type === 'offer'
          ? `剩余 ${g.quota - g.items.filter((i) => i.status !== 'rejected').length}/${g.quota} 名额`
          : `${g.items.length} 件商品`,
      status: g.status,
      stats: { responseCount: g.items.filter((i) => i.status !== 'rejected').length },
      createdAt: g.createdAt,
    }));

    // 合并 + 排序 + 分页
    // ponytail: 内存合并分页在 page>3 时性能下降。当前小区数据量小（<1000 条），YAGNI。
    // 升级路径：后续改用 Postgres UNION ALL 跨表查询。
    const merged = [...eventItems, ...gbItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const start = (page - 1) * pageSize;
    return {
      items: merged.slice(start, start + pageSize),
      total: merged.length,
      page,
      pageSize,
    };
  }
}
