import { Controller, Get, Post, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: { isRead?: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const parsedQuery = query.isRead !== undefined
      ? { isRead: query.isRead === 'true' }
      : undefined;
    const { page: p, pageSize: ps, skip, take } = getPaginationParams(page, pageSize);
    const [items, total] = await Promise.all([
      this.notificationsService.findAll(userId, parsedQuery, { skip, take }),
      this.notificationsService.count(userId, parsedQuery),
    ]);
    return { code: 0, message: 'ok', data: { items, page: p, pageSize: ps, total } };
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id') notificationId: string,
  ) {
    const notification = await this.notificationsService.markRead(userId, notificationId);
    return { code: 0, message: 'ok', data: notification };
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard, CurrentCommunityGuard)
  async markAllRead(@CurrentUser('userId') userId: string) {
    const result = await this.notificationsService.markAllRead(userId);
    return { code: 0, message: 'ok', data: result };
  }
}
