import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { VerifiedMemberGuard } from '../../common/guards/verified-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';
import { GroupBuysService } from './group-buys.service';
import { CreateGroupBuyDto } from './dto/create-group-buy.dto';
import { UpdateGroupBuyDto } from './dto/update-group-buy.dto';
import { RespondGroupBuyDto } from './dto/respond-group-buy.dto';

@Controller('group-buys')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class GroupBuysController {
  constructor(private service: GroupBuysService) {}

  @Post()
  @UseGuards(VerifiedMemberGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Body() dto: CreateGroupBuyDto,
  ) {
    const data = await this.service.create(userId, communityId, dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const data = await this.service.findAll({ type, status, skip, take }, communityId);
    return { code: 0, message: 'ok', data: { ...data, page: p, pageSize: ps } };
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.findOne(id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id')
  @UseGuards(VerifiedMemberGuard)
  async update(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupBuyDto,
  ) {
    const data = await this.service.update(userId, id, communityId, dto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/respond')
  @UseGuards(VerifiedMemberGuard)
  async respond(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() dto: RespondGroupBuyDto,
  ) {
    const data = await this.service.respond(userId, id, communityId, dto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/items/:itemId/confirm')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async confirmItem(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const data = await this.service.confirmItem(userId, id, itemId, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/items/:itemId/reject')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async rejectItem(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const data = await this.service.rejectItem(userId, id, itemId, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/close-bid')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async closeBid(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.closeBid(userId, id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/purchased')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async purchased(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.purchased(userId, id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/items/:itemId/deliver')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async deliver(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const data = await this.service.deliver(userId, id, itemId, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/cancel-response')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async cancelResponse(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.cancelResponse(userId, id, communityId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/close')
  @HttpCode(200)
  @UseGuards(VerifiedMemberGuard)
  async close(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.close(userId, id, communityId);
    return { code: 0, message: 'ok', data };
  }
}
