import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShareService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getCardConfig(targetType: string, targetId: string, communityId: string) {
    const template = await this.prisma.shareTemplate.findUnique({
      where: { targetType },
    });

    if (!template || template.status !== 'active') {
      throw new NotFoundException('分享模板不存在');
    }

    // Build share title from template
    let shareTitle = template.titleTemplate;
    let canShare = true;
    let disabledReason: string | undefined;
    let isAnonymous = false;

    // Check content status and visibility
    if (targetType === 'event' && targetId) {
      const event = await this.prisma.event.findUnique({
        where: { id: targetId },
        select: { title: true, status: true, visibility: true, isAnonymous: true, creatorId: true },
      });
      if (event) {
        if (event.status === 'pending_review' || event.status === 'rejected') {
          canShare = false;
          disabledReason = event.status === 'pending_review' ? '内容正在审核中，暂不可分享' : '内容未通过审核，不可分享';
        }
        if (event.visibility === 'admin_only') {
          canShare = false;
          disabledReason = '内容仅管理员可见，不可分享';
        }
        shareTitle = shareTitle.replace('{title}', event.title);
        isAnonymous = event.isAnonymous;
      }
    } else if (targetType === 'market' && targetId) {
      const item = await this.prisma.marketItem.findUnique({
        where: { id: targetId },
        select: { title: true, status: true, sellerId: true },
      });
      if (item) {
        if (item.status === 'pending_review' || item.status === 'rejected') {
          canShare = false;
          disabledReason = item.status === 'pending_review' ? '商品正在审核中，暂不可分享' : '商品未通过审核，不可分享';
        }
        shareTitle = shareTitle.replace('{title}', item.title);
      }
    } else if (targetType === 'service_provider' && targetId) {
      const provider = await this.prisma.serviceProvider.findUnique({
        where: { id: targetId },
        select: { name: true, status: true },
      });
      if (provider) {
        if (provider.status === 'pending_review' || provider.status === 'rejected') {
          canShare = false;
          disabledReason = '服务商信息未通过审核，不可分享';
        }
        shareTitle = shareTitle.replace('{name}', provider.name);
      }
    }

    // For anonymous content, strip creator identity from share title
    if (isAnonymous) {
      shareTitle = shareTitle.replace(/[\s]*by\s*\{creator\}/gi, '');
      shareTitle = shareTitle.replace(/\{creator\}/g, '匿名用户');
    }

    // Generate share path
    const sharePath = `/pages/share/index?type=${targetType}&id=${targetId}&communityId=${communityId}`;

    // Generate shareToken
    const shareToken = crypto.randomUUID();

    return {
      targetType,
      targetId,
      shareTitle,
      imageUrl: template.defaultImageUrl,
      sharePath,
      canShare,
      disabledReason,
      shareToken,
    };
  }

  async logShare(userId: string, dto: {
    targetType: string;
    targetId: string;
    channel: string;
    shareToken?: string;
    scene?: string;
    communityId?: string;
  }) {
    if (dto.communityId) {
      try {
        const card = await this.getCardConfig(dto.targetType, dto.targetId, dto.communityId);
        if (!card.canShare) {
          throw new ForbiddenException(card.disabledReason || '当前内容不可分享');
        }
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        // If template missing or content not found, allow logging but skip strict check
      }
    }

    const shareLog = await this.prisma.shareLog.create({
      data: {
        userId,
        communityId: dto.communityId ?? null,
        targetType: dto.targetType,
        targetId: dto.targetId,
        channel: dto.channel,
        shareToken: dto.shareToken,
        scene: dto.scene,
      },
    });

    return {
      id: shareLog.id,
      createdAt: shareLog.createdAt,
    };
  }
}
