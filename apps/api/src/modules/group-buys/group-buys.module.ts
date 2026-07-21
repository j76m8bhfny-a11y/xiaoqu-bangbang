import { Module } from '@nestjs/common';
import { GroupBuysController } from './group-buys.controller';
import { GroupBuysService } from './group-buys.service';
import { AiReviewModule } from '../ai-review/ai-review.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RankingsModule } from '../rankings/rankings.module';

@Module({
  imports: [AiReviewModule, NotificationsModule, RankingsModule],
  controllers: [GroupBuysController],
  providers: [GroupBuysService],
  exports: [GroupBuysService],
})
export class GroupBuysModule {}
