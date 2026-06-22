import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { MarketService } from './market.service';
import { CreateMarketItemDto } from './dto/create-market-item.dto';
import { AddMarketCommentDto } from './dto/add-comment.dto';
import { AddMarketReviewDto } from './dto/add-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller('market')
export class MarketController {
  constructor(@Inject(MarketService) private marketService: MarketService) {}

  @Get('items')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async list(
    @CurrentCommunityId() communityId: string,
    @Query() query: { category?: string; status?: string; keyword?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.marketService.list(communityId, query, { skip, take }),
      this.marketService.count(communityId, query),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: CreateMarketItemDto,
  ) {
    const item = await this.marketService.create(userId, communityId, dto);
    return { code: 0, message: 'ok', data: item };
  }

  @Get('items/:id')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const item = await this.marketService.findOne(id, communityId);
    return { code: 0, message: 'ok', data: item };
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: Partial<CreateMarketItemDto>,
  ) {
    const item = await this.marketService.update(userId, id, communityId, dto);
    return { code: 0, message: 'ok', data: item };
  }

  @Post('items/:id/sold')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async markSold(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const item = await this.marketService.markSold(userId, id, communityId);
    return { code: 0, message: 'ok', data: item };
  }

  @Get('items/:id/comments')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getComments(
    @Param('id') itemId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const comments = await this.marketService.getComments(itemId, communityId);
    return { code: 0, message: 'ok', data: { items: comments } };
  }

  @Post('items/:id/comments')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async addComment(
    @CurrentUser('userId') userId: string,
    @Param('id') itemId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: AddMarketCommentDto,
  ) {
    const comment = await this.marketService.addComment(
      userId,
      itemId,
      dto.content,
      dto.parentId,
      communityId,
    );
    return { code: 0, message: 'ok', data: comment };
  }

  @Get('items/:id/reviews')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getReviews(
    @Param('id') itemId: string,
  ) {
    const reviews = await this.marketService.getReviews(itemId);
    return { code: 0, message: 'ok', data: { items: reviews } };
  }

  @Post('items/:id/reviews')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async addReview(
    @CurrentUser('userId') userId: string,
    @Param('id') itemId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: AddMarketReviewDto,
  ) {
    const review = await this.marketService.addReview(userId, itemId, communityId, dto);
    return { code: 0, message: 'ok', data: review };
  }
}
