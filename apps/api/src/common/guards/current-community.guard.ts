import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../constants';
import { SKIP_CURRENT_COMMUNITY_KEY } from '../decorators/skip-current-community.decorator';

@Injectable()
export class CurrentCommunityGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    const skipCurrentCommunity = this.reflector.get(
      SKIP_CURRENT_COMMUNITY_KEY,
      context.getHandler(),
    );
    if (skipCurrentCommunity) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentCommunityId: true },
    });

    if (!user?.currentCommunityId) {
      throw new ForbiddenException({
        code: 40301,
        message: '请先选择小区',
      });
    }

    request.currentCommunityId = user.currentCommunityId;
    return true;
  }
}
