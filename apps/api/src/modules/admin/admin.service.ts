import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(NotificationsService) private notificationsService: NotificationsService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findFirst({
      where: { username, status: 'active' },
    });
    if (!admin) return null;
    const valid = admin.passwordHash && await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return null;
    return admin;
  }

  async getBadges() {
    return this.prisma.badge.findMany({ where: { status: 'active' } });
  }

  async createBadge(dto: { code: string; name: string; description: string; iconUrl: string; ruleJson?: any }) {
    return this.prisma.badge.create({ data: { ...dto, ruleJson: dto.ruleJson ?? {} } });
  }

  async awardBadge(userId: string, badgeId: string, communityId: string, adminId: string, reason?: string) {
    return this.prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        communityId,
        sourceType: reason ? `manual:${reason.slice(0, 100)}` : 'manual',
        awardedBy: adminId,
      },
    });
  }

  async getDashboard(communityId: string) {
    const [eventCount, marketCount, userCount, pendingReviews] = await Promise.all([
      this.prisma.event.count({ where: { communityId, deletedAt: null } }),
      this.prisma.marketItem.count({ where: { communityId, deletedAt: null } }),
      this.prisma.communityMember.count({ where: { communityId } }),
      this.prisma.aiReviewLog.count({ where: { result: 'manual_review' } }),
    ]);
    return { eventCount, marketCount, userCount, pendingReviews };
  }

  // === Content Review ===
  async getReviews(query?: { targetType?: string; status?: string }, pagination?: { skip: number; take: number }) {
    const where: any = {};
    if (query?.targetType) where.targetType = query.targetType;
    if (query?.status) where.result = query.status;
    const args: any = { where, orderBy: { createdAt: 'desc' } };
    if (pagination) { args.skip = pagination.skip; args.take = pagination.take; } else { args.take = 50; }
    return this.prisma.aiReviewLog.findMany(args);
  }

  async countReviews(query?: { targetType?: string; status?: string }) {
    const where: any = {};
    if (query?.targetType) where.targetType = query.targetType;
    if (query?.status) where.result = query.status;
    return this.prisma.aiReviewLog.count({ where });
  }

  async approveReview(adminId: string, reviewId: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    await this.prisma.aiReviewLog.update({
      where: { id: reviewId },
      data: { result: 'pass' },
    });
    // Update target status based on targetType
    if (review.targetType === 'event') {
      const event = await this.prisma.event.update({ where: { id: review.targetId }, data: { aiReviewStatus: 'pass', status: 'open' } });
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
      const item = await this.prisma.marketItem.update({ where: { id: review.targetId }, data: { aiReviewStatus: 'pass', status: 'on_sale' } });
      await this.notificationsService.create({
        userId: item.sellerId,
        communityId: item.communityId,
        type: 'review_result',
        title: '内容审核通过',
        content: `您发布的商品「${item.title}」已通过审核`,
        targetType: 'market_item',
        targetId: item.id,
      });
    }
    await this.logAudit(adminId, 'approve_review', review.targetType, review.targetId);
    return { id: reviewId, result: 'pass' };
  }

  async rejectReview(adminId: string, reviewId: string, reason?: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    await this.prisma.aiReviewLog.update({
      where: { id: reviewId },
      data: { result: 'reject' },
    });
    if (review.targetType === 'event') {
      const event = await this.prisma.event.update({ where: { id: review.targetId }, data: { aiReviewStatus: 'reject', status: 'rejected' } });
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
      const item = await this.prisma.marketItem.update({ where: { id: review.targetId }, data: { aiReviewStatus: 'reject', status: 'rejected' } });
      await this.notificationsService.create({
        userId: item.sellerId,
        communityId: item.communityId,
        type: 'review_result',
        title: '内容审核未通过',
        content: `您发布的商品「${item.title}」未通过审核${reason ? `，原因：${reason}` : ''}`,
        targetType: 'market_item',
        targetId: item.id,
      });
    }
    await this.logAudit(adminId, 'reject_review', review.targetType, review.targetId, { reason });
    return { id: reviewId, result: 'reject' };
  }

  async manualVisibleAdminOnly(adminId: string, reviewId: string) {
    const review = await this.prisma.aiReviewLog.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();

    // Set target content visibility to admin_only
    if (review.targetType === 'event') {
      await this.prisma.event.update({
        where: { id: review.targetId },
        data: { visibility: 'admin_only' },
      });
    } else if (review.targetType === 'market_item') {
      await this.prisma.marketItem.update({
        where: { id: review.targetId },
        data: { status: 'pending_review' },
      });
    } else if (review.targetType === 'event_comment') {
      await this.prisma.eventComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden' },
      });
    } else if (review.targetType === 'market_comment') {
      await this.prisma.marketComment.update({
        where: { id: review.targetId },
        data: { status: 'hidden' },
      });
    }

    await this.logAudit(adminId, 'manual_visible_admin_only', review.targetType, review.targetId);
    return { id: reviewId, visibility: 'admin_only' };
  }

  // === Verification Review ===
  async getVerifications(communityId: string, query?: { status?: string }, pagination?: { skip: number; take: number }) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    return this.prisma.verification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, userId: true, communityId: true, materialType: true,
        status: true, createdAt: true, user: { select: { id: true, nickname: true } },
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

  async getVerificationDetail(id: string) {
    return this.prisma.verification.findUnique({
      where: { id },
      select: {
        id: true, userId: true, communityId: true, materialType: true,
        maskedFileUrl: true, ocrResultJson: true, aiResultJson: true,
        status: true, rejectReason: true, consentSnapshot: true,
        createdAt: true, reviewedAt: true,
        user: { select: { id: true, nickname: true } },
      },
    });
  }

  async approveVerification(adminId: string, id: string) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v) throw new NotFoundException();
    await this.prisma.verification.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.prisma.communityMember.upsert({
      where: { userId_communityId: { userId: v.userId, communityId: v.communityId } },
      update: { verifyStatus: 'verified' },
      create: { userId: v.userId, communityId: v.communityId, role: 'resident', verifyStatus: 'verified' },
    });
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

  async rejectVerification(adminId: string, id: string, reason: string) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v) throw new NotFoundException();
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
  async getEvents(communityId: string, query?: { status?: string }, pagination?: { skip: number; take: number }) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    const args: any = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, type: true, status: true,
        aiReviewStatus: true, createdAt: true,
        creator: { select: { id: true, nickname: true } },
      },
    };
    if (pagination) { args.skip = pagination.skip; args.take = pagination.take; } else { args.take = 50; }
    return this.prisma.event.findMany(args);
  }

  async countEvents(communityId: string, query?: { status?: string }) {
    const where: any = { communityId, deletedAt: null };
    if (query?.status) where.status = query.status;
    return this.prisma.event.count({ where });
  }

  async hideEvent(adminId: string, id: string, communityId: string) {
    const event = await this.prisma.event.findUnique({ where: { id }, select: { communityId: true } });
    if (!event || event.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.event.update({ where: { id }, data: { status: 'closed' } });
    await this.logAudit(adminId, 'hide_event', 'event', id);
    return { id, status: 'closed' };
  }

  async restoreEvent(adminId: string, id: string, communityId: string) {
    const event = await this.prisma.event.findUnique({ where: { id }, select: { communityId: true } });
    if (!event || event.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.event.update({ where: { id }, data: { status: 'open' } });
    await this.logAudit(adminId, 'restore_event', 'event', id);
    return { id, status: 'open' };
  }

  async addFeedbackLog(adminId: string, eventId: string, dto: { status: string; content: string; images?: string[]; visibleToPublic?: boolean }) {
    // Resolve communityId from event
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    return this.prisma.feedbackProcessLog.create({
      data: {
        eventId,
        operatorId: adminId,
        communityId: event?.communityId ?? null,
        status: dto.status,
        content: dto.content,
        images: dto.images ?? [],
        visibleToPublic: dto.visibleToPublic ?? true,
      },
    });
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

  async createCommitteeMember(communityId: string, dto: { name: string; position: string; avatarUrl?: string; responsibility?: string }) {
    return this.prisma.committeeMember.create({
      data: { communityId, ...dto, claimStatus: 'unclaimed' },
    });
  }

  async updateCommitteeMember(id: string, dto: Partial<{ name: string; position: string; avatarUrl: string; responsibility: string }>, communityId: string) {
    const member = await this.prisma.committeeMember.findUnique({ where: { id }, select: { communityId: true } });
    if (!member || member.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return this.prisma.committeeMember.update({ where: { id }, data: dto });
  }

  async deleteCommitteeMember(adminId: string, id: string, communityId: string) {
    const member = await this.prisma.committeeMember.findUnique({ where: { id }, select: { communityId: true } });
    if (!member || member.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
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
    await this.prisma.committeeMemberClaim.update({
      where: { id: claimId },
      data: { status: 'approved', reviewedBy: adminId },
    });
    await this.prisma.committeeMember.update({
      where: { id: claim.committeeMemberId },
      data: { claimedUserId: claim.userId, claimStatus: 'claimed' },
    });
    await this.logAudit(adminId, 'approve_claim', 'committee_member_claim', claimId);
    return { id: claimId, status: 'approved' };
  }

  async rejectClaim(adminId: string, claimId: string, reason: string, communityId: string) {
    const claim = await this.prisma.committeeMemberClaim.findUnique({ where: { id: claimId }, select: { communityId: true } });
    if (!claim || claim.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.committeeMemberClaim.update({
      where: { id: claimId },
      data: { status: 'rejected', rejectReason: reason, reviewedBy: adminId },
    });
    await this.logAudit(adminId, 'reject_claim', 'committee_member_claim', claimId);
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

  async createVote(communityId: string, adminId: string, dto: {
    title: string; description?: string; voteType?: string; maxChoices?: number;
    onlyVerified?: boolean; resultVisibility?: string; isAnonymous?: boolean;
    startAt?: string; endAt?: string; options: string[];
  }) {
    return this.prisma.vote.create({
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
  }

  async updateVote(id: string, dto: Partial<{ title: string; description: string; endAt: string }>, communityId: string) {
    const vote = await this.prisma.vote.findUnique({ where: { id }, select: { communityId: true } });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return this.prisma.vote.update({ where: { id }, data: dto });
  }

  async publishVote(adminId: string, id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({ where: { id }, select: { communityId: true } });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.vote.update({ where: { id }, data: { status: 'published' } });
    await this.logAudit(adminId, 'publish_vote', 'vote', id);
    return { id, status: 'published' };
  }

  async closeVote(adminId: string, id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({ where: { id }, select: { communityId: true } });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.vote.update({ where: { id }, data: { status: 'closed' } });
    await this.logAudit(adminId, 'close_vote', 'vote', id);
    return { id, status: 'closed' };
  }

  async getVoteResults(id: string, communityId: string) {
    const vote = await this.prisma.vote.findUnique({ where: { id }, select: { communityId: true } });
    if (!vote || vote.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    const options = await this.prisma.voteOption.findMany({ where: { voteId: id }, orderBy: { sortOrder: 'asc' } });
    const allRecords = await this.prisma.voteRecord.findMany({ where: { voteId: id }, select: { selectedOptionIds: true } });
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

  async createBanner(dto: { communityId?: string; title: string; subtitle?: string; imageUrl: string; linkType?: string; linkId?: string; linkUrl?: string; position?: string; sortOrder?: number; startAt?: string; endAt?: string }) {
    return this.prisma.banner.create({
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
  }

  async updateBanner(id: string, dto: Partial<{ title: string; subtitle: string; imageUrl: string; sortOrder: number }>, communityId: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id }, select: { communityId: true } });
    if (!banner || banner.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async publishBanner(adminId: string, id: string, communityId: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id }, select: { communityId: true } });
    if (!banner || banner.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.banner.update({ where: { id }, data: { status: 'published' } });
    await this.logAudit(adminId, 'publish_banner', 'banner', id);
    return { id, status: 'published' };
  }

  async offlineBanner(adminId: string, id: string, communityId: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id }, select: { communityId: true } });
    if (!banner || banner.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
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

  async createServiceProvider(dto: {
    communityId: string; name: string; category: string; logoUrl?: string;
    coverUrl?: string; description?: string; contactText?: string;
    serviceArea?: string; recommendationSource?: string; sortOrder?: number;
  }) {
    return this.prisma.serviceProvider.create({
      data: {
        communityId: dto.communityId,
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
  }

  async updateServiceProvider(id: string, dto: Partial<{ name: string; category: string; description: string; sortOrder: number }>, communityId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { communityId: true } });
    if (!provider || provider.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return this.prisma.serviceProvider.update({ where: { id }, data: dto });
  }

  async publishServiceProvider(adminId: string, id: string, communityId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { communityId: true } });
    if (!provider || provider.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({ where: { id }, data: { status: 'published', reviewedBy: adminId } });
    await this.logAudit(adminId, 'publish_service_provider', 'service_provider', id);
    return { id, status: 'published' };
  }

  async offlineServiceProvider(adminId: string, id: string, communityId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { communityId: true } });
    if (!provider || provider.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({ where: { id }, data: { status: 'offline' } });
    await this.logAudit(adminId, 'offline_service_provider', 'service_provider', id);
    return { id, status: 'offline' };
  }

  async rejectServiceProvider(adminId: string, id: string, reason: string, communityId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { communityId: true } });
    if (!provider || provider.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.serviceProvider.update({ where: { id }, data: { status: 'rejected', reviewedBy: adminId } });
    await this.logAudit(adminId, 'reject_service_provider', 'service_provider', id, { reason });
    return { id, status: 'rejected' };
  }

  // === Rankings & Badges ===
  async recalculateRankings(communityId: string) {
    const contributions = await this.prisma.contributionRecord.findMany({
      where: { communityId, status: 'valid' },
      select: { userId: true, score: true, flowerCount: true },
    });

    const userMap = new Map<string, { score: number; flowerCount: number; helpCount: number }>();
    for (const c of contributions) {
      const existing = userMap.get(c.userId) ?? { score: 0, flowerCount: 0, helpCount: 0 };
      existing.score += c.score;
      existing.flowerCount += c.flowerCount;
      existing.helpCount += 1;
      userMap.set(c.userId, existing);
    }

    const sorted = [...userMap.entries()].sort((a, b) => b[1].score - a[1].score);
    const periodKey = new Date().toISOString().slice(0, 7);

    // Delete existing snapshots and recreate
    await this.prisma.rankingSnapshot.deleteMany({ where: { communityId, periodType: 'total' } });
    await this.prisma.rankingSnapshot.deleteMany({ where: { communityId, periodType: 'month', periodKey } });

    for (let i = 0; i < sorted.length; i++) {
      const [userId, data] = sorted[i];
      await this.prisma.rankingSnapshot.create({
        data: { communityId, periodType: 'total', periodKey: 'all', userId, rankNo: i + 1, score: data.score, flowerCount: data.flowerCount, helpCount: data.helpCount, badgeCount: 0 },
      });
    }

    for (let i = 0; i < sorted.length; i++) {
      const [userId, data] = sorted[i];
      await this.prisma.rankingSnapshot.create({
        data: { communityId, periodType: 'month', periodKey, userId, rankNo: i + 1, score: data.score, flowerCount: data.flowerCount, helpCount: data.helpCount, badgeCount: 0 },
      });
    }

    return { recalculated: sorted.length, periodKey };
  }

  // === Announcements ===
  async getAnnouncements(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.committeeAnnouncement.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countAnnouncements(communityId: string) {
    return this.prisma.committeeAnnouncement.count({ where: { communityId } });
  }

  async createAnnouncement(communityId: string, adminId: string, dto: { title: string; content: string; images?: string[] }) {
    return this.prisma.committeeAnnouncement.create({
      data: {
        communityId,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        publisherId: adminId,
        status: 'draft',
      },
    });
  }

  async updateAnnouncement(id: string, dto: Partial<{ title: string; content: string; isPinned: boolean; status: string }>, communityId: string) {
    const announcement = await this.prisma.committeeAnnouncement.findUnique({ where: { id }, select: { communityId: true } });
    if (!announcement || announcement.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    return this.prisma.committeeAnnouncement.update({ where: { id }, data: dto });
  }

  // === Audit Logs ===
  async getAuditLogs(query?: { operatorId?: string; targetType?: string }, pagination?: { skip: number; take: number }) {
    const where: any = {};
    if (query?.operatorId) where.operatorId = query.operatorId;
    if (query?.targetType) where.targetType = query.targetType;
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

  async updateShareTemplate(id: string, dto: { titleTemplate?: string; defaultImageUrl?: string; status?: string }) {
    return this.prisma.shareTemplate.update({
      where: { id },
      data: dto,
    });
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

  async createSocialGroup(dto: { communityId: string; title: string; description?: string; qrImageUrl: string; visibleTo?: string; sortOrder?: number }) {
    return this.prisma.communitySocialGroup.create({
      data: {
        communityId: dto.communityId,
        title: dto.title,
        description: dto.description,
        qrImageUrl: dto.qrImageUrl,
        visibleTo: dto.visibleTo ?? 'verified_only',
        sortOrder: dto.sortOrder ?? 0,
        status: 'active',
      },
    });
  }

  async updateSocialGroup(id: string, dto: Partial<{ title: string; description: string; qrImageUrl: string; visibleTo: string; sortOrder: number }>) {
    return this.prisma.communitySocialGroup.update({ where: { id }, data: dto });
  }

  async deleteSocialGroup(adminId: string, id: string) {
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
  async getReports(communityId: string, status?: string, pagination?: { skip: number; take: number }) {
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

  async dismissReport(adminId: string, reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('举报记录不存在');
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'dismissed', handledBy: adminId, handledAt: new Date() },
    });
    await this.logAudit(adminId, 'dismiss_report', 'report', reportId);
    return updated;
  }

  async takedownReport(adminId: string, reportId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('举报记录不存在');
    // Hide the target content
    if (report.targetType === 'event') {
      await this.prisma.event.update({ where: { id: report.targetId }, data: { status: 'hidden' } });
    } else if (report.targetType === 'market_item') {
      await this.prisma.marketItem.update({ where: { id: report.targetId }, data: { status: 'hidden' } });
    } else if (report.targetType === 'event_comment') {
      await this.prisma.eventComment.update({ where: { id: report.targetId }, data: { status: 'hidden' } });
    } else if (report.targetType === 'market_comment') {
      await this.prisma.marketComment.update({ where: { id: report.targetId }, data: { status: 'hidden' } });
    }
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'takedown', handledBy: adminId, handledAt: new Date() },
    });
    await this.logAudit(adminId, 'takedown_report', 'report', reportId, { reason, targetType: report.targetType, targetId: report.targetId });
    return updated;
  }

  async warnReport(adminId: string, reportId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('举报记录不存在');
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'warned', handledBy: adminId, handledAt: new Date() },
    });
    // Notify the reported user about the warning
    // Determine the reported user based on target type
    let reportedUserId: string | null = null;
    let communityId: string | null = report.communityId;
    if (report.targetType === 'event') {
      const event = await this.prisma.event.findUnique({ where: { id: report.targetId }, select: { creatorId: true } });
      reportedUserId = event?.creatorId ?? null;
    } else if (report.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({ where: { id: report.targetId }, select: { sellerId: true, communityId: true } });
      reportedUserId = item?.sellerId ?? null;
      communityId = item?.communityId ?? communityId;
    } else if (report.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({ where: { id: report.targetId }, select: { userId: true } });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({ where: { id: report.targetId }, select: { userId: true } });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'user') {
      reportedUserId = report.targetId;
    }
    if (reportedUserId && communityId) {
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
    await this.logAudit(adminId, 'warn_report', 'report', reportId, { reason, reportedUserId });
    return updated;
  }

  async banReport(adminId: string, reportId: string, reason?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('举报记录不存在');
    // Determine the reported user
    let reportedUserId: string | null = null;
    let communityId: string | null = report.communityId;
    if (report.targetType === 'event') {
      const event = await this.prisma.event.findUnique({ where: { id: report.targetId }, select: { creatorId: true, communityId: true } });
      reportedUserId = event?.creatorId ?? null;
      communityId = event?.communityId ?? communityId;
    } else if (report.targetType === 'market_item') {
      const item = await this.prisma.marketItem.findUnique({ where: { id: report.targetId }, select: { sellerId: true, communityId: true } });
      reportedUserId = item?.sellerId ?? null;
      communityId = item?.communityId ?? communityId;
    } else if (report.targetType === 'event_comment') {
      const comment = await this.prisma.eventComment.findUnique({ where: { id: report.targetId }, select: { userId: true } });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'market_comment') {
      const comment = await this.prisma.marketComment.findUnique({ where: { id: report.targetId }, select: { userId: true } });
      reportedUserId = comment?.userId ?? null;
    } else if (report.targetType === 'user') {
      reportedUserId = report.targetId;
    }
    // Update user status in community_members to banned
    if (reportedUserId && communityId) {
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
    await this.logAudit(adminId, 'ban_report', 'report', reportId, { reason, reportedUserId });
    return updated;
  }

  // === Market Items ===
  async getMarketItems(communityId: string, status?: string, pagination?: { skip: number; take: number }) {
    const where: any = { communityId, deletedAt: null };
    if (status) where.status = status;
    return this.prisma.marketItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, category: true, tradeType: true, status: true,
        price: true, aiReviewStatus: true, createdAt: true,
        seller: { select: { id: true, nickname: true } },
      },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async countMarketItems(communityId: string, status?: string) {
    const where: any = { communityId, deletedAt: null };
    if (status) where.status = status;
    return this.prisma.marketItem.count({ where });
  }

  async hideMarketItem(adminId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findUnique({ where: { id }, select: { communityId: true } });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.marketItem.update({ where: { id }, data: { status: 'hidden' } });
    await this.logAudit(adminId, 'hide_market_item', 'market_item', id);
    return { id, status: 'hidden' };
  }

  async restoreMarketItem(adminId: string, id: string, communityId: string) {
    const item = await this.prisma.marketItem.findUnique({ where: { id }, select: { communityId: true } });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.marketItem.update({ where: { id }, data: { status: 'on_sale' } });
    await this.logAudit(adminId, 'restore_market_item', 'market_item', id);
    return { id, status: 'on_sale' };
  }

  async rejectMarketItem(adminId: string, id: string, communityId: string, reason?: string) {
    const item = await this.prisma.marketItem.findUnique({ where: { id }, select: { communityId: true } });
    if (!item || item.communityId !== communityId) throw new ForbiddenException('无权操作该资源');
    await this.prisma.marketItem.update({
      where: { id },
      data: { status: 'rejected', aiReviewStatus: 'reject' },
    });
    await this.logAudit(adminId, 'reject_market_item', 'market_item', id, reason ? { reason } : undefined);
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
    await this.logAudit(userId, 'update_settings', 'system_setting', null, { keys: Object.keys(dto) });
    return this.getSettings();
  }

  // === Helpers ===
  private async logAudit(operatorId: string, action: string, targetType: string, targetId: string | null, detailJson?: any) {
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
}
