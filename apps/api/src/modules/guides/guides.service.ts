import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuideStatus } from '@xiaoqu-bangbang/shared';

interface GuideListQuery {
  category?: string;
  status?: string;
  keyword?: string;
  authorId?: string;
}

interface PaginationParams {
  skip: number;
  take: number;
}

const MAX_TITLE = 50;
const MAX_DESC = 2000;
const MAX_IMAGES = 9;

@Injectable()
export class GuidesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ===== Guide CRUD =====

  async list(communityId: string, query: GuideListQuery, pagination: PaginationParams) {
    const where: any = { communityId, deletedAt: null };
    if (!query.authorId) {
      where.status = GuideStatus.PUBLISHED;
    } else {
      where.authorId = query.authorId;
      if (query.status) where.status = query.status;
    }
    if (query.category) where.category = query.category;
    if (query.keyword) {
      where.title = { contains: query.keyword, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.guide.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          author: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.guide.count({ where }),
    ]);

    return { items: items.map((g) => this.toDto(g)), total };
  }

  async findById(id: string, communityId: string, viewerUserId?: string) {
    const guide = await this.prisma.guide.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    if (!guide || guide.deletedAt || guide.communityId !== communityId) {
      throw new NotFoundException('教程不存在');
    }
    if (guide.status !== GuideStatus.PUBLISHED && guide.authorId !== viewerUserId) {
      throw new NotFoundException('教程不存在');
    }

    // viewCount increment
    await this.prisma.guide.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    let isLiked = false;
    let isFavorited = false;
    if (viewerUserId) {
      const [like, fav] = await Promise.all([
        this.prisma.guideLike.findUnique({
          where: { guideId_userId: { guideId: id, userId: viewerUserId } },
        }),
        this.prisma.guideFavorite.findUnique({
          where: { guideId_userId: { guideId: id, userId: viewerUserId } },
        }),
      ]);
      isLiked = !!like;
      isFavorited = !!fav;
    }

    return this.toDetailDto({ ...guide, viewCount: guide.viewCount + 1, isLiked, isFavorited });
  }

  async create(
    userId: string,
    communityId: string,
    data: { title: string; description: string; images?: string[]; category: string },
  ) {
    const title = data.title?.trim() ?? '';
    const description = data.description?.trim() ?? '';
    if (!title) throw new BadRequestException('标题不能为空');
    if (title.length > MAX_TITLE) throw new BadRequestException(`标题不能超过 ${MAX_TITLE} 字`);
    if (!description) throw new BadRequestException('描述不能为空');
    if (description.length > MAX_DESC) throw new BadRequestException(`描述不能超过 ${MAX_DESC} 字`);
    const images = data.images ?? [];
    if (images.length > MAX_IMAGES) throw new BadRequestException(`图片不能超过 ${MAX_IMAGES} 张`);

    const guide = await this.prisma.guide.create({
      data: {
        communityId,
        authorId: userId,
        title,
        description,
        images,
        category: data.category,
        status: GuideStatus.PENDING_REVIEW,
      },
      include: { author: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return this.toDto(guide);
  }

  async update(
    userId: string,
    id: string,
    communityId: string,
    data: { title?: string; description?: string; images?: string[]; category?: string },
  ) {
    const guide = await this.assertAuthorGuide(id, userId, communityId);
    if (guide.status !== GuideStatus.PENDING_REVIEW) {
      throw new BadRequestException('已审核的教程不可编辑');
    }

    const updateData: any = {};
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new BadRequestException('标题不能为空');
      if (title.length > MAX_TITLE) throw new BadRequestException(`标题不能超过 ${MAX_TITLE} 字`);
      updateData.title = title;
    }
    if (data.description !== undefined) {
      const description = data.description.trim();
      if (!description) throw new BadRequestException('描述不能为空');
      if (description.length > MAX_DESC)
        throw new BadRequestException(`描述不能超过 ${MAX_DESC} 字`);
      updateData.description = description;
    }
    if (data.images !== undefined) {
      if (data.images.length > MAX_IMAGES)
        throw new BadRequestException(`图片不能超过 ${MAX_IMAGES} 张`);
      updateData.images = data.images;
    }
    if (data.category !== undefined) updateData.category = data.category;

    const updated = await this.prisma.guide.update({
      where: { id },
      data: updateData,
      include: { author: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return this.toDto(updated);
  }

  async softDelete(userId: string, id: string, communityId: string) {
    await this.assertAuthorGuide(id, userId, communityId);
    await this.prisma.guide.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ===== 互动 =====

  async toggleLike(userId: string, id: string, communityId: string) {
    await this.assertGuideVisible(id, communityId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.guideLike.findUnique({
        where: { guideId_userId: { guideId: id, userId } },
      });
      if (existing) {
        await tx.guideLike.delete({ where: { id: existing.id } });
        await tx.guide.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
        return {
          liked: false,
          likeCount: (await tx.guide.findUnique({ where: { id } }))!.likeCount,
        };
      }
      await tx.guideLike.create({ data: { guideId: id, userId } });
      await tx.guide.update({ where: { id }, data: { likeCount: { increment: 1 } } });
      return { liked: true, likeCount: (await tx.guide.findUnique({ where: { id } }))!.likeCount };
    });
  }

  async toggleFavorite(userId: string, id: string, communityId: string) {
    await this.assertGuideVisible(id, communityId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.guideFavorite.findUnique({
        where: { guideId_userId: { guideId: id, userId } },
      });
      if (existing) {
        await tx.guideFavorite.delete({ where: { id: existing.id } });
        await tx.guide.update({ where: { id }, data: { favoriteCount: { decrement: 1 } } });
        return {
          favorited: false,
          favoriteCount: (await tx.guide.findUnique({ where: { id } }))!.favoriteCount,
        };
      }
      await tx.guideFavorite.create({ data: { guideId: id, userId } });
      await tx.guide.update({ where: { id }, data: { favoriteCount: { increment: 1 } } });
      return {
        favorited: true,
        favoriteCount: (await tx.guide.findUnique({ where: { id } }))!.favoriteCount,
      };
    });
  }

  // ===== 评论 =====

  async listComments(id: string, communityId: string) {
    await this.assertGuideVisible(id, communityId);
    const comments = await this.prisma.guideComment.findMany({
      where: { guideId: id, parentId: null, deletedAt: null, status: 'visible' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
        replies: {
          where: { deletedAt: null, status: 'visible' },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        },
      },
    });
    return { items: comments.map((c) => this.toCommentDto(c)) };
  }

  async createComment(
    userId: string,
    id: string,
    communityId: string,
    data: { content: string; parentId?: string },
  ) {
    const guide = await this.assertGuideVisible(id, communityId);
    const content = data.content?.trim() ?? '';
    if (!content) throw new BadRequestException('评论内容不能为空');

    if (data.parentId) {
      const parent = await this.prisma.guideComment.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.guideId !== id) throw new BadRequestException('父评论不存在');
      if (parent.parentId) throw new BadRequestException('评论最多嵌套 2 层');
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.guideComment.create({
        data: { guideId: id, userId, parentId: data.parentId, content },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      });
      await tx.guide.update({ where: { id }, data: { commentCount: { increment: 1 } } });
      if (data.parentId) {
        await tx.guideComment.update({
          where: { id: data.parentId },
          data: { replyCount: { increment: 1 } },
        });
      }
      return c;
    });

    return this.toCommentDto(comment);
  }

  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await this.prisma.guideComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt || comment.status !== 'visible') {
      throw new NotFoundException('评论不存在');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.guideCommentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      if (existing) {
        await tx.guideCommentLike.delete({ where: { id: existing.id } });
        await tx.guideComment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } },
        });
        return {
          liked: false,
          likeCount: (await tx.guideComment.findUnique({ where: { id: commentId } }))!.likeCount,
        };
      }
      await tx.guideCommentLike.create({ data: { commentId, userId } });
      await tx.guideComment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      });
      return {
        liked: true,
        likeCount: (await tx.guideComment.findUnique({ where: { id: commentId } }))!.likeCount,
      };
    });
  }

  // ===== 私有辅助 =====

  private async assertAuthorGuide(id: string, userId: string, communityId: string) {
    const guide = await this.prisma.guide.findUnique({ where: { id } });
    if (!guide || guide.deletedAt || guide.communityId !== communityId) {
      throw new NotFoundException('教程不存在');
    }
    if (guide.authorId !== userId) throw new ForbiddenException('无权操作');
    return guide;
  }

  private async assertGuideVisible(id: string, communityId: string) {
    const guide = await this.prisma.guide.findUnique({ where: { id } });
    if (!guide || guide.deletedAt || guide.communityId !== communityId) {
      throw new NotFoundException('教程不存在');
    }
    return guide;
  }

  // ===== DTO 映射 =====

  private toDto(g: any) {
    return {
      id: g.id,
      communityId: g.communityId,
      authorId: g.authorId,
      authorNickname: g.author?.nickname ?? '',
      authorAvatarUrl: g.author?.avatarUrl ?? null,
      title: g.title,
      description: g.description,
      images: g.images as string[],
      category: g.category,
      status: g.status,
      rejectedReason: g.rejectedReason,
      viewCount: g.viewCount,
      likeCount: g.likeCount,
      favoriteCount: g.favoriteCount,
      commentCount: g.commentCount,
      isLiked: g.isLiked ?? false,
      isFavorited: g.isFavorited ?? false,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  private toDetailDto(g: any) {
    return {
      ...this.toDto(g),
      reviewedAt: g.reviewedAt,
    };
  }

  private toCommentDto(c: any) {
    return {
      id: c.id,
      guideId: c.guideId,
      userId: c.userId,
      userNickname: c.user?.nickname ?? '',
      userAvatarUrl: c.user?.avatarUrl ?? null,
      parentId: c.parentId,
      content: c.content,
      likeCount: c.likeCount,
      replyCount: c.replyCount,
      status: c.status,
      createdAt: c.createdAt,
      replies: c.replies?.map((r: any) => this.toCommentDto(r)),
    };
  }
}
