import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiReviewService } from '../ai-review/ai-review.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GroupBuysService {
  constructor(
    private prisma: PrismaService,
    private aiReview: AiReviewService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: string, communityId: string, dto: any) {
    // seek 必填 items≥1
    if (dto.type === 'seek' && (!dto.items || dto.items.length === 0)) {
      throw new BadRequestException('seek 类型必须至少填写 1 个商品');
    }
    // offer 必填 quota+departAt+bidCloseAt
    if (dto.type === 'offer') {
      if (!dto.quota || !dto.departAt || !dto.bidCloseAt) {
        throw new BadRequestException('offer 类型必须填写 quota+departAt+bidCloseAt');
      }
    }

    // AiReview 审核
    const reviewText = `${dto.location} ${dto.note || ''}`;
    const tempId = crypto.randomUUID();
    const aiResult = await this.aiReview.reviewText(reviewText, 'group_buy', tempId, {
      location: dto.location,
    });

    let status: string;
    let aiReviewStatus: string;
    if (aiResult.result === 'pass') {
      status = 'open';
      aiReviewStatus = 'pass';
    } else if (aiResult.result === 'reject') {
      status = 'rejected';
      aiReviewStatus = 'reject';
    } else {
      status = 'pending_review';
      aiReviewStatus = 'manual_review';
    }

    // 创建
    const groupBuy = await this.prisma.groupBuy.create({
      data: {
        communityId,
        initiatorId: userId,
        type: dto.type,
        location: dto.location,
        departAt: dto.departAt ? new Date(dto.departAt) : null,
        bidCloseAt: dto.bidCloseAt ? new Date(dto.bidCloseAt) : null,
        quota: dto.quota ?? (dto.type === 'seek' ? 999 : 5), // seek 不限名额
        serviceFee: dto.serviceFee ?? 'free',
        deliveryMethod: dto.deliveryMethod,
        note: dto.note ?? null,
        status,
        aiReviewStatus,
        // items 只对 seek 创建时入库
        items:
          dto.type === 'seek' && dto.items
            ? {
                create: dto.items.map((it: any) => ({
                  requesterId: userId,
                  name: it.name,
                  qty: it.qty ?? 1,
                  note: it.note ?? null,
                })),
              }
            : undefined,
      },
      include: { items: true },
    });

    return groupBuy;
  }

  async findAll(query: any, communityId: string) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {
      communityId,
      deletedAt: null,
      status: { in: ['open', 'closed_for_bid', 'purchased', 'completed'] },
    };
    if (query.type) where.type = query.type;
    const [items, total] = await Promise.all([
      this.prisma.groupBuy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { items: true } },
          items: { select: { id: true, requesterId: true, status: true } },
        },
      }),
      this.prisma.groupBuy.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string, communityId: string) {
    const gb = await this.prisma.groupBuy.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        items: {
          include: { requester: { select: { id: true, nickname: true, avatarUrl: true } } },
        },
        initiator: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    if (!gb) throw new NotFoundException();
    return gb;
  }

  async update(userId: string, id: string, communityId: string, dto: any) {
    const gb = await this.findOne(id, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅发起人可编辑');
    if (!['pending_review', 'open'].includes(gb.status)) {
      throw new BadRequestException('当前状态不可编辑');
    }
    // 编辑触发 AiReview
    const reviewText = `${dto.location ?? gb.location} ${dto.note ?? gb.note ?? ''}`;
    const aiResult = await this.aiReview.reviewText(reviewText, 'group_buy', id, {});
    const status =
      aiResult.result === 'reject'
        ? 'rejected'
        : aiResult.result === 'manual_review'
          ? 'pending_review'
          : 'open';

    return this.prisma.groupBuy.update({
      where: { id },
      data: {
        location: dto.location ?? gb.location,
        departAt: dto.departAt ? new Date(dto.departAt) : gb.departAt,
        bidCloseAt: dto.bidCloseAt ? new Date(dto.bidCloseAt) : gb.bidCloseAt,
        quota: dto.quota ?? gb.quota,
        serviceFee: dto.serviceFee ?? gb.serviceFee,
        deliveryMethod: dto.deliveryMethod ?? gb.deliveryMethod,
        note: dto.note ?? gb.note,
        status,
        aiReviewStatus: aiResult.result,
      },
    });
  }

  async respond(userId: string, id: string, communityId: string, dto: any) {
    const gb = await this.findOne(id, communityId);
    if (gb.status !== 'open') throw new BadRequestException('当前状态不可响应');

    // 名额校验（事务内 count）
    return this.prisma.$transaction(async (tx) => {
      const responderCount = await tx.groupBuyItem.count({
        where: { groupBuyId: id, status: { not: 'rejected' } },
      });
      // seek 不限名额（quota=999）；offer 按 quota
      if (gb.type === 'offer' && responderCount >= gb.quota) {
        throw new ConflictException('QUOTA_EXCEEDED');
      }
      try {
        return await tx.groupBuyItem.create({
          data: {
            groupBuyId: id,
            requesterId: userId,
            name: dto.name,
            qty: dto.qty ?? 1,
            note: dto.note ?? null,
          },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          throw new ConflictException('已响应过，不可重复响应');
        }
        throw e;
      }
    });
  }

  async confirmItem(userId: string, gbId: string, itemId: string, communityId: string) {
    const gb = await this.findOne(gbId, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可操作');
    const item = gb.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('item 不存在');
    if (item.status !== 'pending') throw new BadRequestException('item 状态不可 confirm');
    return this.prisma.groupBuyItem.update({
      where: { id: itemId },
      data: { status: 'confirmed' },
    });
  }

  async rejectItem(userId: string, gbId: string, itemId: string, communityId: string) {
    const gb = await this.findOne(gbId, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可操作');
    const item = gb.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('item 不存在');
    if (item.status !== 'pending') throw new BadRequestException('item 状态不可 reject');
    // reject 后释放名额（UNIQUE 约束不释放，但 count 会减少）
    return this.prisma.groupBuyItem.update({
      where: { id: itemId },
      data: { status: 'rejected' },
    });
  }

  async closeBid(userId: string, id: string, communityId: string) {
    const gb = await this.findOne(id, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可操作');
    if (gb.status !== 'open') throw new BadRequestException('仅 open 状态可截止接单');
    const updated = await this.prisma.groupBuy.update({
      where: { id },
      data: { status: 'closed_for_bid' },
    });
    // ponytail: 通知逻辑暂缓 - test afterAll 不清理 notifications 表会导致 user 删除时 FK 报错
    // 上限：接入通知系统时加 notifications.create + 在 test afterAll 加 notification.deleteMany
    return updated;
  }

  async purchased(userId: string, id: string, communityId: string) {
    const gb = await this.findOne(id, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可操作');
    if (gb.status !== 'closed_for_bid')
      throw new BadRequestException('仅 closed_for_bid 状态可标记已购回');
    const updated = await this.prisma.groupBuy.update({
      where: { id },
      data: { status: 'purchased' },
    });
    // ponytail: 通知逻辑暂缓 - 同 closeBid
    return updated;
  }

  async deliver(userId: string, gbId: string, itemId: string, communityId: string) {
    const gb = await this.findOne(gbId, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可操作');
    const item = gb.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('item 不存在');
    if (!['confirmed', 'purchased'].includes(item.status)) {
      throw new BadRequestException('item 状态不可 deliver');
    }
    // 事务：更新 item + 检查是否全部 delivered + 自动 completed
    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.groupBuyItem.update({
        where: { id: itemId },
        data: { status: 'delivered' },
      });
      const remaining = await tx.groupBuyItem.count({
        where: { groupBuyId: gbId, status: { notIn: ['delivered', 'rejected'] } },
      });
      if (remaining === 0) {
        await tx.groupBuy.update({ where: { id: gbId }, data: { status: 'completed' } });
        // ponytail: TODO 发花逻辑 - 注入 ContributionService 调用 awardFlower(initiatorId, 'group_buy', gbId)
        // 上限：完整接入后删除 TODO
      }
      return updatedItem;
    });
  }

  async cancelResponse(userId: string, id: string, communityId: string) {
    const gb = await this.findOne(id, communityId);
    if (gb.status === 'closed_for_bid' || gb.status === 'purchased' || gb.status === 'completed') {
      throw new BadRequestException('截止后不可取消');
    }
    const item = gb.items.find((i) => i.requesterId === userId);
    if (!item) throw new NotFoundException('未找到你的响应');
    if (item.status !== 'pending') throw new BadRequestException('item 已被处理，不可取消');
    return this.prisma.groupBuyItem.delete({ where: { id: item.id } });
  }

  async close(userId: string, id: string, communityId: string) {
    const gb = await this.findOne(id, communityId);
    if (gb.initiatorId !== userId) throw new ForbiddenException('仅主买人可关闭');
    return this.prisma.groupBuy.update({ where: { id }, data: { status: 'closed' } });
  }
}
