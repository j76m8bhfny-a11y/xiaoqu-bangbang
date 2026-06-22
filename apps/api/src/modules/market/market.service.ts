import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
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

    return items;
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

  async findOne(id: string, communityId: string) {
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

    return item;
  }

  async create(userId: string, communityId: string, dto: CreateMarketItemDto) {
    // AI 审核文本内容 - use temp id for logging before creation
    const tempId = crypto.randomUUID();
    const textToReview = `${dto.title} ${dto.description}`;
    const aiResult = await this.aiReviewService.reviewText(
      textToReview,
      'market_item',
      tempId,
      { title: dto.title, description: dto.description },
    );

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
          return await this.prisma.marketItem.create({
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

    if (item.status === 'sold') {
      throw new ForbiddenException('商品已标记为已售');
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

  async addComment(userId: string, itemId: string, content: string, parentId: string | undefined, communityId: string) {
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
    }

    // AI 审核评论内容
    const aiResult = await this.aiReviewService.reviewText(
      content,
      'market_comment',
      itemId,
      { content },
    );

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

  async getComments(itemId: string, communityId: string) {
    // Verify item belongs to the community
    const item = await this.prisma.marketItem.findFirst({
      where: { id: itemId, communityId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('商品不存在');
    }

    const comments = await this.prisma.marketComment.findMany({
      where: { itemId, deletedAt: null, status: 'visible' },
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
    });

    return comments;
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

    // AI 审核评价内容
    const textToReview = dto.content ?? '';
    const aiResult = textToReview
      ? await this.aiReviewService.reviewText(
          textToReview,
          'market_review',
          itemId,
          { revieweeId: dto.revieweeId, rating: dto.rating, content: dto.content },
        )
      : { result: 'pass' as const, labels: [], score: 0 };

    let reviewStatus = 'visible';
    let aiReviewStatus = 'pass';

    if (aiResult.result === 'reject') {
      reviewStatus = 'hidden';
      aiReviewStatus = 'reject';
    } else if (aiResult.result === 'manual_review') {
      aiReviewStatus = 'manual_review';
    }

    const review = await this.prisma.marketReview.create({
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
