import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class FeedController {
  constructor(private service: FeedService) {}

  @Get('all')
  async findAll(
    @CurrentCommunityId() communityId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const data = await this.service.findAll(Number(page), Number(pageSize), communityId);
    return { code: 0, message: 'ok', data };
  }
}
