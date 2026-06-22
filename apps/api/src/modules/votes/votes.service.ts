import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
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
      where: { id, communityId, deletedAt: null },
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

  async submitVote(userId: string, voteId: string, selectedOptionIds: string[]) {
    const vote = await this.prisma.vote.findUnique({
      where: { id: voteId },
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
      throw new BadRequestException('您已投过票');
    }

    // 检查仅认证用户限制
    if (vote.onlyVerified) {
      const member = await this.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId: vote.communityId } },
      });
      if (!member || member.verifyStatus !== 'verified') {
        throw new ForbiddenException('仅认证用户可参与投票');
      }
    }

    // 检查选项数量限制
    if (vote.voteType === 'single' && selectedOptionIds.length !== 1) {
      throw new BadRequestException('单选投票只能选择一个选项');
    }
    if (vote.maxChoices && selectedOptionIds.length > vote.maxChoices) {
      throw new BadRequestException(`最多选择 ${vote.maxChoices} 个选项`);
    }

    // 验证选项属于该投票
    const validOptions = await this.prisma.voteOption.findMany({
      where: { voteId, id: { in: selectedOptionIds } },
    });
    if (validOptions.length !== selectedOptionIds.length) {
      throw new BadRequestException('包含无效的投票选项');
    }

    const record = await this.prisma.voteRecord.create({
      data: {
        voteId,
        userId,
        communityId: vote.communityId,
        selectedOptionIds: selectedOptionIds as any,
      },
    });

    return { id: record.id, votedAt: record.votedAt };
  }

  async getResults(voteId: string, userId: string, communityId: string) {
    const vote = await this.prisma.vote.findFirst({
      where: { id: voteId, communityId, deletedAt: null },
    });

    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    // 检查结果可见性
    if (vote.resultVisibility === 'admin_only') {
      throw new ForbiddenException('投票结果仅管理员可见');
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
      percentage: totalVoters > 0 ? Math.round((optionCounts[opt.id] / totalVoters) * 10000) / 100 : 0,
    }));

    return {
      id: vote.id,
      title: vote.title,
      totalVoters,
      options: results,
    };
  }
}
