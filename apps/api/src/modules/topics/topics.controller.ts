import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { VerifiedMemberGuard } from '../../common/guards/verified-member.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';
import type { CreateTopicRequest } from '@xiaoqu-bangbang/shared';

@Controller('topics')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class TopicsController {
  constructor(@Inject(TopicsService) private topicsService: TopicsService) {}

  @Get()
  async list(
    @CurrentCommunityId() communityId: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.topicsService.list(
      communityId,
      { status, keyword },
      { skip, take },
    );
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post('comments/:commentId/like')
  @UseGuards(VerifiedMemberGuard)
  async likeComment(@CurrentUser('userId') userId: string, @Param('commentId') commentId: string) {
    const c = await this.topicsService.likeComment(commentId, userId, 'like');
    return { code: 0, message: 'ok', data: c };
  }

  @Post('comments/:commentId/dislike')
  @UseGuards(VerifiedMemberGuard)
  async dislikeComment(
    @CurrentUser('userId') userId: string,
    @Param('commentId') commentId: string,
  ) {
    const c = await this.topicsService.likeComment(commentId, userId, 'dislike');
    return { code: 0, message: 'ok', data: c };
  }

  @Delete('comments/:commentId/like')
  @UseGuards(VerifiedMemberGuard)
  async unlikeComment(
    @CurrentUser('userId') userId: string,
    @Param('commentId') commentId: string,
  ) {
    const c = await this.topicsService.unlikeComment(commentId, userId);
    return { code: 0, message: 'ok', data: c };
  }

  @Post()
  @UseGuards(VerifiedMemberGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: CreateTopicRequest,
  ) {
    const topic = await this.topicsService.create(userId, communityId, body);
    return { code: 0, message: 'ok', data: topic };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') viewerUserId?: string,
  ) {
    const topic = await this.topicsService.findById(id, communityId, viewerUserId);
    return { code: 0, message: 'ok', data: topic };
  }

  @Post(':id/like')
  @UseGuards(VerifiedMemberGuard)
  async like(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: { scope?: 'open' | 'closed' },
  ) {
    const scope = body?.scope ?? 'open';
    const topic = await this.topicsService.like(id, userId, communityId, 'like', scope);
    return { code: 0, message: 'ok', data: topic };
  }

  @Post(':id/dislike')
  @UseGuards(VerifiedMemberGuard)
  async dislike(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: { scope?: 'open' | 'closed' },
  ) {
    const scope = body?.scope ?? 'open';
    const topic = await this.topicsService.like(id, userId, communityId, 'dislike', scope);
    return { code: 0, message: 'ok', data: topic };
  }

  @Delete(':id/like')
  @UseGuards(VerifiedMemberGuard)
  async unlike(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Query('scope') scope?: 'open' | 'closed',
  ) {
    const topic = await this.topicsService.unlike(id, userId, communityId, scope ?? 'open');
    return { code: 0, message: 'ok', data: topic };
  }

  @Post(':id/rating')
  @UseGuards(VerifiedMemberGuard)
  async rate(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    const topic = await this.topicsService.rate(id, userId, communityId, body.rating);
    return { code: 0, message: 'ok', data: topic };
  }

  @Get(':id/timeline')
  async timeline(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    // P-120: 补全 total 字段以支持分页契约
    const { items, total } = await this.topicsService.getTimeline(id, communityId, { skip, take });
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get(':id/comments')
  async listComments(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Query('eventId') eventId?: string,
    @Query('sort') sort?: 'hot' | 'new',
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.topicsService.listComments(id, communityId, {
      eventId,
      sort,
      skip,
      take,
    });
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post(':id/comments')
  @UseGuards(VerifiedMemberGuard)
  async createComment(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: { eventId?: string; content: string; images?: string[]; parentId?: string },
  ) {
    const c = await this.topicsService.createComment(id, userId, communityId, body);
    return { code: 0, message: 'ok', data: c };
  }
}
