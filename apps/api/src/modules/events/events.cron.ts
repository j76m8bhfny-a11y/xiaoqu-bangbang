import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventStatus } from '@xiaoqu-bangbang/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsCron {
  private readonly logger = new Logger(EventsCron.name);

  constructor(private prisma: PrismaService) {}

  // 每天凌晨 3 点执行：关闭 30 天无新响应的互助事件
  @Cron('0 3 * * *')
  async autoCloseStaleEvents() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // PRD: 活动仅指新响应(EventApplication 创建)和状态变更，评论/点赞不重置计时器。
    // ponytail: event.updatedAt 会被评论/点赞/toggleLike 更新，不可靠。
    //           改用 applications.createdAt 判断最后响应时间。
    //           createdAt < 30天前 防止新建无响应事件被误关。
    //           edge case: processing 状态下选中帮手(更新 application status)不创建新 application，
    //           可能误关。升级路径: 加 lastActivityAt 字段精确追踪。
    const staleEvents = await this.prisma.event.findMany({
      where: {
        status: {
          in: [EventStatus.OPEN, EventStatus.IN_PROGRESS, EventStatus.PROCESSING],
        },
        deletedAt: null,
        createdAt: { lt: thirtyDaysAgo },
        applications: {
          none: {
            createdAt: { gt: thirtyDaysAgo },
          },
        },
      },
      select: { id: true },
    });

    if (staleEvents.length === 0) {
      this.logger.debug('无过期事件需要关闭');
      return;
    }

    await this.prisma.event.updateMany({
      where: { id: { in: staleEvents.map((e) => e.id) } },
      data: { status: EventStatus.CLOSED },
    });
    this.logger.log(`自动关闭 ${staleEvents.length} 个过期事件`);
  }
}
