import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async wechatLogin(code: string, phoneCode?: string) {
    // 首版 mock：用 code 作为 openid 标识
    const openid = `mock_openid_${code}`;
    let user = await this.prisma.user.findUnique({ where: { openid } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: `邻居${Date.now().toString().slice(-6)}`,
          avatarUrl: '',
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, openid: user.openid });
    return { token, user };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        status: true,
        currentCommunityId: true,
        currentCommunity: { select: { id: true, name: true } },
        communityMembers: {
          select: {
            communityId: true,
            role: true,
            verifyStatus: true,
          },
        },
      },
    });

    if (!user) return null;

    const currentCommunity = user.currentCommunity;
    const currentMember = user.currentCommunityId
      ? user.communityMembers.find((m) => m.communityId === user.currentCommunityId)
      : null;

    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status,
      currentCommunityId: user.currentCommunityId,
      currentCommunityName: currentCommunity?.name ?? null,
      verifyStatus: currentMember?.verifyStatus ?? 'unverified',
      roles: currentMember ? [currentMember.role as any] : [],
    };
  }

  async updateMe(userId: string, data: { nickname?: string; avatarUrl?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nickname: true, avatarUrl: true, bio: true },
    });
  }
}
