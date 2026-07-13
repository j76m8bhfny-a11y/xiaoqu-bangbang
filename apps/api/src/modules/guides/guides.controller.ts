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
import { GuidesService } from './guides.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { VerifiedMemberGuard } from '../../common/guards/verified-member.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';
import type {
  CreateGuideRequest,
  UpdateGuideRequest,
  CreateGuideCommentRequest,
} from '@xiaoqu-bangbang/shared';

@Controller('guides')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class GuidesController {
  constructor(@Inject(GuidesService) private guidesService: GuidesService) {}

  @Get()
  async list(
    @CurrentCommunityId() communityId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('authorId') authorId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.guidesService.list(
      communityId,
      { category, status, keyword, authorId },
      { skip, take },
    );
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') viewerUserId?: string,
  ) {
    const guide = await this.guidesService.findById(id, communityId, viewerUserId);
    return { code: 0, message: 'ok', data: guide };
  }

  @Post()
  @UseGuards(VerifiedMemberGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() body: CreateGuideRequest,
  ) {
    const guide = await this.guidesService.create(userId, communityId, body);
    return { code: 0, message: 'ok', data: guide };
  }

  @Patch(':id')
  @UseGuards(VerifiedMemberGuard)
  async update(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: UpdateGuideRequest,
  ) {
    const guide = await this.guidesService.update(userId, id, communityId, body);
    return { code: 0, message: 'ok', data: guide };
  }

  @Delete(':id')
  @UseGuards(VerifiedMemberGuard)
  async remove(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const result = await this.guidesService.softDelete(userId, id, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/like')
  @UseGuards(VerifiedMemberGuard)
  async toggleLike(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const result = await this.guidesService.toggleLike(userId, id, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/favorite')
  @UseGuards(VerifiedMemberGuard)
  async toggleFavorite(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const result = await this.guidesService.toggleFavorite(userId, id, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const result = await this.guidesService.listComments(id, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/comments')
  @UseGuards(VerifiedMemberGuard)
  async createComment(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() body: CreateGuideCommentRequest,
  ) {
    const comment = await this.guidesService.createComment(userId, id, communityId, body);
    return { code: 0, message: 'ok', data: comment };
  }

  @Post('comments/:commentId/like')
  @UseGuards(VerifiedMemberGuard)
  async toggleCommentLike(
    @CurrentUser('userId') userId: string,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.guidesService.toggleCommentLike(userId, commentId);
    return { code: 0, message: 'ok', data: result };
  }
}
