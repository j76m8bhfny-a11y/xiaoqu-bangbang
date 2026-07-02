import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller('votes')
export class VotesController {
  constructor(@Inject(VotesService) private votesService: VotesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async list(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.votesService.list(communityId, { skip, take }),
      this.votesService.count(communityId),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async findOne(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const data = await this.votesService.findOne(id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/records')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async submitVote(
    @CurrentUser('userId') userId: string,
    @Param('id') voteId: string,
    @Body() body: { selectedOptionIds: string[] },
  ) {
    const data = await this.votesService.submitVote(userId, voteId, body.selectedOptionIds);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id/results')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getResults(
    @Param('id') voteId: string,
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.votesService.getResults(voteId, userId, communityId);
    return { code: 0, message: 'ok', data };
  }
}
