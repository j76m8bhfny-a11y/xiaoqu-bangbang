import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiReviewService } from '../ai-review/ai-review.service';
import { CreateMarketItemDto } from './dto/create-market-item.dto';

@Injectable()
export class MarketService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AiReviewService) private aiReviewService: AiReviewService,
  ) {}

  async list(
    communityId: string,
    query?: { category?: string; status?: string; keyword?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.marketItem.findMany({
      where,
      select: {
        id: true,
        communityId: true,
        sellerId: true,
        category: true,
        title: true,
        description: true,
        images: true,
        price: true,
        tradeType: true,
        conditionLevel: true,
        contactText: true,
        status: true,
        aiReviewStatus: true,
        soldAt: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });

    // P-43: flatten seller 对象对齐 MarketItemDto 契约
    return items.map(({ seller, ...item }) => ({
      ...item,
      sellerNickname: seller?.nickname ?? '',
      sellerAvatarUrl: seller?.avatarUrl ?? null,
    }));
  }

  async count(
    communityId: string,
    query?: { category?: string; status?: string; keyword?: string },
  ) {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (query?.category) where.category = query.category;
    if (query?.status) where.status = query.status;
    if (query?.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    return this.prisma.marketItem.count({ where });
  }

  async findOne(id: string, communityId: string, viewerUserId?: string) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id, communityId, deletedAt: null },
      select: {
        id: true,
        communityId: true,
        sellerId: true,
        category: true,
        title: true,
        description: true,
        images: true,
        price: true,
        tradeType: true,
        conditionLevel: true,
        contactText: true,
        status: true,
        aiReviewStatus: true,
        aiReviewResult: true,
        likeCount: true,
        soldAt: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    // 当前浏览者是否已点赞
    let isLiked = false;
    if (viewerUserId) {
      const like = await this.prisma.marketLike.findUnique({
        where: { itemId_userId: { itemId: id, userId: viewerUserId } },
      });
      isLiked = !!like;
    }

    // P-43: flatten seller 对象对齐 MarketItemDto 契约
    const { seller, ...rest } = item;
    return {
      ...rest,
      sellerNickname: seller?.nickname ?? '',
      sellerAvatarUrl: seller?.avatarUrl ?? null,
      isLiked,
    };
  }

  async toggleLike(userId: string, itemId: string, communityId: string) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id: itemId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('商品不存在');
    }
    if (item.communityId !== communityId) {
      throw new ForbiddenException('无权操作该商品');
    }

    const existing = await this.prisma.marketLike.findUnique({
      where: { itemId_userId: { itemId, userId } },
    });

    if (existing) {
      // P-242: delete + decrement 放入事务
      const [, updated] = await this.prisma.$transaction([
        this.prisma.marketLike.delete({ where: { id: existing.id } }),
        this.prisma.marketItem.update({
          where: { id: itemId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false, likeCount: updated.likeCount };
    }

    try {
      await this.prisma.marketLike.create({ data: { itemId, userId } });
    } catch (e: any) {
      // P-79: 并发竞态 — 已点赞则转为取消
      if (e?.code === 'P2002') {
        const existing = await this.prisma.marketLike.findUnique({
          where: { itemId_userId: { itemId, userId } },
        });
        if (existing) {
          await this.prisma.marketLike.delete({ where: { id: existing.id } });
          const updated = await this.prisma.marketItem.update({
            where: { id: itemId },
            data: { likeCount: { decrement: 1 } },
          });
          return { liked: false, likeCount: updated.likeCount };
        }
      }
      throw e;
    }
    const updated = await this.prisma.marketItem.update({
      where: { id: itemId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true, likeCount: updated.likeCount };
  }

  async create(userId: string, communityId: string, dto: CreateMarketItemDto) {
    // AI 审核文本内容 - use temp id for logging before creation
    const tempId = crypto.randomUUID();
    const textToReview = `${dto.title} ${dto.description}`;
    const aiResult = await this.aiReviewService.reviewText(textToReview, 'market_item', tempId, {
      title: dto.title,
      description: dto.description,
    });

    // 审核图片
    if (dto.images && dto.images.length > 0) {
      for (const imageUrl of dto.images) {
        const imageResult = await this.aiReviewService.reviewImage(
          imageUrl,
          'market_item',
          tempId,
          { imageUrl },
        );
        if (imageResult.result === 'reject') {
          const rejectedItem = await this.prisma.marketItem.create({
            data: {
              communityId,
              sellerId: userId,
              category: dto.category,
              title: dto.title,
              description: dto.description,
              images: dto.images ?? [],
              price: dto.price,
              tradeType: dto.tradeType ?? 'free',
              conditionLevel: dto.conditionLevel ?? 'good',
              status: 'rejected',
              aiReviewStatus: 'reject',
              aiReviewResult: imageResult as any,
            },
          });
          // P-239: 早返回时也要更新 AI 审核日志的 targetId
          await this.prisma.aiReviewLog.updateMany({
            where: { targetType: 'market_item', targetId: tempId },
            data: { targetId: rejectedItem.id },
          });
          return rejectedItem;
        }
        if (imageResult.result === 'manual_review' && aiResult.result !== 'reject') {
          aiResult.result = 'manual_review';
          aiResult.labels = [...aiResult.labels, ...imageResult.labels];
        }
      }
    }

    let status: string;
    let aiReviewStatus: string;

    if (aiResult.result === 'reject') {
      status = 'rejected';
      aiReviewStatus = 'reject';
    } else if (aiResult.result === 'manual_review') {
      status = 'pending_review';
      aiReviewStatus = 'manual_review';
    } else {
      status = 'on_sale';
      aiReviewStatus = 'pass';
    }

    const item = await this.prisma.marketItem.create({
      data: {
        communityId,
        sellerId: userId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        images: dto.images ?? [],
        price: dto.price,
        tradeType: dto.tradeType ?? 'free',
        conditionLevel: dto.conditionLevel ?? 'good',
        status,
        aiReviewStatus,
        aiReviewResult: aiResult as any,
      },
    });

    // Update the AI review logs with the real targetId
    await this.prisma.aiReviewLog.updateMany({
      where: { targetType: 'market_item', targetId: tempId },
      data: { targetId: item.id },
    });

    return item;
  }

  async update(userId: string, id: string, communityId: string, dto: Partial<CreateMarketItemDto>) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    if (item.sellerId !== userId) {
      throw new ForbiddenException('只能修改自己发布的商品');
    }

    if (item.status === 'sold' || item.status === 'closed') {
      throw new BadRequestException('已售或已下架商品不可编辑');
    }

    const updated = await this.prisma.marketItem.update({
      where: { id },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.tradeType !== undefined && { tradeType: dto.tradeType }),
        ...(dto.conditionLevel !== undefined && { conditionLevel: dto.conditionLevel }),
      },
    });

    return updated;
  }

  async markSold(userId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    if (item.communityId !== communityId) {
      throw new ForbiddenException('无权操作该商品');
    }

    if (item.sellerId !== userId) {
      throw new ForbiddenException('只能标记自己发布的商品为已售');
    }

    // P-240/P-241: 已售/已下架商品不能标记已售
    if (item.status === 'sold') {
      throw new BadRequestException('商品已标记为已售');
    }
    if (item.status === 'closed') {
      throw new BadRequestException('商品已下架');
    }

    const updated = await this.prisma.marketItem.update({
      where: { id },
      data: {
        status: 'sold',
        soldAt: new Date(),
      },
    });

    return updated;
  }

  // P-58: 卖家自行下架商品（区别于管理员 hide）
  async closeBySeller(userId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    if (item.communityId !== communityId) {
      throw new ForbiddenException('无权操作该商品');
    }

    if (item.sellerId !== userId) {
      throw new ForbiddenException('只能下架自己发布的商品');
    }

    if (item.status === 'sold') {
      throw new BadRequestException('商品已售出，无法下架');
    }
    if (item.status === 'closed') {
      throw new BadRequestException('商品已下架');
    }

    const updated = await this.prisma.marketItem.update({
      where: { id },
      data: { status: 'closed' },
    });

    return updated;
  }

  async addComment(
    userId: string,
    itemId: string,
    content: string,
    parentId: string | undefined,
    communityId: string,
  ) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id: itemId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    if (item.communityId !== communityId) {
      throw new ForbiddenException('无权操作该商品');
    }

    if (parentId) {
      const parent = await this.prisma.marketComment.findFirst({
        where: { id: parentId, itemId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('父评论不存在');
      }
      // P-237: 嵌套最多 2 层
      if (parent.parentId) {
        throw new BadRequestException('评论嵌套最多 2 层');
      }
    }

    // AI 审核评论内容
    const aiResult = await this.aiReviewService.reviewText(content, 'market_comment', itemId, {
      content,
    });

    let commentStatus = 'visible';
    let aiReviewStatus = 'pass';

    if (aiResult.result === 'reject') {
      commentStatus = 'hidden';
      aiReviewStatus = 'reject';
    } else if (aiResult.result === 'manual_review') {
      aiReviewStatus = 'manual_review';
    }

    const comment = await this.prisma.marketComment.create({
      data: {
        itemId,
        userId,
        parentId: parentId ?? null,
        content,
        status: commentStatus,
        aiReviewStatus,
      },
    });

    return comment;
  }

  async getComments(
    itemId: string,
    communityId: string,
    pagination?: { skip: number; take: number },
  ) {
    // Verify item belongs to the community
    const item = await this.prisma.marketItem.findFirst({
      where: { id: itemId, communityId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    const where = { itemId, deletedAt: null, status: 'visible' };
    const [comments, total] = await Promise.all([
      this.prisma.marketComment.findMany({
        where,
        select: {
          id: true,
          itemId: true,
          userId: true,
          parentId: true,
          content: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        ...(pagination ?? {}),
      }),
      this.prisma.marketComment.count({ where }),
    ]);

    return { items: comments, total };
  }

  async addReview(
    reviewerId: string,
    itemId: string,
    communityId: string,
    dto: { revieweeId: string; rating: number; tags?: string[]; content?: string },
  ) {
    const item = await this.prisma.marketItem.findFirst({
      where: { id: itemId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    if (item.communityId !== communityId) {
      throw new ForbiddenException('无权操作该商品');
    }

    // P-07: 只能对已售商品评价
    if (item.status !== 'sold') {
      throw new BadRequestException('只能对已售出商品进行评价');
    }

    // AI 审核评价内容
    const textToReview = dto.content ?? '';
    const aiResult = textToReview
      ? await this.aiReviewService.reviewText(textToReview, 'market_review', itemId, {
          revieweeId: dto.revieweeId,
          rating: dto.rating,
          content: dto.content,
        })
      : { result: 'pass' as const, labels: [], score: 0 };

    let reviewStatus = 'visible';
    let aiReviewStatus = 'pass';

    if (aiResult.result === 'reject') {
      reviewStatus = 'hidden';
      aiReviewStatus = 'reject';
    } else if (aiResult.result === 'manual_review') {
      aiReviewStatus = 'manual_review';
    }

    let review;
    try {
      review = await this.prisma.marketReview.create({
        data: {
          itemId,
          reviewerId,
          revieweeId: dto.revieweeId,
          rating: dto.rating,
          tags: dto.tags ?? undefined,
          content: dto.content ?? null,
          status: reviewStatus,
          aiReviewStatus,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('您已评价过该交易');
      }
      throw e;
    }

    return review;
  }

  async getReviews(itemId: string) {
    const reviews = await this.prisma.marketReview.findMany({
      where: { itemId, deletedAt: null, status: 'visible' },
      select: {
        id: true,
        itemId: true,
        reviewerId: true,
        revieweeId: true,
        rating: true,
        tags: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reviewer: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        reviewee: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }
}
