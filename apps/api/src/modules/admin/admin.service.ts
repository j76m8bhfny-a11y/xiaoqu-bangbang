import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { maybeAwardFirstOwnerBadge } from '../verifications/verifications.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(NotificationsService) private notificationsService: NotificationsService,
  ) {}

  // P-343: 内容长度校验（inline interface 导致 ValidationPipe 不生效，在 service 层补齐）
  private assertMaxLength(field: string, value: string | undefined | null, max: number) {
    if (value && value.length > max) {
      throw new BadRequestException(`${field}不能超过${max}字`);
    }
  }

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findFirst({
      where: { username, status: 'active' },
    });
    if (!admin) return null;
    const valid = admin.passwordHash && (await bcrypt.compare(password, admin.passwordHash));
    if (!valid) return null;
    return admin;
  }

  async getBadges() {
    return this.prisma.badge.findMany({ where: { status: 'active' } });
  }

  async createBadge(
    adminId: string,
    dto: {
      code: string;
      name: string;
      description: string;
      iconUrl: string;
      ruleJson?: any;
    },
  ) {
    const result = await this.prisma.badge.create({
      data: { ...dto, ruleJson: dto.ruleJson ?? {} },
    });
    await this.logAudit(adminId, 'create_badge', 'badge', result.id, dto);
    return result;
  }

  async awardBadge(
    userId: string,
    badgeId: string,
    communityId: string,
    adminId: string,
    reason?: string,
  ) {
    const result = await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        communityId,
        sourceType: reason ? `manual:${reason.slice(0, 100)}` : 'manual',
        awardedBy: adminId,
      },
    });
    await this.logAudit(adminId, 'award_badge', 'badge', badgeId, { userId, reason });
    return result;
  }

  async getDashboard(communityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEvents,
      marketCount,
      totalUsers,
      pendingEventReviews,
      pendingMarketReviews,
      pendingVerifications,
      pendingReports,
      totalCommunities,
      todayMutualHelp,
    ] = await Promise.all([
      this.prisma.event.count({ where: { communityId, deletedAt: null } }),
      this.prisma.marketItem.count({ where: { communityId, deletedAt: null } }),
      this.prisma.communityMember.count({ where: { communityId } }),
      this.prisma.event.count({
        where: { communityId, aiReviewStatus: 'manual_review', deletedAt: null },
      }),
      this.prisma.marketItem.count({
        where: { communityId, aiReviewStatus: 'manual_review', deletedAt: null },
      }),
      this.prisma.communityMember.count({
        where: { communityId, verifyStatus: 'pending' },
      }),
      this.prisma.report.count({
        where: { communityId, status: 'pending' },
      }),
      this.prisma.community.count(),
      this.prisma.event.count({
        where: { communityId, createdAt: { gte: today }, deletedAt: null },
      }),
    ]);

    const pendingReviews = pendingEventReviews + pendingMarketReviews;

    // Build todoItems from pending items
    const todoItems: { type: string; id: string; summary: string; createdAt: string }[] = [];
    if (pendingReviews > 0) {
      todoItems.push({
        type: 'review',
        id: 'pending-reviews',
        summary: `${pendingReviews} 条内容待审核`,
        createdAt: new Date().toISOString(),
      });
    }
    if (pendingVerifications > 0) {
      todoItems.push({
        type: 'verification',
        id: 'pending-verifications',
        summary: `${pendingVerifications} 位用户待认证`,
        createdAt: new Date().toISOString(),
      });
    }
    if (pendingReports > 0) {
      todoItems.push({
        type: 'report',
        id: 'pending-reports',
        summary: `${pendingReports} 条举报待处理`,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      pendingReviews,
      pendingVerifications,
      pendingClaims: 0,
      highRiskFeedback: 0,
      pendingReports,
      totalUsers,
      totalEvents,
      totalCommunities,
      todayMutualHelp,
      todoItems,
    };
  }

  // === Content Review ===
  // 策略：AI 通过即放行（不进人工复审队列）。本接口默认只列出 result='manual_review' 的记录。
  // 如需查看历史 pass/reject，前端显式传 query.status='pass'/'reject'/'all'。
  async getReviews(
    communityId: string,
    query?: { targetType?: string; status?: string },
    pagination?: { skip: number; take: number },
  ) {
    // P-348: 'all' 显示全部状态，不传默认 manual_review
    const result = query?.status === 'all' ? undefined : (query?.status ?? 'manual_review');

    // P-302: aiReviewLog 无 communityId 字段，需通过目标表过滤
    const [events, items] = await Promise.all([
      this.prisma.event.findMany({
        where: { communityId, aiReviewStatus: result },
        select: { id: true },
      }),
      this.prisma.marketItem.findMany({
        where: { communityId, aiReviewStatus: result },
        select: { id: true },
      }),
    ]);
    const targetIds = [...events.map((e) => e.id), ...items.map((i) => i.id)];
    if (targetIds.length === 0) return [];

    const where: any = { targetId: { in: targetIds }, result };
    if (query?.targetType) where.targetType = query.targetType;

    const args: any = { where, orderBy: { createdAt: 'desc' } };
    if (pagination) {
      args.skip = pagination.skip;
      args.take = pagination.take;
    } else {
      args.take = 50;
    }
    return this.prisma.aiReviewLog.findMany(args);
  }

  async countReviews(communityId: string, query?: { targetType?: string; status?: string }) {
    const result = query?.status === 'all' ? undefined : (query?.status ?? 'manual_review');

    const [events, items] = await Promise.all([
      this.prisma.event.findMany({
        where: { communityId, aiReviewStatus: result },
        select: { id: true },
      }),
      this.prisma.marketItem.findMany({
        where: { communityId, aiReviewStatus: result },
        select: { id: true },
      }),
    ]);
    const targetIds = [...events.map((e) => e.id), ...items.map((i) => i.id)];
    if (targetIds.length === 0) return 0;

    const where: any = { targetId: { in: targetIds }, result };
    if (query?.targetType) where.targetType = query.targetType;

    return this.prisma.aiReviewLog.count({ where });
  }

  async approveReview(adminId: string, reviewId: string, communityId: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    await this.assertReviewInCommunity(review, communityId);
    await this.prisma.aiReviewLog.update({
      where: { id: reviewId },
      data: { result: 'pass' },
    });
    // Update target status based on targetType
    if (review.targetType === 'event') {
      const event = await this.prisma.event.update({
        where: { id: review.targetId },
        data: { aiReviewStatus: 'pass', status: 'open' },
      });
      // Notify content creator
      await this.notificationsService.create({
        userId: event.creatorId,
        communityId: event.communityId,
        type: 'review_result',
        title: '内容审核通过',
        content: `您发布的事件「${event.title}」已通过审核`,
        targetType: 'event',
        targetId: event.id,
      });
    } else if (review.targetType === 'market_item') {
      const item = await this.prisma.marketItem.update({
        where: { id: review.targetId },
        data: { aiReviewStatus: 'pass', status: 'on_sale' },
      });
      await this.notificationsService.create({
        userId: item.sellerId,
        communityId: item.communityId,
        type: 'review_result',
        title: '内容审核通过',
        content: `您发布的商品「${item.title}」已通过审核`,
        targetType: 'market_item',
        targetId: item.id,
      });
    } else if (review.targetType === 'event_comment') {
      // P-304: 补全评论类型审核
      const comment = await this.prisma.eventComment.update({
        where: { id: review.targetId },
        data: { status: 'visible', aiReviewStatus: 'pass' },
        select: { userId: true, eventId: true },
      });
      const event = await this.prisma.event.findUnique({
        where: { id: comment.eventId },
        select: { communityId: true },
      });
      await this.notificationsService.create({
        userId: comment.userId,
        communityId: event?.communityId ?? communityId,
        type: 'review_result',
        title: '评论审核通过',
        content: '您的评论已通过审核',
        targetType: 'event_comment',
        targetId: review.targetId,
      });
    } else if (review.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.update({
        where: { id: review.targetId },
        data: { status: 'visible', aiReviewStatus: 'pass' },
        select: { userId: true, itemId: true },
      });
      const item = await this.prisma.marketItem.findUnique({
        where: { id: comment.itemId },
        select: { communityId: true },
      });
      await this.notificationsService.create({
        userId: comment.userId,
        communityId: item?.communityId ?? communityId,
        type: 'review_result',
        title: '评论审核通过',
        content: '您的评论已通过审核',
        targetType: 'market_comment',
        targetId: review.targetId,
      });
    }
    await this.logAudit(adminId, 'approve_review', review.targetType, review.targetId);
    return { id: reviewId, result: 'pass' };
  }

  async rejectReview(adminId: string, reviewId: string, communityId: string, reason?: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    await this.assertReviewInCommunity(review, communityId);
    await this.prisma.aiReviewLog.update({
      where: { id: reviewId },
      data: { result: 'reject' },
    });
    if (review.targetType === 'event') {
      const event = await this.prisma.event.update({
        where: { id: review.targetId },
        data: { aiReviewStatus: 'reject', status: 'rejected' },
      });
      await this.notificationsService.create({
        userId: event.creatorId,
        communityId: event.communityId,
        type: 'review_result',
        title: '内容审核未通过',
        content: `您发布的事件「${event.title}」未通过审核${reason ? `，原因：${reason}` : ''}`,
        targetType: 'event',
        targetId: event.id,
      });
    } else if (review.targetType === 'market_item') {
      const item = await this.prisma.marketItem.update({
        where: { id: review.targetId },
        data: { aiReviewStatus: 'reject', status: 'rejected' },
      });
      await this.notificationsService.create({
        userId: item.sellerId,
        communityId: item.communityId,
        type: 'review_result',
        title: '内容审核未通过',
        content: `您发布的商品「${item.title}」未通过审核${reason ? `，原因：${reason}` : ''}`,
        targetType: 'market_item',
        targetId: item.id,
      });
    } else if (review.targetType === 'event_comment') {
      // P-304: 补全评论类型审核
      const comment = await this.prisma.eventComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden', aiReviewStatus: 'reject' },
        select: { userId: true, eventId: true },
      });
      const event = await this.prisma.event.findUnique({
        where: { id: comment.eventId },
        select: { communityId: true },
      });
      await this.notificationsService.create({
        userId: comment.userId,
        communityId: event?.communityId ?? communityId,
        type: 'review_result',
        title: '评论审核未通过',
        content: `您的评论未通过审核${reason ? `，原因：${reason}` : ''}`,
        targetType: 'event_comment',
        targetId: review.targetId,
      });
    } else if (review.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden', aiReviewStatus: 'reject' },
        select: { userId: true, itemId: true },
      });
      const item = await this.prisma.marketItem.findUnique({
        where: { id: comment.itemId },
        select: { communityId: true },
      });
      await this.notificationsService.create({
        userId: comment.userId,
        communityId: item?.communityId ?? communityId,
        type: 'review_result',
        title: '评论审核未通过',
        content: `您的评论未通过审核${reason ? `，原因：${reason}` : ''}`,
        targetType: 'market_comment',
        targetId: review.targetId,
      });
    }
    await this.logAudit(adminId, 'reject_review', review.targetType, review.targetId, { reason });
    return { id: reviewId, result: 'reject' };
  }

  async manualVisibleAdminOnly(adminId: string, reviewId: string, communityId: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    await this.assertReviewInCommunity(review, communityId);

    // Set target content visibility to admin_only
    let creatorId: string | null = null;
    if (review.targetType === 'event') {
      const event = await this.prisma.event.update({
        where: { id: review.targetId },
        data: { visibility: 'admin_only' },
        select: { creatorId: true },
      });
      creatorId = event.creatorId;
    } else if (review.targetType === 'market_item') {
      const item = await this.prisma.marketItem.update({
        where: { id: review.targetId },
        data: { status: 'pending_review' },
        select: { sellerId: true },
      });
      creatorId = item.sellerId;
    } else if (review.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden' },
        select: { userId: true },
      });
      creatorId = comment.userId;
    } else if (review.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden' },
        select: { userId: true },
      });
      creatorId = comment.userId;
    }

    // P-303: 通知内容创建者已由管理员人工审核
    if (creatorId) {
      await this.notificationsService.create({
        userId: creatorId,
        communityId,
        type: 'system',
        title: '内容审核结果',
        content: '您的内容已由管理员人工审核',
        targetType: review.targetType,
        targetId: review.targetId,
      });
    }

    await this.logAudit(adminId, 'manual_visible_admin_only', review.targetType, review.targetId);
    return { id: reviewId, visibility: 'admin_only' };
  }

  // P-302: 校验审核记录的目标内容属于当前 admin 的小区
  private async assertReviewInCommunity(
    review: { targetType: string; targetId: string },
    communityId: string,
  ) {
    let targetCommunityId: string | null = null;
    if (review.targetType === 'event') {
      const event = await this.prisma.event.findUnique({
        where: { id: review.targetId },
        select: { communityId: true },
      });
      targetCommunityId = event?.communityId ?? null;
    } else if (review.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({
        where: { id: review.targetId },
        select: { communityId: true },
      });
      targetCommunityId = item?.communityId ?? null;
    } else if (review.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({
        where: { id: review.targetId },
        select: { event: { select: { communityId: true } } },
      });
      targetCommunityId = comment?.event.communityId ?? null;
    } else if (review.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({
        where: { id: review.targetId },
        select: { item: { select: { communityId: true } } },
      });
      targetCommunityId = comment?.item.communityId ?? null;
    }
    if (targetCommunityId !== communityId) throw new ForbiddenException('无权操作该资源');
  }

  // === Verification Review ===
  async getVerifications(
    communityId: string,
    query?: { status?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    return this.prisma.verification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        communityId: true,
        materialType: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, nickname: true } },
      },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countVerifications(communityId: string, query?: { status?: string }) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    return this.prisma.verification.count({ where });
  }

  async getVerificationDetail(id: string, communityId: string) {
    const v = await this.prisma.verification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        communityId: true,
        materialType: true,
        maskedFileUrl: true,
        ocrResultJson: true,
        aiResultJson: true,
        status: true,
        rejectReason: true,
        consentSnapshot: true,
        createdAt: true,
        reviewedAt: true,
        user: { select: { id: true, nickname: true } },
      },
    });
    if (!v || v.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return v;
  }

  async approveVerification(adminId: string, id: string, communityId: string) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v || v.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    // P-309: 已处理的认证不可重复操作
    if (v.status !== 'pending_review') throw new BadRequestException('该认证申请已处理');
    await this.prisma.verification.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.prisma.communityMember.upsert({
      where: { userId_communityId: { userId: v.userId, communityId: v.communityId } },
      update: { verifyStatus: 'verified' },
      create: {
        userId: v.userId,
        communityId: v.communityId,
        role: 'resident',
        verifyStatus: 'verified',
      },
    });
    await maybeAwardFirstOwnerBadge(this.prisma, v.userId, v.communityId);
    // Notify user
    await this.notificationsService.create({
      userId: v.userId,
      communityId: v.communityId,
      type: 'review_result',
      title: '认证审核通过',
      content: '您的业主认证已通过审核',
      targetType: 'verification',
      targetId: id,
    });
    await this.logAudit(adminId, 'approve_verification', 'verification', id);
    return { id, status: 'approved' };
  }

  async rejectVerification(adminId: string, id: string, communityId: string, reason: string) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v || v.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    // P-309: 已处理的认证不可重复操作
    if (v.status !== 'pending_review') throw new BadRequestException('该认证申请已处理');
    await this.prisma.verification.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason, reviewedAt: new Date() },
    });
    // Notify user
    await this.notificationsService.create({
      userId: v.userId,
      communityId: v.communityId,
      type: 'review_result',
      title: '认证审核未通过',
      content: `您的业主认证未通过审核，原因：${reason}`,
      targetType: 'verification',
      targetId: id,
    });
    await this.logAudit(adminId, 'reject_verification', 'verification', id, { reason });
    return { id, status: 'rejected' };
  }

  // === Event Management ===
  async getEvents(
    communityId: string,
    query?: { status?: string; type?: string; keyword?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    // P-349: 补全 type/keyword 筛选
    if (query?.type) where.type = query.type;
    if (query?.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const args: any = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        aiReviewStatus: true,
        createdAt: true,
        creator: { select: { id: true, nickname: true } },
      },
    };
    if (pagination) {
      args.skip = pagination.skip;
      args.take = pagination.take;
    } else {
      args.take = 50;
    }
    return this.prisma.event.findMany(args);
  }

  async countEvents(
    communityId: string,
    query?: { status?: string; type?: string; keyword?: string },
  ) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    if (query?.type) where.type = query.type;
    if (query?.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    return this.prisma.event.count({ where });
  }

  async hideEvent(adminId: string, id: string, communityId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!event || event.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.event.update({ where: { id }, data: { status: 'closed' } });
    await this.logAudit(adminId, 'hide_event', 'event', id);
    return { id, status: 'closed' };
  }

  async restoreEvent(adminId: string, id: string, communityId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!event || event.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.event.update({ where: { id }, data: { status: 'open' } });
    await this.logAudit(adminId, 'restore_event', 'event', id);
    return { id, status: 'open' };
  }

  async addFeedbackLog(
    adminId: string,
    eventId: string,
    communityId: string,
    dto: { status: string; content: string; images?: string[]; visibleToPublic?: boolean },
  ) {
    // P-310/P-312: event 不存在返回 404，不属于当前小区返回 403
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { communityId: true },
    });
    if (!event) throw new NotFoundException('事件不存在');
    if (event.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.feedbackProcessLog.create({
      data: {
        eventId,
        operatorId: adminId,
        communityId: event.communityId,
        status: dto.status,
        content: dto.content,
        images: dto.images ?? [],
        visibleToPublic: dto.visibleToPublic ?? true,
      },
    });
    await this.logAudit(adminId, 'add_feedback_log', 'event', eventId, dto);
    return result;
  }

  // === Committee Management ===
  async getCommitteeMembers(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.committeeMember.findMany({
      where: { communityId, status: 'active' },
      orderBy: { createdAt: 'asc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countCommitteeMembers(communityId: string) {
    return this.prisma.committeeMember.count({ where: { communityId, status: 'active' } });
  }

  async createCommitteeMember(
    adminId: string,
    communityId: string,
    dto: { name: string; position: string; avatarUrl?: string; responsibility?: string },
  ) {
    const result = await this.prisma.committeeMember.create({
      data: { communityId, ...dto, claimStatus: 'unclaimed' },
    });
    await this.logAudit(adminId, 'create_committee_member', 'committee_member', result.id, dto);
    return result;
  }

  async updateCommitteeMember(
    adminId: string,
    id: string,
    dto: Partial<{ name: string; position: string; avatarUrl: string; responsibility: string }>,
    communityId: string,
  ) {
    const member = await this.prisma.committeeMember.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!member || member.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.committeeMember.update({ where: { id }, data: dto });
    await this.logAudit(adminId, 'update_committee_member', 'committee_member', id, dto);
    return result;
  }

  async deleteCommitteeMember(adminId: string, id: string, communityId: string) {
    const member = await this.prisma.committeeMember.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!member || member.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    await this.prisma.committeeMember.update({ where: { id }, data: { status: 'inactive' } });
    await this.logAudit(adminId, 'delete_committee_member', 'committee_member', id);
    return { id, status: 'inactive' };
  }

  async getCommitteeClaims(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.committeeMemberClaim.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countCommitteeClaims(communityId: string) {
    return this.prisma.committeeMemberClaim.count({ where: { communityId } });
  }

  async approveClaim(adminId: string, claimId: string, communityId: string) {
    const claim = await this.prisma.committeeMemberClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException();
    if (claim.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    // P-318: 已处理的认领不可重复操作
    if (claim.status !== 'pending') throw new BadRequestException('该认领申请已处理');
    await this.prisma.committeeMemberClaim.update({
      where: { id: claimId },
      data: { status: 'approved', reviewedBy: adminId },
    });
    await this.prisma.committeeMember.update({
      where: { id: claim.committeeMemberId },
      data: { claimedUserId: claim.userId, claimStatus: 'claimed' },
    });
    await this.logAudit(adminId, 'approve_claim', 'committee_member_claim', claimId);
    // P-317: 通知申请人认领申请已通过
    await this.notificationsService.create({
      userId: claim.userId,
      communityId: claim.communityId,
      type: 'system',
      title: '认领申请已通过',
      content: '您的业委会成员认领申请已通过',
      targetType: 'committee_member_claim',
      targetId: claimId,
    });
    return { id: claimId, status: 'approved' };
  }

  async rejectClaim(adminId: string, claimId: string, reason: string, communityId: string) {
    const claim = await this.prisma.committeeMemberClaim.findUnique({
      where: { id: claimId },
      select: { communityId: true, status: true, userId: true },
    });
    if (!claim || claim.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    // P-318: 已处理的认领不可重复操作
    if (claim.status !== 'pending') throw new BadRequestException('该认领申请已处理');
    await this.prisma.committeeMemberClaim.update({
      where: { id: claimId },
      data: { status: 'rejected', rejectReason: reason, reviewedBy: adminId },
    });
    await this.logAudit(adminId, 'reject_claim', 'committee_member_claim', claimId);
    // P-317: 通知申请人认领申请被驳回
    await this.notificationsService.create({
      userId: claim.userId,
      communityId: claim.communityId,
      type: 'system',
      title: '认领申请被驳回',
      content: `您的业委会成员认领申请被驳回${reason ? `，原因：${reason}` : ''}`,
      targetType: 'committee_member_claim',
      targetId: claimId,
    });
    return { id: claimId, status: 'rejected' };
  }

  // === Vote Management ===
  async getVotes(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.vote.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countVotes(communityId: string) {
    return this.prisma.vote.count({ where: { communityId } });
  }

  async createVote(
    communityId: string,
    adminId: string,
    dto: {
      title: string;
      description?: string;
      voteType?: string;
      maxChoices?: number;
      onlyVerified?: boolean;
      resultVisibility?: string;
      isAnonymous?: boolean;
      startAt?: string;
      endAt?: string;
      options: string[];
    },
  ) {
    this.assertMaxLength('标题', dto.title, 50);
    this.assertMaxLength('描述', dto.description, 500);
    if (dto.options && dto.options.length > 30) {
      throw new BadRequestException('选项不能超过30个');
    }
    const result = await this.prisma.vote.create({
      data: {
        communityId,
        title: dto.title,
        description: dto.description ?? '',
        voteType: dto.voteType ?? 'single',
        maxChoices: dto.maxChoices ?? 1,
        onlyVerified: dto.onlyVerified ?? true,
        onlyVerifiedLocked: dto.onlyVerified ?? true,
        resultVisibility: dto.resultVisibility ?? 'after_vote',
        isAnonymous: dto.isAnonymous ?? false,
        startAt: dto.startAt ? new Date(dto.startAt) : new Date(),
        endAt: dto.endAt ? new Date(dto.endAt) : new Date('2099-12-31'),
        status: 'draft',
        createdBy: adminId,
        options: { create: dto.options.map((content, i) => ({ content, sortOrder: i })) },
      },
      include: { options: true },
    });
    await this.logAudit(adminId, 'create_vote', 'vote', result.id, dto);
    return result;
  }

  async updateVote(
    adminId: string,
    id: string,
    dto: Partial<{
      title: string;
      description: string;
      voteType: string;
      maxChoices: number;
      resultVisibility: string;
      isAnonymous: boolean;
      startAt: string;
      endAt: string;
      status: string;
    }>,
    communityId: string,
  ) {
    this.assertMaxLength('标题', dto.title, 50);
    this.assertMaxLength('描述', dto.description, 500);
    const vote = await this.prisma.vote.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.vote.update({ where: { id }, data: dto });
    await this.logAudit(adminId, 'update_vote', 'vote', id, dto);
    return result;
  }

  async publishVote(adminId: string, id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { id },
      select: { communityId: true, title: true },
    });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.vote.update({ where: { id }, data: { status: 'published' } });
    // P-320: 通知小区成员投票已发布
    const members = await this.prisma.communityMember.findMany({
      where: { communityId, verifyStatus: 'verified' },
      select: { userId: true },
    });
    if (members.length > 0) {
      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          communityId,
          type: 'vote',
          title: '投票已发布',
          content: `小区投票「${vote.title}」已开始，请参与投票`,
          targetType: 'vote',
          targetId: id,
        })),
      });
    }
    await this.logAudit(adminId, 'publish_vote', 'vote', id);
    return { id, status: 'published' };
  }

  async closeVote(adminId: string, id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { id },
      select: { communityId: true, title: true },
    });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.vote.update({ where: { id }, data: { status: 'closed' } });
    // P-320: 通知小区成员投票已结束
    const members = await this.prisma.communityMember.findMany({
      where: { communityId, verifyStatus: 'verified' },
      select: { userId: true },
    });
    if (members.length > 0) {
      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          communityId,
          type: 'vote',
          title: '投票已结束',
          content: `小区投票「${vote.title}」已结束`,
          targetType: 'vote',
          targetId: id,
        })),
      });
    }
    await this.logAudit(adminId, 'close_vote', 'vote', id);
    return { id, status: 'closed' };
  }

  async getVoteResults(id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    const options = await this.prisma.voteOption.findMany({
      where: { voteId: id },
      orderBy: { sortOrder: 'asc' },
    });
    const allRecords = await this.prisma.voteRecord.findMany({
      where: { voteId: id },
      select: { selectedOptionIds: true },
    });
    const countMap = new Map<string, number>();
    for (const r of allRecords) {
      const ids = r.selectedOptionIds as string[];
      for (const oid of ids) {
        countMap.set(oid, (countMap.get(oid) ?? 0) + 1);
      }
    }
    return options.map((o) => ({ id: o.id, content: o.content, count: countMap.get(o.id) ?? 0 }));
  }

  // === Banner Management ===
  async getBanners(communityId?: string, pagination?: { skip: number; take: number }) {
    const where: any = { OR: [{ communityId }, { communityId: null }] };
    return this.prisma.banner.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countBanners(communityId?: string) {
    const where: any = { OR: [{ communityId }, { communityId: null }] };
    return this.prisma.banner.count({ where });
  }

  async createBanner(
    adminId: string,
    dto: {
      communityId?: string;
      title: string;
      subtitle?: string;
      imageUrl: string;
      linkType?: string;
      linkId?: string;
      linkUrl?: string;
      position?: string;
      sortOrder?: number;
      startAt?: string;
      endAt?: string;
    },
  ) {
    this.assertMaxLength('标题', dto.title, 30);
    this.assertMaxLength('副标题', dto.subtitle, 30);
    const result = await this.prisma.banner.create({
      data: {
        communityId: dto.communityId,
        title: dto.title,
        subtitle: dto.subtitle,
        imageUrl: dto.imageUrl,
        linkType: dto.linkType ?? 'none',
        linkId: dto.linkId,
        linkUrl: dto.linkUrl,
        position: dto.position ?? 'home_top',
        sortOrder: dto.sortOrder ?? 0,
        status: 'draft',
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
      },
    });
    await this.logAudit(adminId, 'create_banner', 'banner', result.id, dto);
    return result;
  }

  async updateBanner(
    adminId: string,
    id: string,
    dto: Partial<{ title: string; subtitle: string; imageUrl: string; sortOrder: number }>,
  ) {
    this.assertMaxLength('标题', dto.title, 30);
    this.assertMaxLength('副标题', dto.subtitle, 30);
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.banner.update({ where: { id }, data: dto });
    await this.logAudit(adminId, 'update_banner', 'banner', id, dto);
    return result;
  }

  async publishBanner(adminId: string, id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new ForbiddenException('无权操作该资源');
    await this.prisma.banner.update({ where: { id }, data: { status: 'published' } });
    await this.logAudit(adminId, 'publish_banner', 'banner', id);
    return { id, status: 'published' };
  }

  async offlineBanner(adminId: string, id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new ForbiddenException('无权操作该资源');
    await this.prisma.banner.update({ where: { id }, data: { status: 'offline' } });
    await this.logAudit(adminId, 'offline_banner', 'banner', id);
    return { id, status: 'offline' };
  }

  // === Service Provider Management ===
  async getServiceProviders(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.serviceProvider.findMany({
      where: { communityId },
      orderBy: { sortOrder: 'asc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countServiceProviders(communityId: string) {
    return this.prisma.serviceProvider.count({ where: { communityId } });
  }

  async createServiceProvider(
    adminId: string,
    communityId: string,
    dto: {
      name: string;
      category: string;
      logoUrl?: string;
      coverUrl?: string;
      description?: string;
      contactText?: string;
      serviceArea?: string;
      recommendationSource?: string;
      sortOrder?: number;
    },
  ) {
    this.assertMaxLength('名称', dto.name, 30);
    this.assertMaxLength('描述', dto.description, 500);
    const result = await this.prisma.serviceProvider.create({
      data: {
        communityId,
        name: dto.name,
        category: dto.category,
        logoUrl: dto.logoUrl,
        coverUrl: dto.coverUrl,
        description: dto.description ?? '',
        contactText: dto.contactText ?? '',
        serviceArea: dto.serviceArea,
        recommendationSource: dto.recommendationSource ?? 'platform',
        sortOrder: dto.sortOrder ?? 0,
        status: 'pending_review',
      },
    });
    await this.logAudit(adminId, 'create_service_provider', 'service_provider', result.id, dto);
    return result;
  }

  async updateServiceProvider(
    adminId: string,
    id: string,
    dto: Partial<{ name: string; category: string; description: string; sortOrder: number }>,
  ) {
    this.assertMaxLength('名称', dto.name, 30);
    this.assertMaxLength('描述', dto.description, 500);
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.serviceProvider.update({ where: { id }, data: dto });
    await this.logAudit(adminId, 'update_service_provider', 'service_provider', id, dto);
    return result;
  }

  async publishServiceProvider(adminId: string, id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({
      where: { id },
      data: { status: 'published', reviewedBy: adminId },
    });
    await this.logAudit(adminId, 'publish_service_provider', 'service_provider', id);
    return { id, status: 'published' };
  }

  async offlineServiceProvider(adminId: string, id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({ where: { id }, data: { status: 'offline' } });
    await this.logAudit(adminId, 'offline_service_provider', 'service_provider', id);
    return { id, status: 'offline' };
  }

  async rejectServiceProvider(adminId: string, id: string, reason: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({
      where: { id },
      data: { status: 'rejected', reviewedBy: adminId },
    });
    await this.logAudit(adminId, 'reject_service_provider', 'service_provider', id, { reason });
    return { id, status: 'rejected' };
  }

  // === Rankings & Badges ===
  async recalculateRankings(adminId: string, communityId: string) {
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // P-22/P-72: 月榜需按 occurredAt 过滤当月，总榜不限
    const [totalContributions, monthlyContributions] = await Promise.all([
      this.prisma.contributionRecord.findMany({
        where: { communityId, status: 'valid' },
        select: { userId: true, score: true, flowerCount: true },
      }),
      this.prisma.contributionRecord.findMany({
        where: {
          communityId,
          status: 'valid',
          occurredAt: { gte: monthStart, lt: nextMonthStart },
        },
        select: { userId: true, score: true, flowerCount: true },
      }),
    ]);

    const buildSorted = (
      contributions: { userId: string; score: number; flowerCount: number }[],
    ) => {
      const userMap = new Map<string, { score: number; flowerCount: number; helpCount: number }>();
      for (const c of contributions) {
        const existing = userMap.get(c.userId) ?? { score: 0, flowerCount: 0, helpCount: 0 };
        existing.score += c.score;
        existing.flowerCount += c.flowerCount;
        existing.helpCount += 1;
        userMap.set(c.userId, existing);
      }
      return [...userMap.entries()].sort((a, b) => b[1].score - a[1].score);
    };

    const totalSorted = buildSorted(totalContributions);
    const monthlySorted = buildSorted(monthlyContributions);

    // Delete existing snapshots and recreate
    await this.prisma.rankingSnapshot.deleteMany({ where: { communityId, periodType: 'total' } });
    await this.prisma.rankingSnapshot.deleteMany({
      where: { communityId, periodType: 'month', periodKey },
    });

    // P-281: 查询所有相关用户的徽章数
    const allUserIds = [
      ...new Set([...totalSorted.map(([id]) => id), ...monthlySorted.map(([id]) => id)]),
    ];
    const userBadgeCounts =
      allUserIds.length > 0
        ? await this.prisma.userBadge.groupBy({
            by: ['userId'],
            where: { userId: { in: allUserIds } },
            _count: { id: true },
          })
        : [];
    const badgeCountMap = new Map(userBadgeCounts.map((ub) => [ub.userId, ub._count.id]));

    for (let i = 0; i < totalSorted.length; i++) {
      const [userId, data] = totalSorted[i];
      await this.prisma.rankingSnapshot.create({
        data: {
          communityId,
          periodType: 'total',
          periodKey: 'total',
          userId,
          rankNo: i + 1,
          score: data.score,
          flowerCount: data.flowerCount,
          helpCount: data.helpCount,
          badgeCount: badgeCountMap.get(userId) ?? 0,
        },
      });
    }

    for (let i = 0; i < monthlySorted.length; i++) {
      const [userId, data] = monthlySorted[i];
      await this.prisma.rankingSnapshot.create({
        data: {
          communityId,
          periodType: 'month',
          periodKey,
          userId,
          rankNo: i + 1,
          score: data.score,
          flowerCount: data.flowerCount,
          helpCount: data.helpCount,
          badgeCount: badgeCountMap.get(userId) ?? 0,
        },
      });
    }

    await this.logAudit(adminId, 'recalculate_rankings', 'community', communityId, null);
    return { recalculated: totalSorted.length, periodKey };
  }

  // === Announcements ===
  async getAnnouncements(communityId: string, pagination?: { skip: number; take: number }) {
    const announcements = await this.prisma.committeeAnnouncement.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });

    // P-169: 手动 join adminUser 获取 publisherNickname
    const publisherIds = [...new Set(announcements.map((a) => a.publisherId))];
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: publisherIds } },
      select: { id: true, username: true },
    });
    const nicknameMap = new Map(admins.map((a) => [a.id, a.username]));

    return announcements.map((a) => ({
      ...a,
      publisherNickname: nicknameMap.get(a.publisherId) ?? '未知',
    }));
  }

  async countAnnouncements(communityId: string) {
    return this.prisma.committeeAnnouncement.count({ where: { communityId } });
  }

  async createAnnouncement(
    communityId: string,
    adminId: string,
    dto: { title: string; content: string; images?: string[] },
  ) {
    this.assertMaxLength('标题', dto.title, 50);
    this.assertMaxLength('内容', dto.content, 2000);
    const result = await this.prisma.committeeAnnouncement.create({
      data: {
        communityId,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        publisherId: adminId,
        status: 'draft',
      },
    });
    await this.logAudit(adminId, 'create_announcement', 'announcement', result.id, dto);
    return result;
  }

  async updateAnnouncement(
    adminId: string,
    id: string,
    dto: Partial<{ title: string; content: string; isPinned: boolean; status: string }>,
    communityId: string,
  ) {
    this.assertMaxLength('标题', dto.title, 50);
    this.assertMaxLength('内容', dto.content, 2000);
    const announcement = await this.prisma.committeeAnnouncement.findUnique({
      where: { id },
      select: { communityId: true, status: true },
    });
    if (!announcement || announcement.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');

    // P-262: 首次发布时设置 publishedAt
    const updateData: any = { ...dto };
    if (dto.status === 'published' && announcement.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const result = await this.prisma.committeeAnnouncement.update({
      where: { id },
      data: updateData,
    });
    await this.logAudit(adminId, 'update_announcement', 'announcement', id, dto);

    // P-82: 公告首次发布时通知小区全体成员
    if (dto.status === 'published' && announcement.status !== 'published') {
      const members = await this.prisma.communityMember.findMany({
        where: { communityId, deletedAt: null },
        select: { userId: true },
      });
      if (members.length > 0) {
        await this.prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            communityId,
            type: 'announcement',
            title: '小区公告',
            content: result.title,
            targetType: 'announcement',
            targetId: id,
          })),
        });
      }
    }

    return result;
  }

  // === Audit Logs ===
  async getAuditLogs(
    query?: { operatorId?: string; targetType?: string; targetId?: string },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = {};
    if (query?.operatorId) where.operatorId = query.operatorId;
    if (query?.targetType) where.targetType = query.targetType;
    // P-297: 支持按 targetId 查询
    if (query?.targetId) where.targetId = query.targetId;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take ?? 100,
    });
  }

  async countAuditLogs(query?: { operatorId?: string; targetType?: string }) {
    const where: any = {};
    if (query?.operatorId) where.operatorId = query.operatorId;
    if (query?.targetType) where.targetType = query.targetType;
    return this.prisma.auditLog.count({ where });
  }

  // === Share Logs ===
  async getShareLogs(communityId?: string, pagination?: { skip: number; take: number }) {
    const where: any = {};
    if (communityId) where.communityId = communityId;
    return this.prisma.shareLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take ?? 100,
    });
  }

  async countShareLogs(communityId?: string) {
    const where: any = {};
    if (communityId) where.communityId = communityId;
    return this.prisma.shareLog.count({ where });
  }

  async getShareTemplates() {
    return this.prisma.shareTemplate.findMany({ where: { status: 'active' } });
  }

  async updateShareTemplate(
    adminId: string,
    id: string,
    dto: { titleTemplate?: string; defaultImageUrl?: string; status?: string },
  ) {
    const result = await this.prisma.shareTemplate.update({
      where: { id },
      data: dto,
    });
    await this.logAudit(adminId, 'update_share_template', 'share_template', id, dto);
    return result;
  }

  // === Social Groups ===
  async getSocialGroups(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.communitySocialGroup.findMany({
      where: { communityId },
      orderBy: { sortOrder: 'asc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countSocialGroups(communityId: string) {
    return this.prisma.communitySocialGroup.count({ where: { communityId } });
  }

  async createSocialGroup(
    adminId: string,
    communityId: string,
    dto: {
      title: string;
      description?: string;
      qrImageUrl: string;
      contactText?: string;
      visibleTo?: string;
      sortOrder?: number;
    },
  ) {
    const result = await this.prisma.communitySocialGroup.create({
      data: {
        communityId,
        title: dto.title,
        description: dto.description,
        qrImageUrl: dto.qrImageUrl,
        contactText: dto.contactText,
        visibleTo: dto.visibleTo ?? 'verified_only',
        sortOrder: dto.sortOrder ?? 0,
        status: 'active',
      },
    });
    await this.logAudit(adminId, 'create_social_group', 'social_group', result.id, dto);
    return result;
  }

  async updateSocialGroup(
    adminId: string,
    id: string,
    communityId: string,
    dto: Partial<{
      title: string;
      description: string;
      qrImageUrl: string;
      contactText: string;
      visibleTo: string;
      sortOrder: number;
      status: string;
    }>,
  ) {
    // P-339: 校验社群属于当前 admin 的小区
    const group = await this.prisma.communitySocialGroup.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!group || group.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    const result = await this.prisma.communitySocialGroup.update({ where: { id }, data: dto });
    await this.logAudit(adminId, 'update_social_group', 'social_group', id, dto);
    return result;
  }

  async deleteSocialGroup(adminId: string, id: string, communityId: string) {
    // P-340: 校验社群属于当前 admin 的小区
    const group = await this.prisma.communitySocialGroup.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!group || group.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.communitySocialGroup.delete({ where: { id } });
    await this.logAudit(adminId, 'delete_social_group', 'community_social_group', id);
    return { id };
  }

  // === Contributions ===
  async getContributions(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.contributionRecord.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take ?? 50,
    });
  }

  async countContributions(communityId: string) {
    return this.prisma.contributionRecord.count({ where: { communityId } });
  }

  // === Reports ===
  async getReports(
    communityId: string,
    status?: string,
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId };
    if (status) where.status = status;
    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countReports(communityId: string, status?: string) {
    const where: any = { communityId };
    if (status) where.status = status;
    return this.prisma.report.count({ where });
  }

  async dismissReport(adminId: string, reportId: string, communityId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'dismissed', handledBy: adminId, handledAt: new Date() },
    });
    // P-38: 通知举报者处理结果
    await this.notificationsService.create({
      userId: report.reporterId,
      communityId,
      type: 'system',
      title: '举报处理结果',
      content: '您的举报经审核未违规，已驳回处理',
      targetType: 'report',
      targetId: reportId,
    });
    await this.logAudit(adminId, 'dismiss_report', 'report', reportId);
    return updated;
  }

  async takedownReport(adminId: string, reportId: string, communityId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    // Hide the target content
    // P-315: event/market_item 用 'closed'（schema 无 'hidden'），comment 用 'hidden'
    if (report.targetType === 'event') {
      await this.prisma.event.update({
        where: { id: report.targetId },
        data: { status: 'closed' },
      });
    } else if (report.targetType === 'market_item') {
      await this.prisma.marketItem.update({
        where: { id: report.targetId },
        data: { status: 'closed' },
      });
    } else if (report.targetType === 'event_comment') {
      await this.prisma.eventComment.update({
        where: { id: report.targetId },
        data: { status: 'hidden' },
      });
    } else if (report.targetType === 'market_comment') {
      await this.prisma.marketComment.update({
        where: { id: report.targetId },
        data: { status: 'hidden' },
      });
    }
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'takedown', handledBy: adminId, handledAt: new Date() },
    });
    // P-38: 通知内容创建者内容被下架
    let contentOwnerId: string | null = null;
    if (report.targetType === 'event') {
      const event = await this.prisma.event.findUnique({
        where: { id: report.targetId },
        select: { creatorId: true },
      });
      contentOwnerId = event?.creatorId ?? null;
    } else if (report.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({
        where: { id: report.targetId },
        select: { sellerId: true },
      });
      contentOwnerId = item?.sellerId ?? null;
    } else if (report.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      contentOwnerId = comment?.userId ?? null;
    } else if (report.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      contentOwnerId = comment?.userId ?? null;
    }
    if (contentOwnerId) {
      await this.notificationsService.create({
        userId: contentOwnerId,
        communityId,
        type: 'system',
        title: '内容下架通知',
        content: `您发布的内容因被举报已被下架${reason ? `，原因：${reason}` : ''}，如有异议请联系管理员`,
        targetType: report.targetType,
        targetId: report.targetId,
      });
    }
    // P-38: 通知举报者处理结果
    await this.notificationsService.create({
      userId: report.reporterId,
      communityId,
      type: 'system',
      title: '举报处理结果',
      content: '您的举报已核实，相关内容已被下架处理',
      targetType: 'report',
      targetId: reportId,
    });
    await this.logAudit(adminId, 'takedown_report', 'report', reportId, {
      reason,
      targetType: report.targetType,
      targetId: report.targetId,
    });
    return updated;
  }

  async warnReport(adminId: string, reportId: string, communityId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'warned', handledBy: adminId, handledAt: new Date() },
    });
    // Notify the reported user about the warning
    // Determine the reported user based on target type
    let reportedUserId: string | null = null;
    if (report.targetType === 'event') {
      const event = await this.prisma.event.findUnique({
        where: { id: report.targetId },
        select: { creatorId: true },
      });
      reportedUserId = event?.creatorId ?? null;
    } else if (report.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({
        where: { id: report.targetId },
        select: { sellerId: true },
      });
      reportedUserId = item?.sellerId ?? null;
    } else if (report.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'user') {
      reportedUserId = report.targetId;
    }
    if (reportedUserId) {
      await this.notificationsService.create({
        userId: reportedUserId,
        communityId,
        type: 'system',
        title: '违规警告',
        content: `您发布的内容因被举报收到警告${reason ? `，原因：${reason}` : ''}，请遵守社区规范`,
        targetType: report.targetType,
        targetId: report.targetId,
      });
    }
    // P-38: 通知举报者处理结果
    await this.notificationsService.create({
      userId: report.reporterId,
      communityId,
      type: 'system',
      title: '举报处理结果',
      content: '您的举报已核实，相关用户已收到警告',
      targetType: 'report',
      targetId: reportId,
    });
    await this.logAudit(adminId, 'warn_report', 'report', reportId, { reason, reportedUserId });
    return updated;
  }

  async banReport(adminId: string, reportId: string, communityId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.communityId !== communityId)
      throw new ForbiddenException('无权操作该资源');
    // Determine the reported user
    let reportedUserId: string | null = null;
    if (report.targetType === 'event') {
      const event = await this.prisma.event.findUnique({
        where: { id: report.targetId },
        select: { creatorId: true },
      });
      reportedUserId = event?.creatorId ?? null;
    } else if (report.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({
        where: { id: report.targetId },
        select: { sellerId: true },
      });
      reportedUserId = item?.sellerId ?? null;
    } else if (report.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({
        where: { id: report.targetId },
        select: { userId: true },
      });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'user') {
      reportedUserId = report.targetId;
    }
    // Update user status in community_members to banned
    if (reportedUserId) {
      await this.prisma.communityMember.updateMany({
        where: { userId: reportedUserId, communityId },
        data: { role: 'banned' },
      });
      // Notify the banned user
      await this.notificationsService.create({
        userId: reportedUserId,
        communityId,
        type: 'system',
        title: '账号封禁通知',
        content: `您因违反社区规范已被封禁${reason ? `，原因：${reason}` : ''}`,
        targetType: report.targetType,
        targetId: report.targetId,
      });
    }
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'banned', handledBy: adminId, handledAt: new Date() },
    });
    // P-38: 通知举报者处理结果
    await this.notificationsService.create({
      userId: report.reporterId,
      communityId,
      type: 'system',
      title: '举报处理结果',
      content: '您的举报已核实，相关用户已被封禁',
      targetType: 'report',
      targetId: reportId,
    });
    await this.logAudit(adminId, 'ban_report', 'report', reportId, { reason, reportedUserId });
    return updated;
  }

  // === Market Items ===
  async getMarketItems(
    communityId: string,
    status?: string,
    category?: string,
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { communityId, deletedAt: null };
    if (status) where.status = status;
    // P-350: 补全 category 筛选
    if (category) where.category = category;
    return this.prisma.marketItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        tradeType: true,
        status: true,
        price: true,
        aiReviewStatus: true,
        createdAt: true,
        seller: { select: { id: true, nickname: true } },
      },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countMarketItems(communityId: string, status?: string, category?: string) {
    const where: any = { communityId, deletedAt: null };
    if (status) where.status = status;
    if (category) where.category = category;
    return this.prisma.marketItem.count({ where });
  }

  async hideMarketItem(adminId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    // P-315: PRD 要求 status→closed，而非 hidden（schema 无 hidden 枚举值）
    await this.prisma.marketItem.update({ where: { id }, data: { status: 'closed' } });
    await this.logAudit(adminId, 'hide_market_item', 'market_item', id);
    return { id, status: 'closed' };
  }

  async restoreMarketItem(adminId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.marketItem.update({ where: { id }, data: { status: 'on_sale' } });
    await this.logAudit(adminId, 'restore_market_item', 'market_item', id);
    return { id, status: 'on_sale' };
  }

  async rejectMarketItem(adminId: string, id: string, communityId: string, reason?: string) {
    const item = await this.prisma.marketItem.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.marketItem.update({
      where: { id },
      data: { status: 'rejected', aiReviewStatus: 'reject' },
    });
    await this.logAudit(
      adminId,
      'reject_market_item',
      'market_item',
      id,
      reason ? { reason } : undefined,
    );
    return { id, status: 'rejected' };
  }

  // === System Settings ===
  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async updateSettings(userId: string, dto: Record<string, string | undefined>) {
    const updates: Promise<any>[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      updates.push(
        this.prisma.systemSetting.upsert({
          where: { key },
          update: { value, updatedBy: userId },
          create: { key, value, updatedBy: userId },
        }),
      );
    }
    await Promise.all(updates);
    await this.logAudit(userId, 'update_settings', 'system_setting', null, {
      keys: Object.keys(dto),
    });
    return this.getSettings();
  }

  // === Topics 议事管理 ===
  async listTopics(
    communityId: string,
    status: string | undefined,
    pagination: { skip: number; take: number },
    search?: string,
  ) {
    const where: any = { communityId };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.topic.count({ where }),
    ]);
    return { items, total };
  }

  async getTopicById(id: string, communityId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!topic || topic.communityId !== communityId) {
      throw new NotFoundException('议题不存在');
    }
    return topic;
  }

  async closeTopic(adminId: string, id: string, communityId: string, summary: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');
    if (topic.status === 'closed') return topic;

    const updated = await this.prisma.topic.update({
      where: { id },
      data: {
        status: 'closed',
        closedSummary: summary,
        closedAt: new Date(),
        closedBy: adminId,
      },
    });
    await this.logAudit(adminId, 'close_topic', 'topic', id, { summary });

    // 给所有事件发布者发通知
    const events = await this.prisma.event.findMany({
      where: { topicId: id },
      select: { creatorId: true, title: true },
    });
    const creatorIds = Array.from(new Set(events.map((e) => e.creatorId)));
    for (const creatorId of creatorIds) {
      await this.notificationsService.create({
        userId: creatorId,
        communityId,
        type: 'topic_closed',
        title: '议题已完结',
        content: `议题「${topic.title}」已完结，欢迎为处理结果打分`,
        targetType: 'topic',
        targetId: id,
      });
    }
    return updated;
  }

  async reopenTopic(adminId: string, id: string, communityId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');
    const updated = await this.prisma.topic.update({
      where: { id },
      data: { status: 'open', closedAt: null, closedBy: null, closedSummary: null },
    });
    await this.logAudit(adminId, 'reopen_topic', 'topic', id);
    return updated;
  }

  async rejectTopic(adminId: string, id: string, communityId: string, reason?: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.communityId !== communityId) throw new NotFoundException('议题不存在');
    // P-313: 更新 status 为 rejected 并通知创建者
    const updated = await this.prisma.topic.update({
      where: { id },
      data: { status: 'rejected', aiReviewStatus: 'reject' },
    });
    await this.notificationsService.create({
      userId: topic.createdBy,
      communityId,
      type: 'review_result',
      title: '议题审核未通过',
      content: reason ? `您的议题未通过审核，原因：${reason}` : '您的议题未通过审核',
      targetType: 'topic',
      targetId: id,
    });
    await this.logAudit(adminId, 'reject_topic', 'topic', id, reason ? { reason } : undefined);
    return updated;
  }

  async moveEvent(
    adminId: string,
    topicId: string,
    eventId: string,
    targetTopicId: string,
    communityId: string,
  ) {
    const [source, target, event] = await Promise.all([
      this.prisma.topic.findUnique({ where: { id: topicId } }),
      this.prisma.topic.findUnique({ where: { id: targetTopicId } }),
      this.prisma.event.findUnique({ where: { id: eventId } }),
    ]);
    if (!source || source.communityId !== communityId) throw new NotFoundException('源议题不存在');
    if (!target || target.communityId !== communityId)
      throw new NotFoundException('目标议题不存在');
    if (!event || event.topicId !== topicId) throw new NotFoundException('事件不在源议题下');

    await this.prisma.$transaction([
      this.prisma.event.update({ where: { id: eventId }, data: { topicId: targetTopicId } }),
      this.prisma.topic.update({ where: { id: topicId }, data: { eventCount: { decrement: 1 } } }),
      this.prisma.topic.update({
        where: { id: targetTopicId },
        data: { eventCount: { increment: 1 } },
      }),
    ]);
    await this.logAudit(adminId, 'move_event', 'event', eventId, {
      from: topicId,
      to: targetTopicId,
    });
    return { eventId, targetTopicId };
  }

  async mergeTopics(
    adminId: string,
    sourceTopicId: string,
    targetTopicId: string,
    communityId: string,
  ) {
    if (sourceTopicId === targetTopicId) throw new ForbiddenException('源议题与目标议题不能相同');
    const [source, target] = await Promise.all([
      this.prisma.topic.findUnique({ where: { id: sourceTopicId } }),
      this.prisma.topic.findUnique({ where: { id: targetTopicId } }),
    ]);
    if (!source || source.communityId !== communityId) throw new NotFoundException('源议题不存在');
    if (!target || target.communityId !== communityId)
      throw new NotFoundException('目标议题不存在');

    const sourceEvents = await this.prisma.event.count({ where: { topicId: sourceTopicId } });
    const sourceComments = await this.prisma.topicComment.count({
      where: { topicId: sourceTopicId },
    });

    await this.prisma.$transaction([
      this.prisma.event.updateMany({
        where: { topicId: sourceTopicId },
        data: { topicId: targetTopicId },
      }),
      this.prisma.topicComment.updateMany({
        where: { topicId: sourceTopicId },
        data: { topicId: targetTopicId },
      }),
      this.prisma.topic.update({
        where: { id: targetTopicId },
        data: {
          eventCount: { increment: sourceEvents },
          commentCount: { increment: sourceComments },
        },
      }),
      // 删除引用源议题的合并建议，避免 FK 阻塞 topic.delete
      this.prisma.topicMergeSuggestion.deleteMany({
        where: { OR: [{ sourceTopicId }, { targetTopicId: sourceTopicId }] },
      }),
      this.prisma.topic.delete({ where: { id: sourceTopicId } }),
    ]);
    await this.logAudit(adminId, 'merge_topics', 'topic', sourceTopicId, { targetTopicId });
    // P-314: 通知源议题创建者议题已合并
    await this.notificationsService.create({
      userId: source.createdBy,
      communityId: source.communityId,
      type: 'system',
      title: '议题已合并',
      content: `您的议题「${source.title}」已合并到「${target.title}」`,
      targetType: 'topic',
      targetId: targetTopicId,
    });
    return { sourceTopicId, targetTopicId };
  }

  // === AI 功能开关 ===
  async getAiSettings() {
    const keys = ['ai_topic_suggest', 'ai_topic_merge', 'ai_event_comment', 'ai_content_review'];
    const settings = await this.prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    const map = new Map(settings.map((s) => [s.key, s.value === 'true']));
    return {
      aiTopicSuggest: map.get('ai_topic_suggest') ?? true,
      aiTopicMerge: map.get('ai_topic_merge') ?? true,
      aiEventComment: map.get('ai_event_comment') ?? true,
      aiContentReview: map.get('ai_content_review') ?? true,
    };
  }

  async updateAiSettings(
    adminId: string,
    dto: Partial<{
      aiTopicSuggest: boolean;
      aiTopicMerge: boolean;
      aiEventComment: boolean;
      aiContentReview: boolean;
    }>,
  ) {
    const mapping: Record<string, string> = {
      aiTopicSuggest: 'ai_topic_suggest',
      aiTopicMerge: 'ai_topic_merge',
      aiEventComment: 'ai_event_comment',
      aiContentReview: 'ai_content_review',
    };
    for (const [k, dbKey] of Object.entries(mapping)) {
      const v = (dto as any)[k];
      if (typeof v !== 'boolean') continue;
      await this.prisma.systemSetting.upsert({
        where: { key: dbKey },
        update: { value: String(v), updatedBy: adminId },
        create: { key: dbKey, value: String(v), updatedBy: adminId },
      });
    }
    await this.logAudit(adminId, 'update_ai_settings', 'system_setting', null, { dto });
    return this.getAiSettings();
  }

  // === Topic Merge Suggestions ===
  async listMergeSuggestions(communityId: string, status: string = 'pending') {
    return this.prisma.topicMergeSuggestion.findMany({
      where: { communityId, status },
      include: {
        sourceTopic: { select: { id: true, title: true, eventCount: true } },
        targetTopic: { select: { id: true, title: true, eventCount: true } },
      },
      orderBy: { similarity: 'desc' },
    });
  }

  async approveMergeSuggestion(adminId: string, id: string, communityId: string) {
    const suggestion = await this.prisma.topicMergeSuggestion.findUnique({ where: { id } });
    if (!suggestion || suggestion.communityId !== communityId) {
      throw new NotFoundException('合并建议不存在');
    }
    if (suggestion.status !== 'pending') {
      throw new ForbiddenException('该建议已处理');
    }
    // 记录返回值（合并后建议本身会被 mergeTopics 清理）
    const snapshot = {
      id: suggestion.id,
      sourceTopicId: suggestion.sourceTopicId,
      targetTopicId: suggestion.targetTopicId,
      similarity: suggestion.similarity,
      status: 'approved' as const,
    };
    // 复用 mergeTopics 业务（source → target），同时删除关联建议
    await this.mergeTopics(
      adminId,
      suggestion.sourceTopicId,
      suggestion.targetTopicId,
      communityId,
    );
    await this.logAudit(adminId, 'approve_merge_suggestion', 'topic_merge_suggestion', id);
    return snapshot;
  }

  async rejectMergeSuggestion(adminId: string, id: string, communityId: string) {
    const suggestion = await this.prisma.topicMergeSuggestion.findUnique({ where: { id } });
    if (!suggestion || suggestion.communityId !== communityId) {
      throw new NotFoundException('合并建议不存在');
    }
    const updated = await this.prisma.topicMergeSuggestion.update({
      where: { id },
      data: { status: 'rejected', resolvedAt: new Date(), resolvedBy: adminId },
    });
    await this.logAudit(adminId, 'reject_merge_suggestion', 'topic_merge_suggestion', id);
    return updated;
  }

  // === Helpers ===
  private async logAudit(
    operatorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    detailJson?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        operatorId,
        operatorRole: 'admin',
        action,
        targetType,
        targetId,
        detailJson: detailJson ?? {},
      },
    });
  }

  // === 小区申请审批 ===
  async listCommunityApplications(
    query: { status?: string },
    pagination: { skip: number; take: number },
  ) {
    const where: any = {};
    if (query.status) where.status = query.status;
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
    return { items: items.map((i) => this.toAdminApplicationDto(i)), total };
  }

  async getCommunityApplicationDetail(id: string) {
    const app = await this.prisma.communityApplication.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    if (!app) throw new NotFoundException('申请不存在');
    const supporters = await this.prisma.communityApplicationSupport.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    return {
      ...this.toAdminApplicationDto(app),
      supporters: supporters.map((s) => ({
        userId: s.userId,
        nickname: s.user.nickname,
        avatarUrl: s.user.avatarUrl,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  private toAdminApplicationDto(item: any) {
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
      materialType: item.materialType,
      materialUrl: item.materialUrl,
      doorPhotoUrl: item.doorPhotoUrl ?? undefined,
      status: item.status,
      rejectReason: item.rejectReason ?? undefined,
      supportCount: item.supportCount,
      approvedCommunityId: item.approvedCommunityId ?? undefined,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    };
  }

  async approveCommunityApplication(applicationId: string, adminUserId: string) {
    const app = await this.prisma.communityApplication.findUnique({
      where: { id: applicationId },
      include: { supports: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'pending') throw new ForbiddenException('该申请已处理');

    // 仅 platform_admin 可审批
    const admin = await this.prisma.adminUser.findFirst({
      where: { userId: adminUserId, status: 'active' },
    });
    if (!admin || admin.role !== 'platform_admin') {
      throw new ForbiddenException('仅平台管理员可审批小区申请');
    }

    // 先 upsert 徽章模板（事务外，节省事务时长）
    const founderBadge = await this.prisma.badge.upsert({
      where: { code: 'founder' },
      update: {},
      create: {
        code: 'founder',
        name: '创始人',
        description: '申请并成功开通该小区',
        ruleJson: { type: 'community_founder' },
      },
    });
    const seedBadge = await this.prisma.badge.upsert({
      where: { code: 'seed_contributor' },
      update: {},
      create: {
        code: 'seed_contributor',
        name: '种子贡献者',
        description: '助力小区开通',
        ruleJson: { type: 'community_seed' },
      },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // 0. 乐观锁：把状态从 pending 改为 approving，防止两个 admin 同时审批导致重复建社区。
      //    updateMany 的 count = 0 说明已被他人处理（或状态已变）。
      const lock = await tx.communityApplication.updateMany({
        where: { id: applicationId, status: 'pending' },
        data: { status: 'approving' },
      });
      if (lock.count === 0) {
        throw new ForbiddenException('该申请已被处理，请刷新');
      }

      // 1. 创建 Community
      const community = await tx.community.create({
        data: {
          name: app.name,
          city: app.city,
          district: app.district,
          address: app.address,
        },
      });
      const communityId = community.id;

      // 2. 申请人为已认证成员
      await tx.communityMember.create({
        data: {
          userId: app.applicantId,
          communityId,
          role: 'resident',
          verifyStatus: 'verified',
        },
      });

      // 3. 写一条 approved verification 记录
      await tx.verification.create({
        data: {
          userId: app.applicantId,
          communityId,
          materialType: app.materialType,
          originalFileUrl: app.materialUrl,
          status: 'approved',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      // 4. 若申请人当前没有 currentCommunity，自动设置
      const applicantUser = await tx.user.findUnique({
        where: { id: app.applicantId },
        select: { currentCommunityId: true },
      });
      if (!applicantUser?.currentCommunityId) {
        await tx.user.update({
          where: { id: app.applicantId },
          data: { currentCommunityId: communityId },
        });
      }

      // 5. 助力人作为 unverified 成员加入
      const supporterIds = app.supports.map((s) => s.userId);
      if (supporterIds.length > 0) {
        await tx.communityMember.createMany({
          data: supporterIds.map((userId) => ({
            userId,
            communityId,
            role: 'resident',
            verifyStatus: 'unverified',
          })),
          skipDuplicates: true,
        });

        // 6. 助力人发种子贡献者徽章 + 贡献记录
        await tx.userBadge.createMany({
          data: supporterIds.map((userId) => ({
            userId,
            communityId,
            badgeId: seedBadge.id,
            sourceType: 'community_application',
            sourceId: applicationId,
            awardedBy: adminUserId,
          })),
          skipDuplicates: true,
        });
        await tx.contributionRecord.createMany({
          data: supporterIds.map((userId) => ({
            userId,
            communityId,
            sourceType: 'community_application',
            sourceId: applicationId,
            action: 'community_founding',
            score: 5,
            flowerCount: 0,
            reason: '助力小区开通',
            status: 'valid',
            occurredAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // 7. 申请人发创始人徽章
      await tx.userBadge.create({
        data: {
          userId: app.applicantId,
          communityId,
          badgeId: founderBadge.id,
          sourceType: 'community_application',
          sourceId: applicationId,
          awardedBy: adminUserId,
        },
      });

      // P-265: 申请人发 community_founding 贡献记录 (score=10)
      await tx.contributionRecord.create({
        data: {
          userId: app.applicantId,
          communityId,
          sourceType: 'community_application',
          sourceId: applicationId,
          action: 'community_founding',
          score: 10,
          flowerCount: 0,
          reason: '发起小区开通',
          status: 'valid',
          occurredAt: new Date(),
        },
      });

      // 8. 更新申请状态
      await tx.communityApplication.update({
        where: { id: applicationId },
        data: {
          status: 'approved',
          approvedCommunityId: communityId,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      return { communityId, supporterCount: supporterIds.length };
    });

    // 申请人作为第 1 位认证业主，发首批业主徽章
    await maybeAwardFirstOwnerBadge(this.prisma, app.applicantId, result.communityId);

    // 事务外：通知申请人（助力人按用户要求不通知）
    await this.notificationsService.create({
      userId: app.applicantId,
      communityId: result.communityId,
      type: 'announcement',
      title: '您申请的小区已开通',
      content: `恭喜！「${app.name}」小区已开通，欢迎邀请邻居加入。`,
      targetType: 'community',
      targetId: result.communityId,
    });

    await this.logAudit(
      adminUserId,
      'approve_community_application',
      'community_application',
      applicationId,
      {
        communityId: result.communityId,
      },
    );

    return { id: applicationId, status: 'approved', communityId: result.communityId };
  }

  async rejectCommunityApplication(applicationId: string, adminUserId: string, reason: string) {
    const app = await this.prisma.communityApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'pending') throw new ForbiddenException('该申请已处理');

    const admin = await this.prisma.adminUser.findFirst({
      where: { userId: adminUserId, status: 'active' },
    });
    if (!admin || admin.role !== 'platform_admin') {
      throw new ForbiddenException('仅平台管理员可审批小区申请');
    }

    await this.prisma.communityApplication.update({
      where: { id: applicationId },
      data: {
        status: 'rejected',
        rejectReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    });

    // P-266: 通知申请人申请被驳回
    await this.notificationsService.create({
      userId: app.applicantId,
      type: 'system',
      title: '小区申请被驳回',
      content: `您的小区申请已被驳回${reason ? `，原因：${reason}` : ''}`,
      targetType: 'community_application',
      targetId: applicationId,
    });

    await this.logAudit(
      adminUserId,
      'reject_community_application',
      'community_application',
      applicationId,
      {
        reason,
      },
    );

    return { id: applicationId, status: 'rejected' };
  }
}
