import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RankingsService } from './rankings.service';
import { RankingsCron } from './rankings.cron';
import { RankingsController } from './rankings.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankingsCron],
  exports: [RankingsService],
})
export class RankingsModule {}
