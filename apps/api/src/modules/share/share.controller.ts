import { Controller, Get, Post, Query, Body, UseGuards, Inject } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';

@Controller('share')
export class ShareController {
  constructor(@Inject(ShareService) private shareService: ShareService) {}

  @Get('card-config')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getCardConfig(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.shareService.getCardConfig(targetType, targetId, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post('logs')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async logShare(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: { targetType: string; targetId: string; channel: string; shareToken?: string; scene?: string },
  ) {
    const data = await this.shareService.logShare(userId, { ...dto, communityId });
    return { code: 0, message: 'ok', data };
  }
}
