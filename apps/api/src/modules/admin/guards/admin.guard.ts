import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../../common/constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException({ code: 40301, message: '未登录' });
    }

    const admin = await this.prisma.adminUser.findFirst({
      where: { userId, status: 'active' },
    });

    if (!admin) {
      throw new ForbiddenException({ code: 40302, message: '无管理员权限' });
    }

    // committee_admin can only manage their own community
    if (admin.role === 'committee_admin') {
      const currentCommunityId = request.currentCommunityId;
      if (!currentCommunityId || admin.communityId !== currentCommunityId) {
        throw new ForbiddenException({ code: 40303, message: '无权管理该小区' });
      }
    }

    request.adminUser = admin;
    return true;
  }
}
