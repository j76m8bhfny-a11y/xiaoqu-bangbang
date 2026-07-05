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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { RespondEventDto } from './dto/respond-event.dto';
import { RateEventDto } from './dto/rate-event.dto';
import { AddEventCommentDto } from './dto/add-comment.dto';
import { ReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { VerifiedMemberGuard } from '../../common/guards/verified-member.guard';
import type { SelectParticipantRequest } from '@xiaoqu-bangbang/shared';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getPaginationParams, paginate } from '../../common/helpers/pagination';

@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private eventsService: EventsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async list(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('excludeTypes') excludeTypesRaw?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const excludeTypes = excludeTypesRaw ? excludeTypesRaw.split(',').filter(Boolean) : undefined;
    const [items, total] = await Promise.all([
      this.eventsService.list(
        communityId,
        { type, status, keyword, excludeTypes },
        { skip, take },
        userId,
      ),
      this.eventsService.count(communityId, { type, status, keyword, excludeTypes }),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post()
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: CreateEventDto,
  ) {
    const event = await this.eventsService.create(userId, communityId, dto);
    return { code: 0, message: 'ok', data: event };
  }

  @Get('topic-suggestions')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async topicSuggestions(
    @CurrentCommunityId() communityId: string,
    @Query('title') title?: string,
    @Query('description') description?: string,
  ) {
    const items = await this.eventsService.suggestTopics(
      communityId,
      title ?? '',
      description ?? '',
    );
    return { code: 0, message: 'ok', data: { items } };
  }

  // Batch 7: 根据事件标题/描述匹配同小区认证业主的技能
  @Get(':id/matched-skills')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getMatchedSkills(@Param('id') eventId: string, @CurrentCommunityId() communityId: string) {
    const items = await this.eventsService.getMatchedSkills(eventId, communityId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const event = await this.eventsService.findOne(id, communityId, userId);
    return { code: 0, message: 'ok', data: event };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: CreateEventDto,
  ) {
    const event = await this.eventsService.update(userId, id, communityId, dto);
    return { code: 0, message: 'ok', data: event };
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async close(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const event = await this.eventsService.close(userId, id, communityId);
    return { code: 0, message: 'ok', data: event };
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getApplications(@Param('id') eventId: string, @CurrentCommunityId() communityId: string) {
    const items = await this.eventsService.getApplications(eventId, communityId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Post(':id/applications')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async respond(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @Body() dto: RespondEventDto,
    @CurrentCommunityId() communityId: string,
  ) {
    const application = await this.eventsService.respond(userId, eventId, dto, communityId);
    return { code: 0, message: 'ok', data: application };
  }

  @Post(':id/applications/:applicationId/select')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async selectHelper(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @Param('applicationId') applicationId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const event = await this.eventsService.selectHelper(
      userId,
      eventId,
      applicationId,
      communityId,
    );
    return { code: 0, message: 'ok', data: event };
  }

  @Post(':id/complete/request')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async requestCompletion(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.requestCompletion(userId, eventId, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/complete/confirm')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async confirmCompletion(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.confirmCompletion(userId, eventId, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  // Batch 6: 多帮手选择（public_welfare/lost_found）
  @Post(':id/participants')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async selectParticipant(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: SelectParticipantRequest,
  ) {
    const participant = await this.eventsService.selectParticipant(
      userId,
      eventId,
      dto.applicationId,
      communityId,
    );
    return { code: 0, message: 'ok', data: participant };
  }

  // Batch 6: 逐个确认参与者完成
  @Post(':id/participants/:participantId/confirm')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async confirmParticipant(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.confirmParticipant(
      userId,
      eventId,
      participantId,
      communityId,
    );
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async rateHelper(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @Body() dto: RateEventDto,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.rateHelper(userId, eventId, dto, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Get(':id/feedback-logs')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getFeedbackLogs(@Param('id') eventId: string, @CurrentCommunityId() communityId: string) {
    const items = await this.eventsService.getFeedbackLogs(eventId, communityId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async addComment(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @Body() dto: AddEventCommentDto,
    @CurrentCommunityId() communityId: string,
  ) {
    const comment = await this.eventsService.addComment(
      userId,
      eventId,
      dto.content,
      communityId,
      dto.parentId,
    );
    return { code: 0, message: 'ok', data: comment };
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async getComments(
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    // P-230: 补全分页契约 page/pageSize/total
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const { items, total } = await this.eventsService.getComments(eventId, communityId, {
      skip,
      take,
    });
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async toggleLike(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.toggleLike(userId, eventId, communityId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/thanks')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard)
  async sendThanks(
    @CurrentUser('userId') fromUserId: string,
    @Param('id') eventId: string,
    @Body() body: { toUserId?: string },
    @CurrentCommunityId() communityId: string,
  ) {
    const thank = await this.eventsService.sendThanks(
      fromUserId,
      eventId,
      body.toUserId,
      communityId,
    );
    return { code: 0, message: 'ok', data: thank };
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async toggleFavorite(
    @CurrentUser('userId') userId: string,
    @Param('id') eventId: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const result = await this.eventsService.toggleFavorite(userId, eventId, communityId);
    return { code: 0, message: 'ok', data: result };
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(@Inject(EventsService) private eventsService: EventsService) {}

  @Post('reports')
  async report(@CurrentUser('userId') reporterId: string, @Body() dto: ReportDto) {
    const report = await this.eventsService.report(reporterId, dto);
    return { code: 0, message: 'ok', data: report };
  }
}
