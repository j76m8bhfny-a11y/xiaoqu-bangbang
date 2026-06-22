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
  @UseGuards(CurrentCommunityGuard)
  async list(
    @CurrentCommunityId() communityId: string,
    @Query() query: { periodType?: string; periodKey?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.rankingsService.list(communityId, query, { skip, take }),
      this.rankingsService.count(communityId, query),
    ]);
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
    const items = await this.rankingsService.getBadges();
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get('me/badges')
  @UseGuards(JwtAuthGuard)
  async getMyBadges(
    @CurrentUser('userId') userId: string,
    @Query('communityId') communityId?: string,
  ) {
    const data = await this.rankingsService.getMyBadges(userId, communityId);
    return { code: 0, message: 'ok', data };
  }
}
