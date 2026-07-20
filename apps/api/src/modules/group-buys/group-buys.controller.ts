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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { GroupBuysService } from './group-buys.service';
import { CreateGroupBuyDto } from './dto/create-group-buy.dto';
import { RespondGroupBuyDto } from './dto/respond-group-buy.dto';

@Controller('group-buys')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class GroupBuysController {
  constructor(private service: GroupBuysService) {}

  @Post()
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
    @Query() query: any,
  ) {
    const data = await this.service.findAll(query, communityId);
    return { code: 0, message: 'ok', data };
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
  async update(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const data = await this.service.update(userId, id, communityId, dto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/respond')
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
  async close(
    @CurrentUser('userId') userId: string,
    @CurrentCommunityId() communityId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.close(userId, id, communityId);
    return { code: 0, message: 'ok', data };
  }
}
