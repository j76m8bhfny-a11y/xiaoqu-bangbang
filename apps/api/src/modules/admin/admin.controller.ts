import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { TopicsService } from '../topics/topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipCurrentCommunity } from '../../common/decorators/skip-current-community.decorator';
import { UpdateShareTemplateDto } from './dto/update-share-template.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { getPaginationParams } from '../../common/helpers/pagination';
import { Public, PlatformAdminOnly } from '../../common/constants';
import { ErrorCodes, type ApiResponse, type AdminDashboardDto } from '@xiaoqu-bangbang/shared';
import { JwtService } from '@nestjs/jwt';

@Controller('admin')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard, AdminGuard)
export class AdminController {
  constructor(
    @Inject(AdminService) private adminService: AdminService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(TopicsService) private topicsService: TopicsService,
  ) {}

  @Post('auth/login')
  @Public()
  async login(@Body() body: { username: string; password: string }) {
    const admin = await this.adminService.login(body.username, body.password);
    if (!admin) {
      return { code: ErrorCodes.UNAUTHORIZED, message: '用户名或密码错误', data: null };
    }
    const token = this.jwtService.sign({
      sub: admin.userId ?? admin.id,
      openid: `admin_${admin.id}`,
    });
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: {
        token,
        adminUser: {
          id: admin.id,
          userId: admin.userId,
          username: admin.username,
          role: admin.role,
          communityId: admin.communityId,
          status: admin.status,
          createdAt: admin.createdAt,
        },
      },
    };
  }

  @Get('dashboard')
  async getDashboard(
    @CurrentCommunityId() communityId: string,
  ): Promise<ApiResponse<AdminDashboardDto>> {
    const data = await this.adminService.getDashboard(communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Content Review ===
  @Get('reviews')
  async getReviews(
    @CurrentCommunityId() communityId: string,
    @Query() query: { targetType?: string; status?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getReviews(communityId, query, { skip, take }),
      this.adminService.countReviews(communityId, query),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('reviews/:id/approve')
  async approveReview(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.approveReview(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('reviews/:id/reject')
  async rejectReview(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { rejectReason?: string },
  ) {
    const data = await this.adminService.rejectReview(userId, id, communityId, body.rejectReason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('reviews/:id/manual-visible-admin-only')
  async manualVisibleAdminOnly(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.manualVisibleAdminOnly(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Verification Review ===
  @Get('verifications')
  async getVerifications(
    @CurrentCommunityId() communityId: string,
    @Query() query: { status?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getVerifications(communityId, query, { skip, take }),
      this.adminService.countVerifications(communityId, query),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Get('verifications/:id')
  async getVerificationDetail(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const data = await this.adminService.getVerificationDetail(id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('verifications/:id/approve')
  async approveVerification(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.approveVerification(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('verifications/:id/reject')
  async rejectVerification(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { rejectReason?: string },
  ) {
    const data = await this.adminService.rejectVerification(
      userId,
      id,
      communityId,
      body.rejectReason,
    );
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Event Management ===
  @Get('events')
  async getEvents(
    @CurrentCommunityId() communityId: string,
    @Query() query: { status?: string; type?: string; keyword?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getEvents(communityId, query, { skip, take }),
      this.adminService.countEvents(communityId, query),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('events/:id/hide')
  async hideEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.hideEvent(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('events/:id/restore')
  async restoreEvent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.restoreEvent(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('events/:id/feedback-logs')
  async addFeedbackLog(
    @Param('id') eventId: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { status: string; content: string; images?: string[]; visibleToPublic: boolean },
  ) {
    const data = await this.adminService.addFeedbackLog(userId, eventId, communityId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Committee Management ===
  @Get('committee/members')
  async getCommitteeMembers(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getCommitteeMembers(communityId, { skip, take }),
      this.adminService.countCommitteeMembers(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('committee/members')
  async createCommitteeMember(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body()
    body: {
      name: string;
      position: string;
      avatarUrl?: string;
      responsibility?: string;
      termStart?: string;
      termEnd?: string;
    },
  ) {
    const data = await this.adminService.createCommitteeMember(userId, communityId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('committee/members/:id')
  async updateCommitteeMember(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      position: string;
      avatarUrl: string;
      responsibility: string;
      termStart: string;
      termEnd: string;
      status: 'active' | 'inactive';
    }>,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.updateCommitteeMember(userId, id, body, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Delete('committee/members/:id')
  async deleteCommitteeMember(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.deleteCommitteeMember(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Get('committee-claims')
  async getCommitteeClaims(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getCommitteeClaims(communityId, { skip, take }),
      this.adminService.countCommitteeClaims(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('committee-claims/:id/approve')
  async approveClaim(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.approveClaim(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('committee-claims/:id/reject')
  async rejectClaim(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { action: 'approve' | 'reject'; rejectReason?: string },
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.rejectClaim(userId, id, body.rejectReason, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Announcements ===
  @Get('committee/announcements')
  async getAnnouncements(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getAnnouncements(communityId, { skip, take }),
      this.adminService.countAnnouncements(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('committee/announcements')
  async createAnnouncement(
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') userId: string,
    @Body()
    body: {
      title: string;
      content: string;
      images?: string[];
      isPinned?: boolean;
      status?: 'draft' | 'published';
    },
  ) {
    const data = await this.adminService.createAnnouncement(communityId, userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('committee/announcements/:id')
  async updateAnnouncement(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      content: string;
      images: string[];
      isPinned: boolean;
      status: 'draft' | 'published' | 'hidden';
    }>,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.updateAnnouncement(userId, id, body, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Delete('committee/announcements/:id')
  async deleteAnnouncement(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    const data = await this.adminService.deleteAnnouncement(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Vote Management ===
  @Get('votes')
  async getVotes(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getVotes(communityId, { skip, take }),
      this.adminService.countVotes(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('votes')
  async createVote(
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') userId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      voteType?: string;
      maxChoices?: number;
      resultVisibility?: string;
      isAnonymous?: boolean;
      startAt?: string;
      endAt?: string;
      options: string[];
    },
  ) {
    const data = await this.adminService.createVote(communityId, userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('votes/:id')
  async updateVote(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
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
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.updateVote(userId, id, body, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('votes/:id/publish')
  async publishVote(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.publishVote(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('votes/:id/close')
  async closeVote(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.closeVote(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Get('votes/:id/results')
  async getVoteResults(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const data = await this.adminService.getVoteResults(id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data: { items: data } };
  }

  // === Banner Management ===
  @Get('banners')
  async getBanners(
    @CurrentCommunityId() communityId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getBanners(communityId, { skip, take }),
      this.adminService.countBanners(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('banners')
  @PlatformAdminOnly()
  async createBanner(
    @CurrentUser('userId') userId: string,
    @Body()
    body: {
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
    const data = await this.adminService.createBanner(userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('banners/:id')
  @PlatformAdminOnly()
  async updateBanner(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      subtitle: string;
      imageUrl: string;
      linkType: 'event' | 'market' | 'announcement' | 'service_provider' | 'url' | 'none';
      linkId: string;
      linkUrl: string;
      position: 'home_top' | 'event_list' | 'market_list';
      sortOrder: number;
      status: 'draft' | 'published' | 'offline';
      startAt: string;
      endAt: string;
    }>,
  ) {
    const data = await this.adminService.updateBanner(userId, id, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('banners/:id/publish')
  @PlatformAdminOnly()
  async publishBanner(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.adminService.publishBanner(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('banners/:id/offline')
  @PlatformAdminOnly()
  async offlineBanner(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.adminService.offlineBanner(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Delete('banners/:id')
  @PlatformAdminOnly()
  async deleteBanner(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.adminService.deleteBanner(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Service Provider Management ===
  @Get('service-providers')
  async getServiceProviders(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getServiceProviders(communityId, { skip, take }),
      this.adminService.countServiceProviders(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('service-providers')
  @PlatformAdminOnly()
  async createServiceProvider(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body()
    body: {
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
    const data = await this.adminService.createServiceProvider(userId, communityId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('service-providers/:id')
  @PlatformAdminOnly()
  async updateServiceProvider(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{ name: string; category: string; description: string; sortOrder: number }>,
  ) {
    const data = await this.adminService.updateServiceProvider(userId, id, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('service-providers/:id/publish')
  @PlatformAdminOnly()
  async publishServiceProvider(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.adminService.publishServiceProvider(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('service-providers/:id/offline')
  @PlatformAdminOnly()
  async offlineServiceProvider(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.adminService.offlineServiceProvider(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('service-providers/:id/reject')
  @PlatformAdminOnly()
  async rejectServiceProvider(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { reason: string },
  ) {
    const data = await this.adminService.rejectServiceProvider(userId, id, body.reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Rankings ===
  @Get('contributions')
  async getContributions(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getContributions(communityId, { skip, take }),
      this.adminService.countContributions(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Get('badges')
  async getBadges() {
    const data = await this.adminService.getBadges();
    return { code: ErrorCodes.SUCCESS, message: 'ok', data: { items: data } };
  }

  @Post('badges')
  async createBadge(
    @CurrentUser('userId') userId: string,
    @Body()
    body: {
      code: string;
      name: string;
      description: string;
      iconUrl: string;
      ruleJson?: any;
    },
  ) {
    const data = await this.adminService.createBadge(userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // P-332: 补全 badge PATCH（更新）
  @Patch('badges/:id')
  async updateBadge(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      iconUrl?: string;
      ruleJson?: any;
      status?: string;
    },
  ) {
    const data = await this.adminService.updateBadge(userId, id, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // P-332: 补全 badge DELETE（停用）
  @Delete('badges/:id')
  async deleteBadge(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    const data = await this.adminService.deleteBadge(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('users/:userId/badges')
  async awardBadge(
    @Param('userId') userId: string,
    @Body() body: { badgeId: string; reason: string; sourceType?: 'manual' },
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const data = await this.adminService.awardBadge(
      userId,
      body.badgeId,
      communityId,
      adminId,
      body.reason,
    );
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('rankings/recalculate')
  async recalculateRankings(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.recalculateRankings(userId, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Audit Logs ===
  @Get('audit-logs')
  async getAuditLogs(
    @Query() query: { operatorId?: string; targetType?: string; targetId?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getAuditLogs(query, { skip, take }),
      this.adminService.countAuditLogs(query),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  // === Share ===
  @Get('share-logs')
  async getShareLogs(
    @CurrentCommunityId() communityId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getShareLogs(communityId, { skip, take }),
      this.adminService.countShareLogs(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Get('share-templates')
  async getShareTemplates() {
    const data = await this.adminService.getShareTemplates();
    return { code: ErrorCodes.SUCCESS, message: 'ok', data: { items: data } };
  }

  // P-337: 补全 share template POST（创建）
  @Post('share-templates')
  async createShareTemplate(
    @CurrentUser('userId') userId: string,
    @Body() body: { targetType: string; titleTemplate: string; defaultImageUrl?: string },
  ) {
    const data = await this.adminService.createShareTemplate(userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('share-templates/:id')
  async updateShareTemplate(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShareTemplateDto,
  ) {
    const data = await this.adminService.updateShareTemplate(userId, id, dto);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // P-337: 补全 share template DELETE（停用）
  @Delete('share-templates/:id')
  async deleteShareTemplate(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    const data = await this.adminService.deleteShareTemplate(userId, id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Social Groups ===
  @Get('community-social-groups')
  async getSocialGroups(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getSocialGroups(communityId, { skip, take }),
      this.adminService.countSocialGroups(communityId),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('community-social-groups')
  async createSocialGroup(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      qrImageUrl?: string;
      contactText?: string;
      visibleTo?: string;
      sortOrder?: number;
    },
  ) {
    const data = await this.adminService.createSocialGroup(userId, communityId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('community-social-groups/:id')
  async updateSocialGroup(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Body()
    body: Partial<{
      title: string;
      description: string;
      qrImageUrl: string;
      contactText: string;
      visibleTo: string;
      sortOrder: number;
      status: string;
    }>,
  ) {
    const data = await this.adminService.updateSocialGroup(userId, id, communityId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Delete('community-social-groups/:id')
  async deleteSocialGroup(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.deleteSocialGroup(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Reports ===
  @Get('reports')
  async getReports(
    @CurrentCommunityId() communityId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getReports(communityId, status, { skip, take }),
      this.adminService.countReports(communityId, status),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('reports/:id/dismiss')
  async dismissReport(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.dismissReport(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('reports/:id/takedown')
  async takedownReport(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body?: { reason?: string },
  ) {
    const data = await this.adminService.takedownReport(userId, id, communityId, body?.reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('reports/:id/warn')
  async warnReport(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body?: { reason?: string },
  ) {
    const data = await this.adminService.warnReport(userId, id, communityId, body?.reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('reports/:id/ban')
  async banReport(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body?: { reason?: string },
  ) {
    const data = await this.adminService.banReport(userId, id, communityId, body?.reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Market Items ===
  @Get('market')
  async getMarketItems(
    @CurrentCommunityId() communityId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.adminService.getMarketItems(communityId, status, category, { skip, take }),
      this.adminService.countMarketItems(communityId, status, category),
    ]);
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Post('market/:id/hide')
  async hideMarketItem(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.hideMarketItem(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('market/:id/restore')
  async restoreMarketItem(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.restoreMarketItem(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('market/:id/reject')
  async rejectMarketItem(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.adminService.rejectMarketItem(userId, id, communityId, reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === System Settings ===
  @Get('settings')
  async getSettings() {
    const data = await this.adminService.getSettings();
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('settings')
  async updateSettings(@CurrentUser('userId') userId: string, @Body() dto: UpdateSettingsDto) {
    const data = await this.adminService.updateSettings(userId, dto);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === AI 功能开关 ===
  @Get('settings/ai')
  async getAiSettings() {
    const data = await this.adminService.getAiSettings();
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Patch('settings/ai')
  async updateAiSettings(
    @CurrentUser('userId') userId: string,
    @Body()
    body: Partial<{
      aiTopicSuggest: boolean;
      aiTopicMerge: boolean;
      aiEventComment: boolean;
      aiContentReview: boolean;
    }>,
  ) {
    const data = await this.adminService.updateAiSettings(userId, body);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === Topics 议事管理 ===
  // 注意：merge / merge-suggestions 必须在 :id 之前，避免被参数路由捕获
  @Get('topics/merge-suggestions')
  async listTopicMergeSuggestions(
    @CurrentCommunityId() communityId: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.listMergeSuggestions(communityId, status);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data: { items: data } };
  }

  @Post('topics/merge-suggestions/scan')
  async scanTopicMergeSuggestions(@CurrentCommunityId() communityId: string) {
    const created = await this.topicsService.scanMergeSuggestions(communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data: { created } };
  }

  @Post('topics/merge-suggestions/:id/approve')
  async approveTopicMergeSuggestion(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.approveMergeSuggestion(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/merge-suggestions/:id/reject')
  async rejectTopicMergeSuggestion(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.rejectMergeSuggestion(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/merge')
  async mergeTopics(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { sourceTopicId: string; targetTopicId: string },
  ) {
    const data = await this.adminService.mergeTopics(
      userId,
      body.sourceTopicId,
      body.targetTopicId,
      communityId,
    );
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Get('topics')
  async listAdminTopics(
    @CurrentCommunityId() communityId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.adminService.listTopics(
      communityId,
      status,
      { skip, take },
      search,
    );
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Get('topics/:id')
  async getAdminTopicById(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const data = await this.adminService.getTopicById(id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/:id/close')
  async closeAdminTopic(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { summary: string },
  ) {
    const data = await this.adminService.closeTopic(userId, id, communityId, body.summary);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/:id/reopen')
  async reopenAdminTopic(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.adminService.reopenTopic(userId, id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/:id/reject')
  async rejectAdminTopic(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.adminService.rejectTopic(userId, id, communityId, reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('topics/:id/events/:eventId/move')
  async moveTopicEvent(
    @CurrentUser('userId') userId: string,
    @Param('id') topicId: string,
    @Param('eventId') eventId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: { targetTopicId: string },
  ) {
    const data = await this.adminService.moveEvent(
      userId,
      topicId,
      eventId,
      body.targetTopicId,
      communityId,
    );
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  // === 小区申请审批 ===
  // platform_admin 可能未绑定具体小区，故所有端点跳过 CurrentCommunityGuard
  @Get('community-applications')
  @SkipCurrentCommunity()
  async listCommunityApplications(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.adminService.listCommunityApplications(
      { status },
      { skip, take },
    );
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: p, pageSize: ps, total },
    };
  }

  @Get('community-applications/:id')
  @SkipCurrentCommunity()
  async getCommunityApplication(@Param('id') id: string) {
    const data = await this.adminService.getCommunityApplicationDetail(id);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('community-applications/:id/approve')
  @SkipCurrentCommunity()
  async approveCommunityApplication(
    @Param('id') id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    const data = await this.adminService.approveCommunityApplication(id, adminUserId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }

  @Post('community-applications/:id/reject')
  @SkipCurrentCommunity()
  async rejectCommunityApplication(
    @Param('id') id: string,
    @CurrentUser('userId') adminUserId: string,
    @Body() body: { reason: string },
  ) {
    const data = await this.adminService.rejectCommunityApplication(id, adminUserId, body.reason);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }
}
