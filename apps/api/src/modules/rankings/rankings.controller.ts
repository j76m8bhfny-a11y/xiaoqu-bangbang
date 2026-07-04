import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { Public } from '../../common/constants';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller()
export class RankingsController {
  constructor(@Inject(RankingsService) private rankingsService: RankingsService) {}

  @Get('rankings')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async list(
    @CurrentCommunityId() communityId: string,
    @Query() query: { periodType?: string; periodKey?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [rawItems, total] = await Promise.all([
      this.rankingsService.list(communityId, query, { skip, take }),
      this.rankingsService.count(communityId, query),
    ]);
    // P-143: flatten user object to top-level nickname/avatarUrl
    const items = rawItems.map(({ user, ...rest }) => ({
      ...rest,
      nickname: user?.nickname ?? '',
      avatarUrl: user?.avatarUrl ?? null,
    }));
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get('rankings/me')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getMyRanking(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Query() query: { periodType?: string; periodKey?: string },
  ) {
    const data = await this.rankingsService.getMyRanking(
      userId,
      communityId,
      query.periodType,
      query.periodKey,
    );
    return { code: 0, message: 'ok', data };
  }

  @Get('badges')
  @Public()
  async getBadges() {
    const rawItems = await this.rankingsService.getBadges();
    // P-146: map iconUrl → icon to match miniapp BadgeDto
    const items = rawItems.map(({ iconUrl, ...rest }) => ({
      ...rest,
      icon: iconUrl ?? '',
    }));
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get('me/badges')
  @UseGuards(JwtAuthGuard)
  async getMyBadges(
    @CurrentUser('userId') userId: string,
    @Query('communityId') communityId?: string,
  ) {
    const { badges, contributions } = await this.rankingsService.getMyBadges(userId, communityId);
    // P-145: flatten to BadgeDto { id: badge.id, name, icon, description }
    // id must be badge.id (not userBadge.id) so miniapp can match against getBadges list
    const items = badges.map((ub: any) => ({
      id: ub.badge.id,
      name: ub.badge.name,
      icon: ub.badge.iconUrl ?? '',
      description: ub.badge.description,
    }));
    return { code: 0, message: 'ok', data: { items, contributions } };
  }
}
