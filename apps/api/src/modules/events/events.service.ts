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
import { RankingsService } from '../rankings/rankings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AiReviewService) private aiReviewService: AiReviewService,
    @Inject(RankingsService) private rankingsService: RankingsService,
    @Inject(NotificationsService) private notificationsService: NotificationsService,
  ) {}

  async list(
    communityId: string,
    query?: { type?: string; status?: string; keyword?: string; excludeTypes?: string[] },
    pagination?: { skip: number; take: number },
    viewerUserId?: string,
  ) {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (query?.type) {
      where.type = query.type;
    } else if (query?.excludeTypes && query.excludeTypes.length > 0) {
      where.type = { notIn: query.excludeTypes };
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

    const items = await this.prisma.event.findMany({
      where,
      include: {
        creator: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        selectedHelper: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        _count: {
          select: {
            applications: { where: { deletedAt: null } },
            comments: { where: { deletedAt: null, status: 'visible' } },
            likes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });

    return items.map((item) => this.maskAnonymous(item, viewerUserId));
  }

  /**
   * 匿名事件脱敏：对「非本人」隐藏真实身份（creator 置空、creatorId 抹除），
   * 本人保留 creatorId 以支持前端编辑按钮判断。
   */
  private maskAnonymous<T extends { isAnonymous: boolean; creatorId: string; creator: unknown }>(
    event: T,
    viewerUserId?: string,
  ): T {
    if (!event.isAnonymous) return event;
    const isOwner = !!viewerUserId && event.creatorId === viewerUserId;
    return {
      ...event,
      creator: null,
      creatorId: isOwner ? event.creatorId : '',
    };
  }

  async count(
    communityId: string,
    query?: { type?: string; status?: string; keyword?: string; excludeTypes?: string[] },
  ) {
    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (query?.type) where.type = query.type;
    else if (query?.excludeTypes && query.excludeTypes.length > 0)
      where.type = { notIn: query.excludeTypes };
    if (query?.status) where.status = query.status;
    if (query?.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    return this.prisma.event.count({ where });
  }

  async findOne(id: string, communityId: string, viewerUserId?: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        selectedHelper: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        applications: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        participants: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            comments: { where: { deletedAt: null, status: 'visible' } },
            likes: true,
            thanks: true,
            favorites: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权访问该事件');
    }

    // Increment view count
    await this.prisma.event.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return this.maskAnonymous(event, viewerUserId);
  }

  async create(userId: string, communityId: string, dto: any) {
    // 议事类事件必须挂议题，非议事类不能挂议题
    const isTopicType = dto.type === 'public_feedback' || dto.type === 'discussion';
    if (isTopicType) {
      if (!dto.topicId) {
        throw new BadRequestException('议事类事件必须选择议题');
      }
      const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
      if (!topic || topic.communityId !== communityId) {
        throw new BadRequestException('议题不存在或不属于当前小区');
      }
    } else if (dto.topicId) {
      throw new BadRequestException('非议事类事件不能挂议题');
    }

    // Run AI review on content - use a temp id for logging before creation
    const tempId = crypto.randomUUID();
    const aiResult = await this.aiReviewService.reviewText(
      `${dto.title} ${dto.description}`,
      'event',
      tempId,
      { title: dto.title, description: dto.description },
    );

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

    // P-295: 审核图片（与 market 一致）
    if (dto.images && dto.images.length > 0) {
      for (const imageUrl of dto.images) {
        const imageResult = await this.aiReviewService.reviewImage(imageUrl, 'event', tempId, {
          imageUrl,
        });
        if (imageResult.result === 'reject') {
          status = 'rejected';
          aiReviewStatus = 'reject';
          break;
        }
      }
    }

    // mock AI 点评（议事类事件 + 审核通过 + 开关开启时生成）
    let aiComment: string | null = null;
    if (isTopicType && aiResult.result === 'pass') {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'ai_event_comment' },
      });
      const enabled = setting ? setting.value === 'true' : true;
      if (enabled) {
        aiComment = generateMockAiComment(dto.title, dto.description);
      }
    }

    const event = await this.prisma.event.create({
      data: {
        communityId,
        creatorId: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        images: dto.images ?? [],
        rewardType: dto.rewardType ?? 'none',
        rewardAmount: dto.rewardAmount ?? null,
        locationText: dto.locationText ?? null,
        expectedTime: dto.expectedTime ? new Date(dto.expectedTime) : null,
        isAnonymous: dto.isAnonymous ?? false,
        topicId: dto.topicId ?? null,
        capacity: dto.capacity ?? null,
        aiComment,
        status,
        aiReviewStatus,
        aiReviewResult: aiResult as any,
      },
    });

    // Update the AI review log with the real targetId
    await this.prisma.aiReviewLog.updateMany({
      where: { targetType: 'event', targetId: tempId },
      data: { targetId: event.id },
    });

    // 议事类事件审核通过 → 议题 eventCount +1 + 创建者激励 (Map.md §3.4: open 即发激励)
    if (isTopicType && dto.topicId && status === 'open') {
      await this.prisma.topic.update({
        where: { id: dto.topicId },
        data: { eventCount: { increment: 1 } },
      });

      // 议事类审核通过 → 创建者 1 朵花 + type='feedback' 通知
      await this.rankingsService.handleEventApproved({
        id: event.id,
        communityId: event.communityId,
        creatorId: event.creatorId,
        type: event.type,
      });
    }

    return event;
  }

  async suggestTopics(communityId: string, title: string, description: string) {
    // P-225: ai_topic_suggest 开关关闭时返回空
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'ai_topic_suggest' },
    });
    if (setting && setting.value !== 'true') return [];

    const topics = await this.prisma.topic.findMany({
      where: { communityId, status: 'open' },
      select: { id: true, title: true, description: true },
    });
    const queryTokens = topicTokenize(`${title} ${description}`);
    if (queryTokens.size === 0 || topics.length === 0) return [];

    const scored = topics.map((t) => {
      const tokens = topicTokenize(`${t.title} ${t.description ?? ''}`);
      return { topicId: t.id, title: t.title, similarity: topicJaccard(queryTokens, tokens) };
    });
    return scored
      .filter((s) => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  async update(userId: string, id: string, communityId: string, dto: any) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== userId) {
      throw new ForbiddenException('只有创建者可以编辑');
    }
    if (event.status === 'closed' || event.status === 'completed') {
      throw new BadRequestException('已关闭或已完成的事件无法编辑');
    }

    // P-226: 修改 type 时重新校验 topicId 规则
    const effectiveType = dto.type ?? event.type;
    const isTopicType = effectiveType === 'public_feedback' || effectiveType === 'discussion';
    if (dto.type !== undefined) {
      if (isTopicType && !dto.topicId && !event.topicId) {
        throw new BadRequestException('议事类事件必须选择议题');
      }
      if (!isTopicType && dto.topicId) {
        throw new BadRequestException('非议事类事件不能挂议题');
      }
    }
    if (dto.topicId !== undefined) {
      if (!isTopicType) {
        throw new BadRequestException('非议事类事件不能挂议题');
      }
      const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
      if (!topic || topic.communityId !== communityId) {
        throw new BadRequestException('议题不存在或不属于当前小区');
      }
    }

    // P-19: 有人响应后禁止编辑核心内容
    const coreFields = [
      'type',
      'title',
      'description',
      'rewardType',
      'rewardAmount',
      'expectedTime',
    ];
    const editingCore = coreFields.some((f) => dto[f] !== undefined);
    if (editingCore) {
      const appCount = await this.prisma.eventApplication.count({
        where: { eventId: id, deletedAt: null },
      });
      if (appCount > 0) {
        throw new BadRequestException('已有响应者，无法编辑核心内容');
      }
    }

    const updateData: any = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.rewardType !== undefined) updateData.rewardType = dto.rewardType;
    if (dto.rewardAmount !== undefined) updateData.rewardAmount = dto.rewardAmount;
    if (dto.locationText !== undefined) updateData.locationText = dto.locationText;
    if (dto.expectedTime !== undefined)
      updateData.expectedTime = dto.expectedTime ? new Date(dto.expectedTime) : null;
    if (dto.isAnonymous !== undefined) updateData.isAnonymous = dto.isAnonymous;

    // Re-run AI review if content changed
    if (dto.title !== undefined || dto.description !== undefined) {
      const aiResult = await this.aiReviewService.reviewText(
        `${dto.title ?? event.title} ${dto.description ?? event.description}`,
        'event',
        id,
        { title: dto.title ?? event.title, description: dto.description ?? event.description },
      );

      if (aiResult.result === 'pass') {
        updateData.status = 'open';
        updateData.aiReviewStatus = 'pass';
      } else if (aiResult.result === 'reject') {
        updateData.status = 'rejected';
        updateData.aiReviewStatus = 'reject';
      } else {
        updateData.status = 'pending_review';
        updateData.aiReviewStatus = 'manual_review';
      }
      updateData.aiReviewResult = aiResult as any;
    }

    // P-20: 图片变化也要审核
    if (dto.images !== undefined && dto.images.length > 0) {
      for (const imageUrl of dto.images) {
        const imageResult = await this.aiReviewService.reviewImage(imageUrl, 'event', id, {
          imageUrl,
        });
        if (imageResult.result === 'reject') {
          updateData.status = 'rejected';
          updateData.aiReviewStatus = 'reject';
          updateData.aiReviewResult = imageResult as any;
          break;
        }
        if (imageResult.result === 'manual_review' && updateData.status !== 'rejected') {
          updateData.status = 'pending_review';
          updateData.aiReviewStatus = 'manual_review';
        }
      }
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  async close(userId: string, id: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== userId) {
      throw new ForbiddenException('只有创建者可以关闭');
    }
    if (event.status === 'closed' || event.status === 'completed') {
      throw new BadRequestException('事件已关闭或已完成');
    }

    const closed = await this.prisma.event.update({
      where: { id },
      data: { status: 'closed' },
    });

    return closed;
  }

  async respond(
    userId: string,
    eventId: string,
    dto: { actionType: string; message?: string },
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.status !== 'open' && event.status !== 'in_progress') {
      throw new BadRequestException('该事件当前无法响应');
    }
    // P-68: 创建者不能响应自己的事件
    if (event.creatorId === userId) {
      throw new BadRequestException('不能响应自己发布的事件');
    }

    let application;
    try {
      application = await this.prisma.eventApplication.create({
        data: {
          eventId,
          userId,
          actionType: dto.actionType,
          message: dto.message ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('您已响应过该事件');
      }
      throw e;
    }

    // Update event status to in_progress if it was open
    if (event.status === 'open') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: 'in_progress' },
      });
    }

    // Notify event creator of new response
    await this.notificationsService.create({
      userId: event.creatorId,
      communityId: event.communityId,
      type: 'event_response',
      title: '有人响应了您的事件',
      content: `您的事件「${event.title}」收到了新的响应`,
      targetType: 'event',
      targetId: eventId,
    });

    return application;
  }

  async getApplications(eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权访问该事件');
    }
    const applications = await this.prisma.eventApplication.findMany({
      where: { eventId, deletedAt: null },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // P-43: flatten user 对象对齐 EventApplicationDto 契约
    return applications.map(({ user, ...app }) => ({
      ...app,
      userNickname: user?.nickname ?? '',
      userAvatarUrl: user?.avatarUrl ?? null,
    }));
  }

  async selectHelper(
    creatorId: string,
    eventId: string,
    applicationId: string,
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== creatorId) {
      throw new ForbiddenException('只有创建者可以选择帮手');
    }

    // P-228: 已选帮手不允许重复选择
    if (event.selectedHelperId) {
      throw new BadRequestException('该事件已选择帮手');
    }

    const application = await this.prisma.eventApplication.findFirst({
      where: { id: applicationId, eventId, deletedAt: null },
    });

    if (!application) {
      throw new NotFoundException('申请不存在');
    }

    // Update application status
    await this.prisma.eventApplication.update({
      where: { id: applicationId },
      data: { status: 'selected' },
    });

    // Update event with selected helper
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        selectedHelperId: application.userId,
        status: 'processing',
      },
    });

    // Notify selected helper
    await this.notificationsService.create({
      userId: application.userId,
      communityId: event.communityId,
      type: 'event_response',
      title: '您被选为帮手',
      content: `您已被选为事件「${event.title}」的帮手`,
      targetType: 'event',
      targetId: eventId,
    });

    return updated;
  }

  async requestCompletion(userId: string, eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== userId && event.selectedHelperId !== userId) {
      throw new ForbiddenException('只有创建者或帮手可以请求完成');
    }
    if (event.status !== 'processing' && event.status !== 'in_progress') {
      throw new BadRequestException('当前状态无法请求完成');
    }

    // Determine role
    const role = event.creatorId === userId ? 'creator' : 'helper';

    // Upsert completion confirmation
    const confirmation = await this.prisma.eventCompletionConfirmation.upsert({
      where: { eventId_userId_role: { eventId, userId, role } },
      update: { status: 'requested' },
      create: {
        eventId,
        userId,
        role,
        status: 'requested',
      },
    });

    return confirmation;
  }

  async confirmCompletion(userId: string, eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    // P-223: 防止重复确认已完成/已取消的事件（积分刷取漏洞）
    if (event.status === 'completed') {
      throw new BadRequestException('事件已完成，不可重复确认');
    }
    if (event.status === 'cancelled') {
      throw new BadRequestException('事件已取消，不可确认完成');
    }
    if (event.creatorId !== userId && event.selectedHelperId !== userId) {
      throw new ForbiddenException('只有创建者或帮手可以确认完成');
    }

    const role = event.creatorId === userId ? 'creator' : 'helper';

    // Create or update confirmation
    await this.prisma.eventCompletionConfirmation.upsert({
      where: { eventId_userId_role: { eventId, userId, role } },
      update: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
      create: {
        eventId,
        userId,
        role,
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    // Check if both parties confirmed
    const confirmations = await this.prisma.eventCompletionConfirmation.findMany({
      where: { eventId, status: 'confirmed' },
    });

    const confirmedRoles = new Set(confirmations.map((c) => c.role));
    const allConfirmed = confirmedRoles.has('creator') && confirmedRoles.has('helper');

    if (allConfirmed) {
      const completed = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Trigger completion side effects: contribution, badges, rankings, notifications
      await this.rankingsService.handleEventCompletion({
        id: event.id,
        communityId: event.communityId,
        creatorId: event.creatorId,
        selectedHelperId: event.selectedHelperId,
        type: event.type,
        rewardType: event.rewardType,
      });

      return completed;
    }

    return { confirmed: role, waitingFor: role === 'creator' ? 'helper' : 'creator' };
  }

  // Batch 6: 多帮手选择（public_welfare/lost_found）
  async selectParticipant(
    creatorId: string,
    eventId: string,
    applicationId: string,
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== creatorId) {
      throw new ForbiddenException('只有创建者可以选择参与者');
    }
    if (event.type !== 'public_welfare' && event.type !== 'lost_found') {
      throw new BadRequestException('该事件类型不支持多帮手选择');
    }
    if (event.status === 'completed' || event.status === 'closed') {
      throw new BadRequestException('事件已结束');
    }

    const application = await this.prisma.eventApplication.findFirst({
      where: { id: applicationId, eventId, deletedAt: null },
    });

    if (!application) {
      throw new NotFoundException('申请不存在');
    }

    // 申请必须处于 pending 状态才可被选择
    if (application.status !== 'pending') {
      throw new BadRequestException('该申请已被处理');
    }

    // 检查容量限制 (ponytail: capacity 为 null 时不限制，多帮手事件默认无上限)
    if (event.capacity != null) {
      const existingCount = await this.prisma.eventParticipant.count({
        where: { eventId },
      });
      if (existingCount >= event.capacity) {
        throw new BadRequestException(`参与者已达上限 (${event.capacity})`);
      }
    }

    // 检查是否已是参与者
    const existing = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: application.userId } },
    });
    if (existing) {
      throw new ConflictException('该用户已是参与者');
    }

    // 创建参与者记录 + 更新申请状态
    const participant = await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId: application.userId,
        applicationId,
      },
    });

    await this.prisma.eventApplication.update({
      where: { id: applicationId },
      data: { status: 'selected' },
    });

    // 首次选择参与者时更新事件状态
    if (event.status === 'open' || event.status === 'in_progress') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: 'processing' },
      });
    }

    // 通知被选中的参与者
    await this.notificationsService.create({
      userId: application.userId,
      communityId: event.communityId,
      type: 'event_response',
      title: '您被选为参与者',
      content: `您已被选为事件「${event.title}」的参与者`,
      targetType: 'event',
      targetId: eventId,
    });

    return participant;
  }

  // Batch 6: 逐个确认参与者完成（发花）
  async confirmParticipant(
    creatorId: string,
    eventId: string,
    participantId: string,
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }
    if (event.creatorId !== creatorId) {
      throw new ForbiddenException('只有创建者可以确认参与者');
    }

    const participant = await this.prisma.eventParticipant.findFirst({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      throw new NotFoundException('参与者不存在');
    }
    if (participant.status === 'confirmed') {
      throw new BadRequestException('该参与者已确认');
    }

    // 标记参与者已确认
    const updated = await this.prisma.eventParticipant.update({
      where: { id: participantId },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    // 立即发放花朵给该帮手
    await this.rankingsService.handleHelperCompletion(
      {
        id: event.id,
        communityId: event.communityId,
        type: event.type,
        rewardType: event.rewardType,
      },
      participant.userId,
    );

    // 检查是否所有参与者都已确认
    const pending = await this.prisma.eventParticipant.count({
      where: { eventId, status: 'selected' },
    });

    if (pending === 0) {
      // 全部确认 → 事件完成
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: 'completed', completedAt: new Date() },
      });

      // 创建者完成: 花朵 + 榜单 + 通知（selectedHelperId 为 null，跳过 helper 部分）
      await this.rankingsService.handleEventCompletion({
        id: event.id,
        communityId: event.communityId,
        creatorId: event.creatorId,
        selectedHelperId: null,
        type: event.type,
        rewardType: event.rewardType,
      });
    }

    return updated;
  }

  async addComment(
    userId: string,
    eventId: string,
    content: string,
    communityId: string,
    parentId?: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }

    // Validate parent comment if provided
    if (parentId) {
      const parent = await this.prisma.eventComment.findFirst({
        where: { id: parentId, eventId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('父评论不存在');
      }
      // P-224: 嵌套最多 2 层，禁止对子评论再回复
      if (parent.parentId) {
        throw new BadRequestException('评论嵌套最多 2 层');
      }
    }

    // Run AI review on comment
    const aiResult = await this.aiReviewService.reviewText(content, 'event_comment', eventId, {
      content,
    });
    const aiReviewStatus =
      aiResult.result === 'pass'
        ? 'pass'
        : aiResult.result === 'reject'
          ? 'reject'
          : 'manual_review';

    const commentStatus = aiResult.result === 'reject' ? 'hidden' : 'visible';

    const comment = await this.prisma.eventComment.create({
      data: {
        eventId,
        userId,
        parentId: parentId ?? null,
        content,
        aiReviewStatus,
        status: commentStatus,
      },
    });

    // Increment comment count if visible
    if (commentStatus === 'visible') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { commentCount: { increment: 1 } },
      });
    }

    return comment;
  }

  async getComments(
    eventId: string,
    communityId: string,
    pagination?: { skip: number; take: number },
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权访问该事件');
    }

    const where = { eventId, deletedAt: null, status: 'visible' };
    const [comments, total] = await Promise.all([
      this.prisma.eventComment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
        ...(pagination ?? {}),
      }),
      this.prisma.eventComment.count({ where }),
    ]);

    // P-230: 返回 { items, total } 以支持分页契约
    return { items: comments, total };
  }

  async toggleLike(userId: string, eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }

    const existing = await this.prisma.eventLike.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      // review fix: wrap delete + decrement in $transaction
      await this.prisma.$transaction([
        this.prisma.eventLike.delete({ where: { id: existing.id } }),
        this.prisma.event.update({
          where: { id: eventId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    }

    try {
      // review fix: wrap create + increment in $transaction
      await this.prisma.$transaction([
        this.prisma.eventLike.create({ data: { eventId, userId } }),
        this.prisma.event.update({
          where: { id: eventId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (e: any) {
      // P-79: 并发竞态 — 已被点赞则转为取消
      if (e?.code === 'P2002') {
        const existing = await this.prisma.eventLike.findUnique({
          where: { eventId_userId: { eventId, userId } },
        });
        if (existing) {
          await this.prisma.$transaction([
            this.prisma.eventLike.delete({ where: { id: existing.id } }),
            this.prisma.event.update({
              where: { id: eventId },
              data: { likeCount: { decrement: 1 } },
            }),
          ]);
          return { liked: false };
        }
      }
      throw e;
    }
    return { liked: true };
  }

  async sendThanks(
    fromUserId: string,
    eventId: string,
    toUserId: string | undefined,
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }

    // P-99: 如果前端未传 toUserId，从事件的 selectedHelperId 自动推导
    const targetUserId = toUserId ?? event.selectedHelperId;
    if (!targetUserId) {
      throw new BadRequestException('未指定感谢对象');
    }
    if (fromUserId === targetUserId) {
      throw new BadRequestException('不能感谢自己');
    }

    const existing = await this.prisma.eventThank.findUnique({
      where: {
        eventId_fromUserId_toUserId: { eventId, fromUserId, toUserId: targetUserId },
      },
    });

    if (existing) {
      // P-231: 重复感谢返回 409 Conflict
      throw new ConflictException('已经感谢过该用户');
    }

    const thank = await this.prisma.eventThank.create({
      data: { eventId, fromUserId, toUserId: targetUserId },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { thanksCount: { increment: 1 } },
    });

    return thank;
  }

  async toggleFavorite(userId: string, eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }

    const existing = await this.prisma.eventFavorite.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      await this.prisma.eventFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.eventFavorite.create({
      data: { eventId, userId },
    });
    return { favorited: true };
  }

  async report(
    reporterId: string,
    dto: { targetType: string; targetId: string; reason: string; description?: string },
  ) {
    // Resolve communityId from the target
    let communityId: string | null;
    if (dto.targetType === 'event' || dto.targetType === 'event_comment') {
      let eventId = dto.targetId;
      if (dto.targetType === 'event_comment') {
        const comment = await this.prisma.eventComment.findUnique({ where: { id: dto.targetId } });
        if (!comment) throw new NotFoundException('举报目标不存在');
        eventId = comment.eventId;
      }
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundException('举报目标不存在');
      communityId = event.communityId;
    } else if (dto.targetType === 'market_item' || dto.targetType === 'market_comment') {
      let itemId = dto.targetId;
      if (dto.targetType === 'market_comment') {
        const comment = await this.prisma.marketComment.findUnique({ where: { id: dto.targetId } });
        if (!comment) throw new NotFoundException('举报目标不存在');
        itemId = comment.itemId;
      }
      const item = await this.prisma.marketItem.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException('举报目标不存在');
      communityId = item.communityId;
    } else if (dto.targetType === 'user') {
      // P-293: user 类型举报，使用举报者当前小区作为 communityId
      const reporter = await this.prisma.user.findUnique({
        where: { id: reporterId },
        select: { currentCommunityId: true },
      });
      communityId = reporter?.currentCommunityId ?? null;
    } else if (dto.targetType === 'topic') {
      // P-232: topic 举报
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.targetId },
        select: { communityId: true },
      });
      if (!topic) throw new NotFoundException('举报目标不存在');
      communityId = topic.communityId;
    } else if (dto.targetType === 'topic_comment') {
      // P-232: topic_comment 举报
      const comment = await this.prisma.topicComment.findUnique({
        where: { id: dto.targetId },
        select: { topic: { select: { communityId: true } } },
      });
      if (!comment) throw new NotFoundException('举报目标不存在');
      communityId = comment.topic.communityId;
    } else if (dto.targetType === 'vote') {
      // P-232: vote 举报
      const vote = await this.prisma.vote.findUnique({
        where: { id: dto.targetId },
        select: { communityId: true },
      });
      if (!vote) throw new NotFoundException('举报目标不存在');
      communityId = vote.communityId;
    } else {
      throw new BadRequestException('不支持的举报目标类型');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description ?? null,
        communityId,
      },
    });

    return report;
  }

  async rateHelper(
    userId: string,
    eventId: string,
    dto: { targetUserId: string; rating: number; tags?: string[]; content?: string },
    communityId: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权操作该事件');
    }

    if (event.status !== 'completed') {
      throw new BadRequestException('只能对已完成的事件进行评价');
    }

    // Only creator or helper can rate
    const isCreator = event.creatorId === userId;
    const isHelper = event.selectedHelperId === userId;
    if (!isCreator && !isHelper) {
      throw new ForbiddenException('只有事件参与者可以评价');
    }

    // targetUserId must be the other participant
    const validTarget = isCreator ? event.selectedHelperId : event.creatorId;
    if (dto.targetUserId !== validTarget) {
      throw new BadRequestException('评价目标用户无效');
    }

    // P-229: 禁止覆盖已有评价
    const role = isCreator ? 'creator' : 'helper';
    const existing = await this.prisma.eventCompletionConfirmation.findUnique({
      where: { eventId_userId_role: { eventId, userId, role } },
    });
    if (existing?.rating) {
      throw new BadRequestException('已评价过，不能重复评价');
    }

    const confirmation = await this.prisma.eventCompletionConfirmation.upsert({
      where: { eventId_userId_role: { eventId, userId, role } },
      update: {
        rating: dto.rating,
        ratingContent: dto.content ?? null,
        ratingTags: dto.tags ?? undefined,
      },
      create: {
        eventId,
        userId,
        role,
        status: 'confirmed',
        confirmedAt: new Date(),
        rating: dto.rating,
        ratingContent: dto.content ?? null,
        ratingTags: dto.tags ?? undefined,
      },
    });

    // P-43: 返回字段名对齐 EventRateDto 契约 (content/tags 而非 ratingContent/ratingTags)
    const { ratingContent, ratingTags, ...rest } = confirmation;
    return { ...rest, targetUserId: dto.targetUserId, content: ratingContent, tags: ratingTags };
  }

  async getFeedbackLogs(eventId: string, communityId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException('事件不存在');
    }
    if (event.communityId !== communityId) {
      throw new ForbiddenException('无权访问该事件');
    }

    return this.prisma.feedbackProcessLog.findMany({
      where: { eventId, visibleToPublic: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// mock AI 点评：按关键词命中模板
function generateMockAiComment(title: string, description: string): string {
  const text = `${title}${description ?? ''}`;
  const templates: Array<{ keywords: string[]; comment: string }> = [
    { keywords: ['花坛', '绿化', '草坪', '花圃'], comment: '建议联系物业绿化部门评估修复方案。' },
    { keywords: ['电梯', '楼道', '楼梯'], comment: '建议报修物业工程部到现场查看处理。' },
    { keywords: ['停车', '车位', '车库'], comment: '建议反馈业委会协调停车管理规范。' },
    { keywords: ['垃圾', '卫生', '清洁'], comment: '建议联系物业保洁部门加强清理频次。' },
    { keywords: ['噪音', '扰民', '吵闹'], comment: '建议物业协调并反馈居委会进行调解。' },
    { keywords: ['水', '漏水', '管道'], comment: '建议立即联系物业维修组止漏并排查。' },
    { keywords: ['门禁', '安保', '保安'], comment: '建议反馈物业加强出入口管理。' },
  ];
  for (const t of templates) {
    if (t.keywords.some((k) => text.includes(k))) return t.comment;
  }
  return '建议联系物业核实情况并跟进处理。';
}

function topicTokenize(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
    .trim();
  const set = new Set<string>();
  for (const w of cleaned.split(/\s+/)) {
    if (w.length >= 2) set.add(w);
  }
  const chinese = cleaned.replace(/[a-z0-9]/g, '').replace(/\s+/g, '');
  for (let i = 0; i < chinese.length - 1; i++) {
    set.add(chinese.slice(i, i + 2));
  }
  return set;
}

function topicJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
