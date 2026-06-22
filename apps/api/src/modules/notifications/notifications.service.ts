import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(dto: {
    userId: string;
    communityId?: string;
    type: string;
    title: string;
    content: string;
    targetType?: string;
    targetId?: string;
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        communityId: dto.communityId ?? null,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType ?? null,
        targetId: dto.targetId ?? null,
      },
    });
  }

  async findAll(
    userId: string,
    query?: { isRead?: boolean },
    pagination?: { skip: number; take: number },
  ) {
    const where: any = { userId };
    if (query?.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
  }

  async count(userId: string, query?: { isRead?: boolean }) {
    const where: any = { userId };
    if (query?.isRead !== undefined) {
      where.isRead = query.isRead;
    }
    return this.prisma.notification.count({ where });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('通知不存在');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
