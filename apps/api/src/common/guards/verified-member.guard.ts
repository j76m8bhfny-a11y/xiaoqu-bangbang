import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 权限矩阵：所有互动行为（点赞/评论/评分/投票/助力等）必须是当前小区的 verified 成员。
 * 依赖 CurrentCommunityGuard 已先于本 Guard 执行（即 request.currentCommunityId 已注入）。
 *
 * 在 controller 上加 @UseGuards(JwtAuthGuard, CurrentCommunityGuard, VerifiedMemberGuard) 即可。
 */
@Injectable()
export class VerifiedMemberGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    const communityId: string | undefined = request.currentCommunityId;

    // M22: pet_help 类型由 Service 层做 subType 级别的认证校验（PRD §4.21：lost 不需认证，feed/walk 需要）
    // 这里对所有 pet_help 放行，让 Service 返回精确的 40301 (NEED_VERIFICATION) 错误码
    if (request.body?.type === 'pet_help') {
      return true;
    }

    if (!userId || !communityId) {
      throw new ForbiddenException({ code: 40303, message: '请先登录并选择小区' });
    }

    const member = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { verifyStatus: true, deletedAt: true },
    });

    if (!member || member.deletedAt || member.verifyStatus !== 'verified') {
      throw new ForbiddenException({
        code: 40302,
        message: '需要完成业主认证后才能进行此操作',
      });
    }

    return true;
  }
}
