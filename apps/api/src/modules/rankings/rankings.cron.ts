import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RankingsService } from './rankings.service';

@Injectable()
export class RankingsCron {
  private readonly logger = new Logger(RankingsCron.name);

  constructor(
    private prisma: PrismaService,
    private rankingsService: RankingsService,
  ) {}

  // 每月 1 号 0 点：重算所有小区的月榜和总榜
  @Cron('0 0 1 * *')
  async recalculateMonthlyRankings() {
    // 只处理有 community_member 的小区
    const communities = await this.prisma.community.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    this.logger.log(`开始重算 ${communities.length} 个小区的排行榜...`);

    let success = 0;
    let failed = 0;
    for (const c of communities) {
      try {
        await this.rankingsService.recalculateRankings(c.id);
        success++;
      } catch (e) {
        this.logger.error(`小区 ${c.name}(${c.id}) 排行榜重算失败: ${e.message}`);
        failed++;
      }
    }

    this.logger.log(`排行榜重算完成: 成功 ${success}, 失败 ${failed}`);
  }
}
