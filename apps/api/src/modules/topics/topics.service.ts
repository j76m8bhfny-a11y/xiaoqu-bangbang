import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface TopicListQuery {
  status?: string;
  keyword?: string;
}

interface PaginationParams {
  skip: number;
  take: number;
}

const TIME_BOOST_24H = 5;
const TIME_BOOST_48H = 2;
const MS_24H = 24 * 60 * 60 * 1000;
const MS_48H = 48 * 60 * 60 * 1000;

function timeBoost(reference: Date): number {
  const diff = Date.now() - reference.getTime();
  if (diff < MS_24H) return TIME_BOOST_24H;
  if (diff < MS_48H) return TIME_BOOST_48H;
  return 0;
}

@Injectable()
export class TopicsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(NotificationsService) private notificationsService: NotificationsService,
  ) {}

  // ===== 议题 CRUD =====

  async list(communityId: string, query: TopicListQuery, pagination: PaginationParams) {
    const status = query.status ?? 'open';
    const where: any = { communityId, status };
    if (query.keyword) {
      where.title = { contains: query.keyword, mode: 'insensitive' };
    }

    // ponytail: 全表拉取后内存排序再分页。小区议题量级 < 1000 可接受。
    // 升级路径：DB 加 score 物化字段 + 复合索引，或用 materialized view。
    const [allTopics, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          events: {
            where: { deletedAt: null, status: { in: ['open', 'pending_review'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { title: true, images: true },
          },
        },
      }),
      this.prisma.topic.count({ where }),
    ]);

    // 内存排序：净赞数 + 时间权重（未完结）；平均星级 + 完结时间权重（完结）
    const scored = allTopics.map((t) => {
      let score: number;
      if (status === 'closed') {
        const avg = t.ratingCount > 0 ? t.ratingSum / t.ratingCount : 0;
        const ref = t.closedAt ?? t.createdAt;
        score = avg * 10 + timeBoost(ref);
      } else {
        score = t.likeCount - t.dislikeCount + timeBoost(t.createdAt);
      }
      return { topic: t, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const paged = scored.slice(pagination.skip, pagination.skip + pagination.take);
    const items = paged.map(({ topic }) => this.toDto(topic));
    return { items, total };
  }

  async findById(id: string, communityId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        events: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!topic || topic.communityId !== communityId) {
      throw new NotFoundException('议题不存在');
    }
    return this.toDetailDto(topic);
  }

  async create(userId: string, communityId: string, data: { title: string; description?: string }) {
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('议题标题不能为空');
    }
    const title = data.title.trim();
    if (title.length > 30) {
      throw new BadRequestException('议题标题不能超过 30 字');
    }
    const topic = await this.prisma.topic.create({
      data: {
        communityId,
        title,
        description: data.description,
        createdBy: userId,
        aiReviewStatus: 'pass',
      },
    });
    return this.toDto(topic);
  }

  // ===== 点赞/点踩/评分 =====

  async like(
    topicId: string,
    userId: string,
    communityId: string,
    type: 'like' | 'dislike',
    scope: 'open' | 'closed',
  ) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');

    const existing = await this.prisma.topicLike.findUnique({
      where: { topicId_userId_scope: { topicId, userId, scope } },
    });

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.type === type) {
          // 重复，原样返回
          return this.toDto(topic);
        }
        // 切换类型：减去旧的计数 + 加上新的
        await tx.topicLike.update({
          where: { id: existing.id },
          data: { type },
        });
        const delta = this.buildLikeDelta(existing.type as 'like' | 'dislike', type, scope);
        const updated = await tx.topic.update({ where: { id: topicId }, data: delta });
        return this.toDto(updated);
      }
      await tx.topicLike.create({ data: { topicId, userId, type, scope } });
      const delta = this.buildLikeDelta(null, type, scope);
      const updated = await tx.topic.update({ where: { id: topicId }, data: delta });
      return this.toDto(updated);
    });
  }

  async unlike(topicId: string, userId: string, communityId: string, scope: 'open' | 'closed') {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');

    const existing = await this.prisma.topicLike.findUnique({
      where: { topicId_userId_scope: { topicId, userId, scope } },
    });
    if (!existing) return this.toDto(topic);

    return this.prisma.$transaction(async (tx) => {
      await tx.topicLike.delete({ where: { id: existing.id } });
      const delta = this.buildLikeDelta(existing.type as 'like' | 'dislike', null, scope);
      const updated = await tx.topic.update({ where: { id: topicId }, data: delta });
      return this.toDto(updated);
    });
  }

  async rate(topicId: string, userId: string, communityId: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('评分必须为 1-5 整数');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');
    if (topic.status !== 'closed') throw new BadRequestException('仅已完结议题可评分');

    const existing = await this.prisma.topicRating.findUnique({
      where: { topicId_userId: { topicId, userId } },
    });
    if (existing) throw new ConflictException('您已经评分过');

    return this.prisma.$transaction(async (tx) => {
      await tx.topicRating.create({ data: { topicId, userId, rating } });
      const updated = await tx.topic.update({
        where: { id: topicId },
        data: {
          ratingSum: { increment: rating },
          ratingCount: { increment: 1 },
        },
      });
      return this.toDto(updated);
    });
  }

  // ===== 评论 =====

  async listComments(
    topicId: string,
    communityId: string,
    options: { eventId?: string; sort?: 'hot' | 'new'; skip: number; take: number },
  ) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');

    // 不传 eventId 时只返回议题级评论（eventId 为 null），与事件评论区分开
    const where: any = {
      topicId,
      parentId: null,
      status: 'visible',
      eventId: options.eventId ?? null,
    };

    const orderBy =
      options.sort === 'new'
        ? [{ createdAt: 'desc' as const }]
        : [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.topicComment.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          replies: {
            where: { status: 'visible' },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
          },
        },
      }),
      this.prisma.topicComment.count({ where }),
    ]);

    return { items: items.map((c) => this.toCommentDto(c)), total };
  }

  async createComment(
    topicId: string,
    userId: string,
    communityId: string,
    data: { eventId?: string; content: string; images?: string[]; parentId?: string },
  ) {
    if (!data.content || !data.content.trim()) throw new BadRequestException('评论内容不能为空');

    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');

    let parent: any = null;
    if (data.parentId) {
      parent = await this.prisma.topicComment.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.topicId !== topicId) throw new NotFoundException('父评论不存在');
      if (parent.parentId) throw new BadRequestException('评论嵌套最多 2 层');
    }

    if (data.eventId) {
      const event = await this.prisma.event.findUnique({ where: { id: data.eventId } });
      if (!event || event.topicId !== topicId) throw new BadRequestException('事件不属于该议题');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.topicComment.create({
        data: {
          topicId,
          eventId: data.eventId,
          parentId: data.parentId,
          userId,
          content: data.content.trim(),
          images: (data.images ?? []) as any,
          aiReviewStatus: 'pass',
        },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      });

      await tx.topic.update({ where: { id: topicId }, data: { commentCount: { increment: 1 } } });

      if (parent) {
        await tx.topicComment.update({
          where: { id: parent.id },
          data: { replyCount: { increment: 1 } },
        });
      }

      return comment;
    });

    // 评论回复通知
    if (parent && parent.userId !== userId) {
      await this.notificationsService.create({
        userId: parent.userId,
        communityId,
        type: 'event_response',
        title: '有人回复了你的评论',
        content: data.content.trim().slice(0, 20),
        targetType: 'topic',
        targetId: topicId,
      });
    }

    return this.toCommentDto(created);
  }

  async likeComment(commentId: string, userId: string, type: 'like' | 'dislike') {
    const comment = await this.prisma.topicComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('评论不存在');

    const existing = await this.prisma.topicCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.type === type) return this.toCommentDto(comment);
        await tx.topicCommentLike.update({ where: { id: existing.id }, data: { type } });
        const delta = this.buildCommentLikeDelta(existing.type as 'like' | 'dislike', type);
        const updated = await tx.topicComment.update({ where: { id: commentId }, data: delta });
        return this.toCommentDto(updated);
      }
      await tx.topicCommentLike.create({ data: { commentId, userId, type } });
      const delta = this.buildCommentLikeDelta(null, type);
      const updated = await tx.topicComment.update({ where: { id: commentId }, data: delta });
      return this.toCommentDto(updated);
    });
  }

  async unlikeComment(commentId: string, userId: string) {
    const existing = await this.prisma.topicCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) {
      const c = await this.prisma.topicComment.findUnique({ where: { id: commentId } });
      if (!c) throw new NotFoundException('评论不存在');
      return this.toCommentDto(c);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.topicCommentLike.delete({ where: { id: existing.id } });
      const delta = this.buildCommentLikeDelta(existing.type as 'like' | 'dislike', null);
      const updated = await tx.topicComment.update({ where: { id: commentId }, data: delta });
      return this.toCommentDto(updated);
    });
  }

  // ===== 时间线 =====

  async getTimeline(topicId: string, communityId: string, pagination: PaginationParams) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');

    const events = await this.prisma.event.findMany({
      where: { topicId, deletedAt: null, status: { in: ['open', 'pending_review'] } },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        creator: { select: { id: true, nickname: true, avatarUrl: true } },
        topicComments: {
          where: { parentId: null, status: 'visible' },
          orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
            replies: {
              where: { status: 'visible' },
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    return events.map((e) => ({
      type: 'event' as const,
      data: {
        id: e.id,
        title: e.title,
        description: e.description,
        images: (e.images as any) ?? [],
        aiComment: e.aiComment ?? undefined,
        likeCount: e.likeCount,
        commentCount: e.commentCount,
        createdAt: e.createdAt.toISOString(),
        creator: e.isAnonymous
          ? { id: '', nickname: '匿名用户', avatarUrl: undefined }
          : {
              id: e.creator.id,
              nickname: e.creator.nickname,
              avatarUrl: e.creator.avatarUrl ?? undefined,
            },
        isAnonymous: e.isAnonymous,
        comments: e.topicComments.map((c) => this.toCommentDto(c)),
      },
    }));
  }

  // ===== AI 推荐议题（mock 实现）=====

  async suggestTopics(communityId: string, title: string, description: string) {
    const topics = await this.prisma.topic.findMany({
      where: { communityId, status: 'open' },
      select: { id: true, title: true, description: true },
    });
    const contentTokens = tokenize(`${title} ${description}`);
    if (contentTokens.size === 0 || topics.length === 0) return [];

    const scored = topics.map((t) => {
      const topicTokens = tokenize(`${t.title} ${t.description ?? ''}`);
      return { topicId: t.id, title: t.title, similarity: jaccard(contentTokens, topicTokens) };
    });
    return scored
      .filter((s) => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  async scanMergeSuggestions(communityId: string) {
    const topics = await this.prisma.topic.findMany({
      where: { communityId, status: 'open' },
      select: { id: true, title: true, description: true },
    });
    const created: string[] = [];
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const a = topics[i];
        const b = topics[j];
        const sim = jaccard(
          tokenize(`${a.title} ${a.description ?? ''}`),
          tokenize(`${b.title} ${b.description ?? ''}`),
        );
        if (sim >= 0.8 && sim < 0.95) {
          const existing = await this.prisma.topicMergeSuggestion.findFirst({
            where: { communityId, sourceTopicId: a.id, targetTopicId: b.id, status: 'pending' },
          });
          if (!existing) {
            const s = await this.prisma.topicMergeSuggestion.create({
              data: {
                communityId,
                sourceTopicId: a.id,
                targetTopicId: b.id,
                similarity: sim,
              },
            });
            created.push(s.id);
          }
        }
      }
    }
    return created;
  }

  // ===== 工具方法 =====

  private buildLikeDelta(
    oldType: 'like' | 'dislike' | null,
    newType: 'like' | 'dislike' | null,
    scope: 'open' | 'closed',
  ) {
    const data: any = {};
    const likeKey = scope === 'open' ? 'likeCount' : 'closedLikeCount';
    const dislikeKey = scope === 'open' ? 'dislikeCount' : 'closedDislikeCount';
    if (oldType === 'like') data[likeKey] = { decrement: 1 };
    if (oldType === 'dislike') data[dislikeKey] = { decrement: 1 };
    if (newType === 'like') data[likeKey] = { ...(data[likeKey] ?? {}), increment: 1 };
    if (newType === 'dislike') data[dislikeKey] = { ...(data[dislikeKey] ?? {}), increment: 1 };
    // 处理冲突：如果同一字段同时 increment+decrement，使用 set 0 调整
    // 但 Prisma 不允许同时 increment 和 decrement 同一字段；上面切换类型时 old/new 不同字段，所以不会冲突
    return data;
  }

  private buildCommentLikeDelta(
    oldType: 'like' | 'dislike' | null,
    newType: 'like' | 'dislike' | null,
  ) {
    const data: any = {};
    if (oldType === 'like') data.likeCount = { decrement: 1 };
    if (oldType === 'dislike') data.dislikeCount = { decrement: 1 };
    if (newType === 'like') data.likeCount = { ...(data.likeCount ?? {}), increment: 1 };
    if (newType === 'dislike') data.dislikeCount = { ...(data.dislikeCount ?? {}), increment: 1 };
    return data;
  }

  private toDto(topic: any) {
    const avgRating = topic.ratingCount > 0 ? topic.ratingSum / topic.ratingCount : 0;
    const latestEvent = topic.events?.[0];
    return {
      id: topic.id,
      communityId: topic.communityId,
      title: topic.title,
      description: topic.description ?? undefined,
      status: topic.status,
      likeCount: topic.likeCount,
      dislikeCount: topic.dislikeCount,
      closedLikeCount: topic.closedLikeCount,
      closedDislikeCount: topic.closedDislikeCount,
      ratingSum: topic.ratingSum,
      ratingCount: topic.ratingCount,
      avgRating,
      eventCount: topic.eventCount,
      commentCount: topic.commentCount,
      closedSummary: topic.closedSummary ?? undefined,
      closedAt: topic.closedAt ? topic.closedAt.toISOString() : undefined,
      createdBy: topic.createdBy,
      createdAt: topic.createdAt.toISOString(),
      latestEventPreview: latestEvent
        ? { title: latestEvent.title, firstImage: (latestEvent.images as any)?.[0] }
        : undefined,
    };
  }

  private toDetailDto(topic: any) {
    return {
      ...this.toDto(topic),
      events: (topic.events ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        images: e.images ?? [],
        aiComment: e.aiComment ?? undefined,
        likeCount: e.likeCount,
        commentCount: e.commentCount,
        createdAt: e.createdAt.toISOString(),
        creator: e.creator,
        isAnonymous: e.isAnonymous,
      })),
    };
  }

  private toCommentDto(c: any) {
    return {
      id: c.id,
      topicId: c.topicId,
      eventId: c.eventId ?? undefined,
      userId: c.userId,
      userNickname: c.user?.nickname ?? '',
      userAvatarUrl: c.user?.avatarUrl ?? undefined,
      parentId: c.parentId ?? undefined,
      content: c.content,
      images: (c.images as any) ?? [],
      likeCount: c.likeCount,
      dislikeCount: c.dislikeCount,
      replyCount: c.replyCount,
      createdAt: c.createdAt.toISOString(),
      replies: c.replies ? c.replies.map((r: any) => this.toCommentDto(r)) : undefined,
    };
  }
}

function tokenize(text: string): Set<string> {
  // 简单按 2 字 N-gram 提取中文/英文 token
  const cleaned = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
    .trim();
  const set = new Set<string>();
  // 英文按空格
  for (const w of cleaned.split(/\s+/)) {
    if (w.length >= 2) set.add(w);
  }
  // 中文 2-gram
  const chinese = cleaned.replace(/[a-z0-9]/g, '').replace(/\s+/g, '');
  for (let i = 0; i < chinese.length - 1; i++) {
    set.add(chinese.slice(i, i + 2));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
