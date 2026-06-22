import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { CommitteeService } from './committee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { ClaimDto } from './dto/claim.dto';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller()
export class CommitteeController {
  constructor(@Inject(CommitteeService) private committeeService: CommitteeService) {}

  @Get('committee')
  @UseGuards(CurrentCommunityGuard)
  async getOverview(@CurrentCommunityId() communityId: string) {
    const data = await this.committeeService.getOverview(communityId);
    return { code: 0, message: 'ok', data };
  }

  @Get('committee/members')
  @UseGuards(CurrentCommunityGuard)
  async getMembers(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.committeeService.getMembers(communityId, { skip, take }),
      this.committeeService.countMembers(communityId),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get('committee/members/:id')
  @UseGuards(CurrentCommunityGuard)
  async getMemberDetail(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.committeeService.getMemberDetail(id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post('committee/members/:id/claim')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async claimMembership(
    @CurrentUser('userId') userId: string,
    @Param('id') memberId: string,
    @Body() dto: ClaimDto,
  ) {
    const data = await this.committeeService.claimMembership(userId, memberId, dto);
    return { code: 0, message: 'ok', data };
  }

  @Get('me/committee-claims')
  @UseGuards(JwtAuthGuard)
  async getMyClaims(@CurrentUser('userId') userId: string) {
    const items = await this.committeeService.getMyClaims(userId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get('committee/announcements')
  @UseGuards(CurrentCommunityGuard)
  async getAnnouncements(
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.committeeService.getAnnouncements(communityId, { skip, take }),
      this.committeeService.countAnnouncements(communityId),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get('committee/announcements/:id')
  @UseGuards(CurrentCommunityGuard)
  async getAnnouncementDetail(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.committeeService.getAnnouncementDetail(id, communityId);
    return { code: 0, message: 'ok', data };
  }
}
