import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async list(communityId: string, pagination?: { skip: number; take: number }) {
    return this.prisma.vote.findMany({
      where: {
        communityId,
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        voteType: true,
        onlyVerified: true,
        isAnonymous: true,
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip,
      take: pagination?.take,
    });
  }

  async count(communityId: string) {
    return this.prisma.vote.count({
      where: {
        communityId,
        status: 'published',
        deletedAt: null,
      },
    });
  }

  async findOne(id: string, communityId: string) {
    const vote = await this.prisma.vote.findFirst({
      // P-254: 过滤 draft 状态，仅 published/closed 可访问
      where: { id, communityId, status: { not: 'draft' }, deletedAt: null },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, content: true, sortOrder: true },
        },
      },
    });

    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    return vote;
  }

  async submitVote(
    userId: string,
    voteId: string,
    communityId: string,
    selectedOptionIds: string[],
  ) {
    // P-257: 去重，避免重复 ID 绕过数量校验
    const uniqueOptionIds = [...new Set(selectedOptionIds)];

    // P-24: 校验投票属于当前用户的小区
    const vote = await this.prisma.vote.findFirst({
      where: { id: voteId, communityId, deletedAt: null },
    });

    if (!vote || vote.deletedAt) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.status !== 'published') {
      throw new BadRequestException('投票未发布');
    }

    const now = new Date();
    if (now < vote.startAt) {
      throw new BadRequestException('投票尚未开始');
    }
    if (now > vote.endAt) {
      throw new BadRequestException('投票已结束');
    }

    // 检查是否已投过票
    const existingRecord = await this.prisma.voteRecord.findUnique({
      where: { voteId_userId: { voteId, userId } },
    });
    if (existingRecord) {
      throw new ConflictException('您已投过票');
    }

    // 所有投票始终要求认证用户参与
    const member = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: vote.communityId } },
    });
    if (!member || member.verifyStatus !== 'verified') {
      throw new ForbiddenException('仅认证用户可参与投票');
    }

    // 检查选项数量限制
    if (vote.voteType === 'single' && uniqueOptionIds.length !== 1) {
      throw new BadRequestException('单选投票只能选择一个选项');
    }
    if (vote.maxChoices && uniqueOptionIds.length > vote.maxChoices) {
      throw new BadRequestException(`最多选择 ${vote.maxChoices} 个选项`);
    }

    // 验证选项属于该投票
    const validOptions = await this.prisma.voteOption.findMany({
      where: { voteId, id: { in: uniqueOptionIds } },
    });
    if (validOptions.length !== uniqueOptionIds.length) {
      throw new BadRequestException('包含无效的投票选项');
    }

    // P-255: 并发竞态兜底——P2002 抛 409 而非 500
    let record;
    try {
      record = await this.prisma.voteRecord.create({
        data: {
          voteId,
          userId,
          communityId: vote.communityId,
          selectedOptionIds: uniqueOptionIds as any,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('您已投过票');
      }
      throw e;
    }

    // P-284: 投票后发送 type='vote' 通知
    await this.prisma.notification.create({
      data: {
        userId,
        communityId: vote.communityId,
        type: 'vote',
        title: '投票成功',
        content: `您已成功参与「${vote.title}」投票`,
        targetType: 'vote',
        targetId: voteId,
      },
    });

    return { id: record.id, votedAt: record.votedAt };
  }

  async getResults(voteId: string, userId: string, communityId: string) {
    const vote = await this.prisma.vote.findFirst({
      // P-258: 过滤 draft 状态，仅 published/closed 可查看结果
      where: { id: voteId, communityId, status: { not: 'draft' }, deletedAt: null },
    });

    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    // 检查结果可见性
    if (vote.resultVisibility === 'admin_only') {
      const admin = await this.prisma.adminUser.findFirst({
        where: {
          userId,
          status: 'active',
          OR: [
            { role: 'platform_admin' },
            { role: 'committee_admin', communityId: vote.communityId },
          ],
        },
      });
      if (!admin) {
        throw new ForbiddenException('投票结果仅管理员可见');
      }
    }

    if (vote.resultVisibility === 'after_vote') {
      const userRecord = await this.prisma.voteRecord.findUnique({
        where: { voteId_userId: { voteId, userId } },
      });
      if (!userRecord) {
        throw new ForbiddenException('投票后才能查看结果');
      }
    }

    if (vote.resultVisibility === 'after_end' && new Date() <= vote.endAt) {
      throw new ForbiddenException('投票结束后才能查看结果');
    }

    // 获取选项及票数
    const options = await this.prisma.voteOption.findMany({
      where: { voteId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, content: true, sortOrder: true },
    });

    const records = await this.prisma.voteRecord.findMany({
      where: { voteId },
      select: { selectedOptionIds: true },
    });

    // 统计各选项票数
    const optionCounts: Record<string, number> = {};
    for (const option of options) {
      optionCounts[option.id] = 0;
    }
    for (const record of records) {
      const ids = record.selectedOptionIds as string[];
      for (const id of ids) {
        if (optionCounts[id] !== undefined) {
          optionCounts[id]++;
        }
      }
    }

    const totalVoters = records.length;

    const results = options.map((opt) => ({
      ...opt,
      count: optionCounts[opt.id],
      percentage:
        totalVoters > 0 ? Math.round((optionCounts[opt.id] / totalVoters) * 10000) / 100 : 0,
    }));

    return {
      id: vote.id,
      title: vote.title,
      totalVoters,
      options: results,
    };
  }
}
