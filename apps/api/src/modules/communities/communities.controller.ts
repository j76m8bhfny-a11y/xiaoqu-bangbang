import { Controller, Get, Post, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';

@Controller('communities')
export class CommunitiesController {
  constructor(@Inject(CommunitiesService) private communitiesService: CommunitiesService) {}

  @Get()
  async list(@Query() query: { city?: string; keyword?: string }) {
    const items = await this.communitiesService.list(query);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Post('select')
  @UseGuards(JwtAuthGuard)
  async select(
    @CurrentUser('userId') userId: string,
    @Body() body: { communityId: string },
  ) {
    const result = await this.communitiesService.select(userId, body.communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Get('current/social-groups')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getSocialGroups(
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    // 获取用户在当前小区的实际认证状态
    const member = await this.communitiesService.getMemberVerifyStatus(userId, communityId);
    const groups = await this.communitiesService.getSocialGroups(communityId, member?.verifyStatus ?? 'unverified');
    return { code: 0, message: 'ok', data: { items: groups } };
  }
}
